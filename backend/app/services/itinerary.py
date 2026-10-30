"""Rule-based itinerary generator (no LLM needed, so the Itinerary page is fast and reliable)."""
from __future__ import annotations

from typing import Any

from .catalog import get_destination, haversine_km

PACE_SLOTS = {"relaxed": ("morning", "evening"), "balanced": ("morning", "afternoon", "evening"),
              "packed": ("morning", "afternoon", "evening")}


def _score(attraction: dict[str, Any], interests: list[str]) -> int:
    wanted = {i.lower() for i in interests}
    return len(wanted & {t.lower() for t in attraction["tags"]})


def _leg(prev: dict[str, Any] | None, cur: dict[str, Any]) -> str:
    if not prev or prev.get("lat") is None or cur.get("lat") is None:
        return ""
    km = haversine_km(prev["lat"], prev["lng"], cur["lat"], cur["lng"])
    if km < 1.5:
        return f"About {km:.1f} km away (straight line): walkable."
    return f"About {km:.0f} km away (straight line). Real road time will be longer; check a maps app."


def _fee_note(a: dict[str, Any]) -> str:
    if not a.get("fee_known", True):
        return "Entry fee and timings are not verified here. Check the official source."
    if a["fee_inr"]:
        return f"Approx. entry fee Rs {a['fee_inr']} per adult (illustrative)."
    return "No entry fee in the sample data (confirm locally)."


def generate_itinerary(destination_id: str, days: int, interests: list[str] | None = None,
                       excluded: list[str] | None = None, pace: str = "balanced") -> dict[str, Any]:
    dest = get_destination(destination_id)
    if dest is None:
        raise ValueError(f"Unknown destination '{destination_id}'.")
    if not 1 <= days <= 14:
        raise ValueError("days must be between 1 and 14.")
    if pace not in PACE_SLOTS:
        raise ValueError("pace must be relaxed, balanced or packed.")
    interests, excluded = interests or [], {e.lower() for e in (excluded or [])}

    pool = [a for a in dest["attractions"] if a["name"].lower() not in excluded]
    pool.sort(key=lambda a: -_score(a, interests))   # stable: keeps catalogue order for ties
    food = list(dest["food"])
    plan_days, prev = [], None

    for n in range(1, days + 1):
        slots = []
        wanted = ("morning",) if (n == days and days > 1) else PACE_SLOTS[pace]
        for slot in wanted:
            use_food = slot == "evening" and food and not (pace == "packed" and pool)
            if use_food:
                dish = food[(n - 1) % len(food)]
                entry = {"slot": slot, "title": f"Local food: {dish}", "kind": "food", "duration_hours": 1.5,
                         "fee_inr": 0, "lat": None, "lng": None, "attraction": False,
                         "notes": "General suggestion. Ask your hotel for a well-rated nearby place."}
            elif pool:
                a = pool.pop(0)
                entry = {"slot": slot, "title": a["name"], "kind": "attraction", "duration_hours": a["hours"],
                         "fee_inr": a["fee_inr"], "lat": a["lat"], "lng": a["lng"], "attraction": True,
                         "notes": _fee_note(a)}
            else:
                entry = {"slot": slot, "title": f"Relaxed time in {dest['name']}", "kind": "free",
                         "duration_hours": 2, "fee_inr": 0, "lat": None, "lng": None, "attraction": False,
                         "notes": "Free time: local market, cafe or viewpoint. General suggestion."}
            entry["transport_from_previous"] = _leg(prev, entry)
            if entry["lat"] is not None:
                prev = entry
            slots.append(entry)
        if n == 1:
            title = f"Day {n}: Arrive and settle in"
        elif n == days and days > 1:
            title = f"Day {n}: Easy morning and departure"
        else:
            title = f"Day {n}: Explore {dest['name']}"
        plan_days.append({"day": n, "title": title, "slots": slots})

    return {"destination_id": dest["id"], "days": plan_days, "tips": dest["tips"], "pace": pace,
            "data_quality": "sample_catalogue"}
