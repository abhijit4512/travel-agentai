"""Builds the full trip-plan object used by the Itinerary page and the demo chat."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from . import budget as budget_service
from . import catalog, itinerary as itinerary_service


def build_plan(destination_id: str, days: int, adults: int = 2, children: int = 0,
               origin_city: str = "Hyderabad", budget_inr: int | None = None, style: str = "standard",
               transport_mode: str = "train", interests: list[str] | None = None,
               excluded: list[str] | None = None, pace: str = "balanced",
               start_date: date | None = None, accessibility_needs: str = "",
               special_requirements: str = "") -> dict[str, Any]:
    dest = catalog.get_destination(destination_id)
    if dest is None:
        raise ValueError(f"Unknown destination '{destination_id}'.")
    itin = itinerary_service.generate_itinerary(destination_id, days, interests, excluded, pace)
    used_fees = sum(s["fee_inr"] for d in itin["days"] for s in d["slots"] if s.get("attraction"))
    budget = budget_service.estimate_budget(destination_id, days, adults, children, origin_city, style,
                                            transport_mode, budget_inr, sightseeing_fees_per_adult=used_fees)
    wanted = {i.lower() for i in (interests or [])} or set(dest["interests"][:2])
    alternatives = [catalog.summary(d) for d in catalog.find_destinations()
                    if d["id"] != dest["id"] and wanted & {i.lower() for i in d["interests"]}][:4]
    return {
        "destination": catalog.summary(dest), "itinerary": itin, "budget": budget, "alternatives": alternatives,
        "tips": dest["tips"], "food": dest["food"],
        "request": {"origin_city": origin_city, "days": days, "adults": adults, "children": children,
                    "budget_inr": budget_inr, "style": style, "transport_mode": transport_mode,
                    "interests": interests or [], "excluded": excluded or [], "pace": pace,
                    "start_date": start_date.isoformat() if start_date else None,
                    "accessibility_needs": accessibility_needs,
                    "special_requirements": special_requirements},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
