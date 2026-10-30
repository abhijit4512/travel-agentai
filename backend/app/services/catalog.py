"""Read-only helpers over the sample destination catalogue."""
from __future__ import annotations

import math
import re
from typing import Any

from .destinations_data import BY_ID, DESTINATIONS, ORIGIN_CITIES


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Straight-line distance between two coordinates in kilometres."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def summary(dest: dict[str, Any]) -> dict[str, Any]:
    """Short card-sized view of a destination (no attraction list)."""
    daily_low = int(dest["food_pp_day"] * 0.8 + dest["stay_budget"] / 2)
    daily_high = int(dest["food_pp_day"] * 1.6 + dest["stay_mid"] / 2)
    return {
        "id": dest["id"], "name": dest["name"], "state": dest["state"],
        "description": dest["description"], "interests": dest["interests"],
        "best_season": dest["best_season"], "lat": dest["lat"], "lng": dest["lng"],
        # Per person per day for stay (shared room) + food. Excludes travel to the destination.
        "budget_per_person_per_day_inr": {"low": daily_low, "high": daily_high,
                                          "quality": "illustrative_demo"},
    }


def get_destination(destination_id: str) -> dict[str, Any] | None:
    """Rich hand-written record if we have one, otherwise a record built from the large places catalogue."""
    key = destination_id.strip().lower()
    if key in BY_ID:
        return BY_ID[key]
    from . import places          # imported here to avoid a circular import
    return places.as_destination(key)


def find_destinations(query: str = "", interest: str = "", state: str = "") -> list[dict[str, Any]]:
    """Filter the catalogue by free text, interest tag and/or state."""
    q, i, s = query.strip().lower(), interest.strip().lower(), state.strip().lower()
    out = []
    for d in DESTINATIONS:
        haystack = " ".join([d["name"], d["state"], d["description"], " ".join(d["interests"])]).lower()
        if q and not all(word in haystack for word in q.split()):
            continue
        if i and i not in [x.lower() for x in d["interests"]]:
            continue
        if s and s not in d["state"].lower():
            continue
        out.append(d)
    return out


def match_destination_in_text(text: str) -> dict[str, Any] | None:
    """Find the first catalogue destination whose name appears in free text."""
    low = text.lower()
    # "from Hyderabad" names the starting city, not the destination, so ignore it.
    for city in ORIGIN_CITIES:
        low = re.sub(rf"\bfrom\s+{city}\b", " ", low)
    for d in DESTINATIONS:
        names = {d["id"].replace("-", " "), d["name"].lower().split(" (")[0]}
        if d["id"] == "meghalaya":
            names |= {"shillong", "cherrapunji"}
        if d["id"] == "alleppey":
            names |= {"alappuzha"}
        if d["id"] == "coorg":
            names |= {"kodagu"}
        if d["id"] == "kutch":
            names |= {"rann of kutch"}
        if any(n and n in low for n in names):
            return d
    from . import places
    ids = places.match_ids_in_text(low, 1)
    return get_destination(ids[0]) if ids else None


def match_states_in_text(text: str) -> list[str]:
    """Return state / union territory names mentioned in the text (e.g. 'Kerala')."""
    from .places_seed import STATES
    low = text.lower()
    return sorted({name for name, _ in STATES.values() if name.lower() in low})
