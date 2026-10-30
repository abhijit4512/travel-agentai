"""Builds the full trip-plan object used by the Itinerary page and the demo chat."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from . import budget as budget_service
from . import catalog, itinerary as itinerary_service, places
from .places_seed import PLACE_BY_ID


def build_plan(destination_id: str, days: int, adults: int = 2, children: int = 0,
               origin_city: str = "Hyderabad", budget_inr: int | None = None, style: str = "standard",
               transport_mode: str = "train", interests: list[str] | None = None,
               excluded: list[str] | None = None, pace: str = "balanced", start_date: str | None = None,
               accessibility_needs: str = "", special_requirements: str = "") -> dict[str, Any]:
    dest = catalog.get_destination(destination_id)
    if dest is None:
        raise ValueError(f"Unknown destination '{destination_id}'.")
    itin = itinerary_service.generate_itinerary(dest["id"], days, interests, excluded, pace)
    used_fees = sum(s["fee_inr"] for d in itin["days"] for s in d["slots"] if s.get("attraction"))
    budget = budget_service.estimate_budget(dest["id"], days, adults, children, origin_city, style,
                                            transport_mode, budget_inr, sightseeing_fees_per_adult=used_fees)
    place = PLACE_BY_ID.get(dest["id"])
    summary = places.summary(place) if place else catalog.summary(dest)
    room = dest["stay_budget"] if style == "budget" else int(dest["stay_mid"] * (1.8 if style == "comfort" else 1.0))
    return {
        "destination": summary, "itinerary": itin, "budget": budget,
        "alternatives": places.similar(dest["id"], 4), "tips": dest["tips"], "food": dest["food"],
        "stay": {"typical_room_per_night_inr": room, "rooms": budget["rooms"], "data_quality": "illustrative_demo",
                 "note": "Typical range only. Live hotel availability and prices are not connected."},
        "request": {"origin_city": origin_city, "days": days, "adults": adults, "children": children,
                    "budget_inr": budget_inr, "style": style, "transport_mode": transport_mode,
                    "interests": interests or [], "excluded": excluded or [], "pace": pace,
                    "start_date": start_date, "accessibility_needs": accessibility_needs,
                    "special_requirements": special_requirements},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
