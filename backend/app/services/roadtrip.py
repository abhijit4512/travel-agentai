"""Road-trip cost maths. Pure functions, no web framework. Every figure is an ESTIMATE and is labelled so."""
from __future__ import annotations

import json
import math
from typing import Any

from ..database.db import connect
from .catalog import haversine_km
from .destinations_data import ORIGIN_CITIES
from .places_seed import PLACE_BY_ID

ROAD_FACTOR = 1.3          # road distance is usually longer than the straight line
AVG_SPEED_KMH = 50         # mixed highway and town driving
DRIVING_KM_PER_DAY = 400


def get_vehicle(vehicle_id: str) -> dict[str, Any] | None:
    with connect() as c:
        r = c.execute("SELECT * FROM vehicles WHERE id=? AND active=1", (vehicle_id,)).fetchone()
    return _vehicle(r) if r else None


def _vehicle(r) -> dict[str, Any]:
    d = dict(r)
    d["features"] = json.loads(d["features"] or "[]")
    return d


def list_vehicles(category: str = "", only_active: bool = True) -> list[dict[str, Any]]:
    with connect() as c:
        rows = c.execute("SELECT * FROM vehicles WHERE (? = '' OR category = ?) AND (? = 0 OR active = 1) ORDER BY rent_per_day_inr", (category, category, 1 if only_active else 0)).fetchall()
    return [_vehicle(r) for r in rows]


def resolve_stop(stop: dict[str, Any]) -> dict[str, Any]:
    """A stop can be {city}, {place_id} or {name, lat, lng}."""
    if stop.get("place_id"):
        p = PLACE_BY_ID.get(stop["place_id"])
        if p is None:
            raise ValueError(f"Unknown place '{stop['place_id']}'.")
        return {"name": p["name"], "lat": p["lat"], "lng": p["lng"]}
    if stop.get("city"):
        c = ORIGIN_CITIES.get(stop["city"].strip().lower())
        if c is None:
            raise ValueError(f"Unknown city '{stop['city']}'. Use a place from the list or give coordinates.")
        return {"name": stop["city"].title(), "lat": c[0], "lng": c[1]}
    if stop.get("lat") is not None and stop.get("lng") is not None:
        return {"name": stop.get("name") or "Stop", "lat": float(stop["lat"]), "lng": float(stop["lng"])}
    raise ValueError("Each stop needs a place_id, a city, or coordinates.")


def route_distance_km(stops: list[dict[str, Any]]) -> tuple[float, list[dict[str, Any]]]:
    legs = []
    for a, b in zip(stops, stops[1:]):
        straight = haversine_km(a["lat"], a["lng"], b["lat"], b["lng"])
        legs.append({"from": a["name"], "to": b["name"], "straight_line_km": round(straight, 1), "road_km_estimate": round(straight * ROAD_FACTOR, 1)})
    return sum(l["road_km_estimate"] for l in legs), legs


def maps_link(stops: list[dict[str, Any]], round_trip: bool) -> str | None:
    pts = list(stops) + ([stops[0]] if round_trip and len(stops) > 1 else [])
    if len(pts) < 2:
        return None
    co = lambda s: f"{s['lat']},{s['lng']}"                               # noqa: E731
    mid = "%7C".join(co(s) for s in pts[1:-1])
    return f"https://www.google.com/maps/dir/?api=1&origin={co(pts[0])}&destination={co(pts[-1])}" + (f"&waypoints={mid}" if mid else "") + "&travelmode=driving"


def estimate(stops: list[dict[str, Any]], vehicle: dict[str, Any], fuel_price: dict[str, Any], round_trip: bool = False, days: int | None = None,
             rent_per_day: float | None = None, tolls_inr: float = 0, parking_inr: float = 0, distance_override_km: float | None = None,
             mileage_override: float | None = None) -> dict[str, Any]:
    """Fuel needed = distance / mileage.  Fuel cost = fuel needed x price.  (EVs: kWh = distance x kWh per 100 km / 100.)"""
    one_way, legs = route_distance_km(stops)
    if distance_override_km is not None:
        one_way = float(distance_override_km)
    if one_way <= 0:
        raise ValueError("Total distance must be more than 0 km.")
    distance = one_way * (2 if round_trip else 1)
    ev = vehicle["fuel_type"] == "electric"
    if ev:
        per100 = vehicle.get("kwh_per_100km")
        if not per100:
            raise ValueError("This vehicle has no energy use value.")
        qty, unit = distance * per100 / 100, "kWh"
    else:
        mileage = mileage_override or vehicle.get("mileage")
        if not mileage or mileage <= 0:
            raise ValueError("Mileage must be more than 0.")
        qty, unit = distance / mileage, "kg" if vehicle["fuel_type"] == "cng" else "litres"
    price = fuel_price.get("price_inr")
    fuel_cost = round(qty * price) if price is not None else None
    hours = distance / AVG_SPEED_KMH
    trip_days = max(1, int(days)) if days else max(1, math.ceil(distance / DRIVING_KM_PER_DAY))
    rent = round((rent_per_day if rent_per_day is not None else vehicle["rent_per_day_inr"]) * trip_days)
    total = None if fuel_cost is None else fuel_cost + rent + round(tolls_inr) + round(parking_inr)
    return {
        "vehicle": {k: vehicle[k] for k in ("id", "name", "model", "category", "fuel_type", "seats", "transmission", "features", "mileage", "kwh_per_100km")},
        "round_trip": round_trip, "legs": legs, "distance_km": round(distance, 1), "one_way_km": round(one_way, 1),
        "distance_source": "your_input" if distance_override_km is not None else "estimate_from_straight_line",
        "travel_time_hours": round(hours, 1), "fuel_required": round(qty, 1), "fuel_unit": unit,
        "fuel_price": fuel_price, "fuel_cost_inr": fuel_cost, "rental_days": trip_days, "rent_per_day_inr": round(rent / trip_days),
        "rental_cost_inr": rent, "tolls_inr": round(tolls_inr), "parking_inr": round(parking_inr), "total_inr": total,
        "assumptions": [f"Road distance is the straight line x {ROAD_FACTOR}. Use your own distance from Google Maps for accuracy.",
                        f"Travel time assumes about {AVG_SPEED_KMH} km/h average, without rest stops.",
                        "Rental price is indicative; confirm with the rental company.",
                        "Tolls and parking are not looked up. Enter them yourself if you know them."],
        "data_quality": "estimate",
    }
