"""
Nearby hotels, restaurants, petrol pumps and EV chargers from OpenStreetMap (Overpass API). Free, no key, REAL community data.

Limits to be honest about: OpenStreetMap has no prices, ratings, photos or live room availability, and tags are incomplete,
so facilities show only when someone tagged them. Results are cached for 24 hours to respect the public Overpass servers.
Data (c) OpenStreetMap contributors, ODbL. Attribution must be shown wherever results appear.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from ..database.db import connect
from .catalog import haversine_km

log = logging.getLogger(__name__)
OVERPASS = "https://overpass-api.de/api/interpreter"
HEADERS = {"User-Agent": "YatraAI/1.0 (student travel project; contact: your-email@example.com)"}
TTL = timedelta(hours=24)
ATTRIBUTION = "(c) OpenStreetMap contributors (ODbL)"
KINDS = {
    "hotel": '["tourism"~"^(hotel|guest_house|hostel|resort|apartment|motel|chalet)$"]',
    "restaurant": '["amenity"~"^(restaurant|cafe)$"]',
    "fuel": '["amenity"="fuel"]',
    "ev_charging": '["amenity"="charging_station"]',
}


def _query(kind: str, lat: float, lng: float, radius_m: int, limit: int) -> str:
    sel = KINDS[kind]
    return f"[out:json][timeout:20];(node{sel}(around:{radius_m},{lat},{lng});way{sel}(around:{radius_m},{lat},{lng}););out center tags {limit * 3};"


def _cache_get(key: str) -> list[dict[str, Any]] | None:
    with connect() as c:
        r = c.execute("SELECT payload_json, fetched_at FROM osm_cache WHERE key=?", (key,)).fetchone()
    if r and datetime.now(timezone.utc) - datetime.fromisoformat(r["fetched_at"]) < TTL:
        return json.loads(r["payload_json"])
    return None


def _cache_put(key: str, items: list[dict[str, Any]]) -> None:
    with connect() as c:
        c.execute("INSERT OR REPLACE INTO osm_cache (key, payload_json, fetched_at) VALUES (?,?,?)", (key, json.dumps(items), datetime.now(timezone.utc).isoformat()))


def _address(t: dict[str, str]) -> str:
    parts = [t.get("addr:housename"), t.get("addr:housenumber"), t.get("addr:street"), t.get("addr:suburb"), t.get("addr:city") or t.get("addr:town") or t.get("addr:village"), t.get("addr:postcode")]
    return ", ".join(p for p in parts if p)


def hotel_category(t: dict[str, str]) -> str:
    kind, stars = t.get("tourism", ""), t.get("stars", "")
    try:
        n = int(float(stars.replace("+", "").split(";")[0])) if stars else 0
    except ValueError:
        n = 0
    if kind == "resort":
        return "resort"
    if kind in ("guest_house", "chalet"):
        return "homestay_guesthouse"
    if kind == "apartment":
        return "villa_apartment"
    if kind == "hostel":
        return "budget"
    return {5: "5_star", 4: "4_star", 3: "3_star"}.get(n, "budget" if n in (1, 2) else "unrated")


def facilities(t: dict[str, str]) -> list[str]:
    out = []
    if t.get("swimming_pool") == "yes" or t.get("leisure") == "swimming_pool":
        out.append("Swimming pool")
    if t.get("internet_access") in ("wlan", "yes", "wifi") or t.get("wifi") == "yes":
        out.append("Wi-Fi")
    if t.get("parking") in ("yes", "surface", "multi-storey", "underground") or t.get("parking:fee") is not None:
        out.append("Parking")
    if t.get("restaurant") == "yes" or t.get("food") == "yes":
        out.append("Restaurant")
    if t.get("air_conditioning") == "yes":
        out.append("Air conditioning")
    return out


def parse(elements: list[dict[str, Any]], lat: float, lng: float, kind: str) -> list[dict[str, Any]]:
    out, seen = [], set()
    for e in elements:
        t = e.get("tags") or {}
        pt = (e.get("lat"), e.get("lon")) if e.get("type") == "node" else ((e.get("center") or {}).get("lat"), (e.get("center") or {}).get("lon"))
        name = t.get("name") or t.get("brand") or t.get("operator")
        if pt[0] is None or not name or (name, round(pt[0], 4)) in seen:
            continue
        seen.add((name, round(pt[0], 4)))
        item = {"osm_id": f"{e.get('type')}/{e.get('id')}", "name": name, "lat": pt[0], "lng": pt[1], "address": _address(t), "phone": t.get("phone") or t.get("contact:phone"),
                "website": t.get("website") or t.get("contact:website"), "distance_km": round(haversine_km(lat, lng, pt[0], pt[1]), 1), "distance_kind": "straight_line_estimate"}
        if kind == "hotel":
            item |= {"type": t.get("tourism"), "category": hotel_category(t), "stars": t.get("stars"), "facilities": facilities(t)}
        elif kind == "restaurant":
            item |= {"type": t.get("amenity"), "cuisine": t.get("cuisine")}
        elif kind == "ev_charging":
            item |= {"operator": t.get("operator"), "sockets": t.get("capacity")}
        elif kind == "fuel":
            item |= {"brand": t.get("brand") or t.get("operator")}
        out.append(item)
    return sorted(out, key=lambda x: x["distance_km"])


def nearby(kind: str, lat: float, lng: float, radius_km: float = 10, limit: int = 40) -> dict[str, Any]:
    if kind not in KINDS:
        raise ValueError(f"kind must be one of {sorted(KINDS)}.")
    radius_km = max(1, min(radius_km, 30))
    key = f"{kind}:{round(lat, 2)}:{round(lng, 2)}:{int(radius_km)}"
    cached = _cache_get(key)
    base = {"kind": kind, "attribution": ATTRIBUTION, "note": "OpenStreetMap has no prices, ratings, photos or live availability."}
    if cached is not None:
        return {**base, "status": "ok", "cached": True, "items": cached[:limit]}
    try:
        import httpx
        r = httpx.post(OVERPASS, data={"data": _query(kind, lat, lng, int(radius_km * 1000), limit)}, headers=HEADERS, timeout=25.0)
        r.raise_for_status()
        items = parse(r.json().get("elements", []), lat, lng, kind)
    except Exception as exc:                                                  # noqa: BLE001
        log.warning("Overpass lookup failed: %s", type(exc).__name__)
        return {**base, "status": "unavailable", "cached": False, "items": [], "message": "Map data could not be loaded right now. Please try again in a minute."}
    _cache_put(key, items)
    return {**base, "status": "ok", "cached": False, "items": items[:limit]}
