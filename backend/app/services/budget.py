"""
Budget estimation. Everything here is an ILLUSTRATIVE DEMO ESTIMATE based on simple
rules and the sample catalogue. These are NOT live ticket or hotel prices.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

from .catalog import get_destination, haversine_km
from .destinations_data import ORIGIN_CITIES

STYLES = {"budget": 0.8, "standard": 1.0, "comfort": 1.6}
# Rough INR per person per km (road distance ~1.3x straight line). Illustrative only.
RATE_PER_KM = {"bus": 1.6, "train": 1.4, "flight": 3.5}
FLIGHT_BASE = 2500


def estimate_transport_round_trip_per_adult(origin_city: str, dest: dict[str, Any], mode: str) -> tuple[int, str]:
    """Return (round-trip INR per adult, note about how it was derived)."""
    origin = ORIGIN_CITIES.get(origin_city.strip().lower())
    if origin is None:
        return 4000, f"Origin '{origin_city}' is not in the demo city list, so a flat Rs 4,000 round trip was assumed."
    km = haversine_km(origin[0], origin[1], dest["lat"], dest["lng"]) * 1.3
    one_way = RATE_PER_KM[mode] * km + (FLIGHT_BASE if mode == "flight" else 0)
    return int(round(one_way * 2, -1)), f"About {int(km)} km by road/rail ({mode}), illustrative rate."


def estimate_budget(destination_id: str, days: int, adults: int = 2, children: int = 0,
                    origin_city: str = "Hyderabad", style: str = "standard",
                    transport_mode: str = "train", requested_budget: int | None = None,
                    sightseeing_fees_per_adult: int | None = None) -> dict[str, Any]:
    dest = get_destination(destination_id)
    if dest is None:
        raise ValueError(f"Unknown destination '{destination_id}'.")
    if style not in STYLES:
        raise ValueError(f"style must be one of {sorted(STYLES)}.")
    if transport_mode not in RATE_PER_KM:
        raise ValueError(f"transport_mode must be one of {sorted(RATE_PER_KM)}.")
    if not (1 <= days <= 30 and 1 <= adults <= 30 and 0 <= children <= 30):
        raise ValueError("days, adults or children are out of range.")

    nights = max(days - 1, 0)
    rooms = max(1, math.ceil(adults / 2))
    people_equiv = adults + children * 0.5      # children counted at half price for food/transport
    per_adult_transport, transport_note = estimate_transport_round_trip_per_adult(origin_city, dest, transport_mode)
    base_stay = dest["stay_budget"] if style == "budget" else dest["stay_mid"] * (1.8 if style == "comfort" else 1.0)

    if sightseeing_fees_per_adult is None:
        fees = sorted((a["fee_inr"] for a in dest["attractions"]), reverse=True)
        sightseeing_fees_per_adult = sum(fees[: min(len(fees), 2 * days)])

    items = {
        "transport_to_and_from": int(per_adult_transport * people_equiv),
        "accommodation": int(base_stay * rooms * nights),
        "food": int(dest["food_pp_day"] * STYLES[style] * people_equiv * days),
        "local_transport": int(dest["local_day"] * days * (1.4 if style == "comfort" else 1.0)),
        "sightseeing_and_activities": int(sightseeing_fees_per_adult * adults),
    }
    subtotal = sum(items.values())
    items["contingency_8_percent"] = int(subtotal * 0.08)
    total = subtotal + items["contingency_8_percent"]
    travellers = adults + children

    result: dict[str, Any] = {
        "destination_id": dest["id"], "currency": "INR", "days": days, "nights": nights,
        "adults": adults, "children": children, "rooms": rooms, "style": style,
        "items": items, "total_inr": total, "per_person_inr": int(total / travellers),
        "data_quality": "illustrative_demo",
        "notes": [transport_note,
                  "All figures are illustrative demo estimates, not live prices. Check IRCTC, airlines and "
                  "hotel sites for real fares."],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "requested_budget_inr": requested_budget, "within_budget": None, "suggestions": [],
    }
    if requested_budget:
        result["within_budget"] = total <= requested_budget
        if total > requested_budget:
            gap = total - requested_budget
            result["suggestions"] = [
                f"Estimate is about Rs {gap:,} over budget.",
                "Try the 'budget' style, a train/bus instead of a flight, or one night fewer.",
                "Consider a closer or cheaper destination from the alternatives list.",
            ]
    return result
