"""
DEMO planner used when no GOOGLE_API_KEY is set (or the ADK agent fails).

It is NOT an AI model. It reads your message with simple rules (place names, "5 day",
budget amounts, interests) and calls the same planning code the real agent uses.
Replies are always labelled as demo mode so nobody mistakes them for live AI answers.
"""
from __future__ import annotations

import re
from typing import Any

from ..services import catalog, places
from ..services.destinations_data import ORIGIN_CITIES
from ..services.planner import build_plan

NUMBER_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8}
TAG_MAP = {"waterfalls": "waterfall", "nature": "hills", "temples": "temple"}
INTEREST_WORDS = ["waterfalls", "nature", "hills", "beach", "heritage", "spiritual", "temple", "temples", "island", "snow", "adventure", "food",
                  "less-crowded", "backwaters", "tea", "wildlife", "snow"]


def parse_request(text: str) -> dict[str, Any]:
    low = text.lower().replace("less crowded", "less-crowded").replace("hill station", "hills")
    days = None
    if m := re.search(r"(\d{1,2})\s*-?\s*(?:day|days|night)", low):
        days = int(m.group(1))
    budget = None
    if m := re.search(r"(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)\s*(k|lakh)?|\b([\d,]+)\s*(k|lakh)\b", low):
        raw = (m.group(1) or m.group(3)).replace(",", "")
        unit = m.group(2) or m.group(4)
        budget = int(float(raw) * (1000 if unit == "k" else 100000 if unit == "lakh" else 1))
    adults = 2
    if m := re.search(r"(\d+|" + "|".join(NUMBER_WORDS) + r")\s*(?:people|persons|adults|travell?ers|of us)", low):
        v = m.group(1)
        adults = int(v) if v.isdigit() else NUMBER_WORDS[v]
    origin = next((c.title() for c in ORIGIN_CITIES if re.search(rf"from\s+{c}", low)), "Hyderabad")
    return {"days": days, "budget": budget, "adults": max(1, min(adults, 20)), "origin": origin,
            "interests": [w for w in INTEREST_WORDS if w in low], "destination": catalog.match_destination_in_text(low)}


def reply_to(text: str) -> dict[str, Any]:
    req = parse_request(text)
    dest = req["destination"]
    notice = "Demo mode: replies come from simple rules, not Gemini. Add GOOGLE_API_KEY to backend/.env for the real AI agent."
    if dest is None:
        picks = []
        for state in catalog.match_states_in_text(text):
            tag = next((TAG_MAP.get(t, t) for t in req["interests"]), "")
            picks += places.search(state=state, tag=tag, page_size=4)["items"] or places.search(state=state, page_size=4)["items"]
        for tag in ([] if picks else (req["interests"] or ["nature"])):
            picks += places.search(tag=TAG_MAP.get(tag, tag), page_size=4)["items"]
        picks = list({d["id"]: d for d in picks}.values())[:3] or places.search(featured=True, page_size=3)["items"]
        names = ", ".join(d["name"] for d in picks)
        return {"reply": f"I can help plan that. Based on your interests, good options from my sample list are {names}. "
                         "Which one would you like, and for how many days?",
                "destination_ids": [d["id"] for d in picks], "notice": notice,
                "follow_ups": [f"Plan 4 days in {d['name']}" for d in picks]}
    days = req["days"] or 4
    plan = build_plan(dest["id"], min(days, 14), req["adults"], 0, req["origin"], req["budget"],
                      "standard", "train", req["interests"])
    b = plan["budget"]
    lines = [f"Here is a {days}-day outline for {dest['name']}, {dest['state']} for {req['adults']} adults, from {req['origin']}."]
    for d in plan["itinerary"]["days"]:
        stops = [s["title"] for s in d["slots"] if s["kind"] == "attraction"]
        lines.append(f"{d['title']}: " + ("; ".join(stops) if stops else "relaxed day, local food and markets."))
    lines.append(f"Illustrative total: about Rs {b['total_inr']:,} (Rs {b['per_person_inr']:,} per person). "
                 "These are demo estimates, not live prices.")
    if b["within_budget"] is False:
        lines.append("That is above your budget. " + " ".join(b["suggestions"][1:2]))
    elif b["within_budget"]:
        lines.append("That fits within your budget.")
    return {"reply": " ".join(lines), "destination_ids": [dest["id"]], "notice": notice,
            "follow_ups": ["Make it cheaper", "Show weather", "Suggest another destination"]}
