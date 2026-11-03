"""Pulls searchable columns out of a saved plan, so the admin can filter and chart trips with plain SQL."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any


def trip_fields(plan: dict[str, Any]) -> dict[str, Any]:
    req = plan.get("request") or {}
    dest = plan.get("destination") or {}
    budget = plan.get("budget") or {}
    start, end = req.get("start_date") or None, None
    if start:
        try:
            end = (date.fromisoformat(start) + timedelta(days=max(int(req.get("days") or 1), 1) - 1)).isoformat()
        except ValueError:
            start = None
    return {
        "destination_id": dest.get("id"), "destination_name": dest.get("name"), "origin_city": req.get("origin_city"),
        "start_date": start, "end_date": end,
        "travellers": int(req.get("adults") or 1) + int(req.get("children") or 0),
        "transport_mode": req.get("transport_mode"), "est_total_inr": int(budget.get("total_inr") or 0),
    }
