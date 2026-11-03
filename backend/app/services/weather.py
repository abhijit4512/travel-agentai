"""Weather via Open-Meteo (free, no API key). Reports honestly when it cannot be fetched."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from .catalog import get_destination

log = logging.getLogger(__name__)
URL = "https://api.open-meteo.com/v1/forecast"


def get_forecast(destination_id: str, days: int = 7) -> dict[str, Any]:
    dest = get_destination(destination_id)
    if dest is None:
        raise ValueError(f"Unknown destination '{destination_id}'.")
    params = {"latitude": dest["lat"], "longitude": dest["lng"], "timezone": "Asia/Kolkata",
              "forecast_days": max(1, min(days, 16)),
              "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max"}
    try:
        resp = httpx.get(URL, params=params, timeout=8.0)
        resp.raise_for_status()
        daily = resp.json()["daily"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        log.warning("Weather lookup failed for %s: %s", destination_id, type(exc).__name__)
        return {"status": "unavailable", "destination_id": destination_id,
                "message": "Live weather could not be retrieved right now. Please check a weather app."}
    rows = [{"date": d, "max_c": hi, "min_c": lo, "rain_chance_percent": rain}
            for d, hi, lo, rain in zip(daily["time"], daily["temperature_2m_max"],
                                       daily["temperature_2m_min"], daily["precipitation_probability_max"])]
    return {"status": "ok", "destination_id": destination_id, "source": "Open-Meteo (open-meteo.com)",
            "retrieved_at": datetime.now(timezone.utc).isoformat(), "forecast": rows}
