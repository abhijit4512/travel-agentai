"""
Fuel prices with a provider architecture.

Order of trust:  user-entered  >  live provider (if configured)  >  manual table (admin / reference)  >  unavailable.
A price is labelled "live" ONLY when a configured provider just returned it. Manual reference values are always labelled as such.
No fuel-price provider is bundled, because no free official API is guaranteed. To add one, set FUEL_PRICE_API_URL (and
FUEL_PRICE_API_KEY) and adapt `parse_provider_response` to your provider's JSON.
"""
from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

from ..database.db import connect
from .travel_data import FUEL_PRICES, REFERENCE_DATE

log = logging.getLogger(__name__)
FUELS = ("petrol", "diesel", "cng", "electric")
UNITS = {"petrol": "litre", "diesel": "litre", "cng": "kg", "electric": "kWh"}
_cache: dict[tuple[str, str], tuple[float, dict[str, Any]]] = {}
CACHE_SECONDS = 6 * 3600


def seed_fuel_and_vehicles() -> None:
    """Insert reference data once. Rows you or an admin edit later are never overwritten."""
    import json
    from .travel_data import VEHICLES
    with connect() as c:
        for v in VEHICLES:
            c.execute("""INSERT OR IGNORE INTO vehicles (id, category, name, model, fuel_type, mileage, kwh_per_100km, seats, transmission, rent_per_day_inr, features, note)
                         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", (v["id"], v["category"], v["name"], v["model"], v["fuel_type"], v["mileage"], v["kwh_per_100km"],
                                                            v["seats"], v["transmission"], v["rent_per_day_inr"], json.dumps(v["features"]), v["note"]))
        for city, fuel, price in FUEL_PRICES:
            c.execute("INSERT OR IGNORE INTO fuel_prices (city, fuel, price_inr, updated_at, source) VALUES (?,?,?,?, 'manual_reference')", (city, fuel, price, REFERENCE_DATE))


def parse_provider_response(data: dict[str, Any]) -> tuple[float, str] | None:
    """ADAPT THIS to your provider. Expected here: {"price": 105.2, "updated_at": "2026-10-30T06:00:00+00:00"}."""
    try:
        return float(data["price"]), str(data.get("updated_at") or datetime.now(timezone.utc).isoformat())
    except (KeyError, TypeError, ValueError):
        return None


def _provider_price(city: str, fuel: str) -> dict[str, Any] | None:
    url = os.getenv("FUEL_PRICE_API_URL", "").strip()
    if not url:
        return None
    hit = _cache.get((city, fuel))
    if hit and time.time() - hit[0] < CACHE_SECONDS:
        return {**hit[1], "status": "cached"}
    try:
        import httpx
        headers = {"Authorization": f"Bearer {os.getenv('FUEL_PRICE_API_KEY')}"} if os.getenv("FUEL_PRICE_API_KEY") else {}
        for attempt in range(2):                                         # one retry
            try:
                r = httpx.get(url, params={"city": city, "fuel": fuel}, headers=headers, timeout=6.0)
                r.raise_for_status(); break
            except httpx.HTTPError:
                if attempt == 1:
                    raise
        parsed = parse_provider_response(r.json())
    except Exception as exc:                                              # noqa: BLE001 - logged, then we fall back visibly
        log.warning("Fuel provider failed: %s", type(exc).__name__)
        return None
    if parsed is None:
        return None
    res = {"price_inr": parsed[0], "updated_at": parsed[1], "source": "provider", "status": "live"}
    _cache[(city, fuel)] = (time.time(), res)
    return res


def get_price(city: str, fuel: str, override: float | None = None) -> dict[str, Any]:
    city_key, fuel = city.strip().lower(), fuel.strip().lower()
    if fuel not in FUELS:
        raise ValueError(f"fuel must be one of {FUELS}.")
    base = {"city": city_key, "fuel": fuel, "unit": UNITS[fuel]}
    if override is not None:
        return {**base, "price_inr": override, "status": "user_entered", "source": "you", "updated_at": None, "note": "Price entered by you."}
    live = _provider_price(city_key, fuel)
    if live:
        return {**base, **live, "note": "From the configured fuel price provider." if live["status"] == "live" else "Cached provider price."}
    with connect() as c:
        row = c.execute("SELECT * FROM fuel_prices WHERE city=? AND fuel=?", (city_key, fuel)).fetchone()
        used_city = city_key
        if row is None:
            row = c.execute("SELECT * FROM fuel_prices WHERE city='default' AND fuel=?", (fuel,)).fetchone()
            used_city = "default"
    if row is None:
        return {**base, "price_inr": None, "status": "unavailable", "source": None, "updated_at": None, "note": "No price is available. Enter one yourself."}
    ref = row["source"] == "manual_reference"
    note = ("NOT LIVE. Approximate reference value entered by hand" if ref else "Manual price set by an administrator") + \
           (f" (no data for {city}, using the national default)." if used_city == "default" and city_key != "default" else ".") + " Check today's price and edit it if needed."
    return {**base, "price_inr": row["price_inr"], "status": "manual_reference" if ref else "manual", "source": row["source"], "updated_at": row["updated_at"], "note": note}


def list_prices(city: str = "") -> list[dict[str, Any]]:
    with connect() as c:
        rows = c.execute("SELECT * FROM fuel_prices WHERE (? = '' OR city = ?) ORDER BY city, fuel", (city.strip().lower(), city.strip().lower())).fetchall()
    return [dict(r) | {"unit": UNITS.get(r["fuel"], ""), "status": "manual_reference" if r["source"] == "manual_reference" else "manual"} for r in rows]


def set_price(city: str, fuel: str, price: float, source: str = "manual_admin") -> None:
    if fuel not in FUELS or not (0 < price < 1000):
        raise ValueError("Invalid fuel or price.")
    with connect() as c:
        c.execute("INSERT OR REPLACE INTO fuel_prices (city, fuel, price_inr, updated_at, source) VALUES (?,?,?,?,?)",
                  (city.strip().lower(), fuel, price, datetime.now(timezone.utc).isoformat(), source))
