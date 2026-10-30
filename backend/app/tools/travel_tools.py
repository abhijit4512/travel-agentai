"""
Tools the ADK agent can call. Each tool is a plain typed Python function with a docstring;
ADK reads the signature and docstring to tell the model how to use it.

Rules followed here:
- simple argument types only (str, int, float, bool)
- always return a dict with a "status" key
- never invent live data; label demo/sample data clearly
"""
from __future__ import annotations

from typing import Any

from ..services import budget as budget_service
from ..services import catalog, itinerary as itinerary_service, places, weather as weather_service
from ..services.images import get_photos


def _error(message: str) -> dict[str, Any]:
    return {"status": "error", "message": message}


def search_destinations(query: str = "", interest: str = "", state: str = "") -> dict[str, Any]:
    """Search the catalogue of Indian destinations (all states and union territories; a seed list, not every place).

    Args:
        query: Free text such as "hill station" or a place name. Leave empty for all.
        interest: One tag such as temple, wildlife, beach, hills, heritage, waterfall, lake, island, adventure, trekking, food, offbeat, honeymoon, family, weekend.
        state: Indian state name filter, for example "Kerala".

    Returns:
        dict with status and a list of destination summaries. The catalogue is a seed list, not every place in India.
    """
    res = places.search(q=query, tag=interest, state=state, page_size=12)
    return {"status": "ok", "count": res["total"], "data_quality": "seed_catalogue",
            "destinations": res["items"]}


def get_destination_details(destination_id: str) -> dict[str, Any]:
    """Get details for one destination: description, best season, attractions, food and tips.

    Args:
        destination_id: Catalogue id such as "munnar" or "araku-valley".
    """
    dest = catalog.get_destination(destination_id)
    if dest is None:
        return _error(f"Unknown destination id '{destination_id}'. Use search_destinations first.")
    return {"status": "ok", "data_quality": "sample_catalogue",
            "destination": {**{k: dest[k] for k in ("id", "name", "state", "description", "best_season")}, "attractions": dest["attractions"],
                            "food": dest["food"], "tips": dest["tips"]}}


def search_attractions(destination_id: str, interest: str = "") -> dict[str, Any]:
    """List attractions in a destination, optionally filtered by an interest tag.

    Args:
        destination_id: Catalogue id such as "munnar".
        interest: Optional tag such as waterfalls or heritage.
    """
    dest = catalog.get_destination(destination_id)
    if dest is None:
        return _error(f"Unknown destination id '{destination_id}'.")
    items = [a for a in dest["attractions"] if not interest or interest.lower() in a["tags"]]
    return {"status": "ok", "data_quality": "sample_catalogue", "attractions": items}


def get_place_photos(destination_id: str) -> dict[str, Any]:
    """Get licensed photos (with attribution) for a destination from Google Places, if configured.

    Args:
        destination_id: Catalogue id such as "goa".
    """
    try:
        return get_photos(destination_id)
    except ValueError as exc:
        return _error(str(exc))


def get_route_information(destination_id: str, from_place: str, to_place: str) -> dict[str, Any]:
    """Approximate straight-line distance between two attractions in a destination.

    This is NOT a driving route or live travel time.

    Args:
        destination_id: Catalogue id.
        from_place: Attraction name (exact name from search_attractions).
        to_place: Attraction name (exact name from search_attractions).
    """
    dest = catalog.get_destination(destination_id)
    if dest is None:
        return _error(f"Unknown destination id '{destination_id}'.")
    by_name = {a["name"].lower(): a for a in dest["attractions"]}
    a, b = by_name.get(from_place.lower()), by_name.get(to_place.lower())
    if not a or not b:
        return _error("Both places must be attraction names from search_attractions.")
    km = catalog.haversine_km(a["lat"], a["lng"], b["lat"], b["lng"])
    return {"status": "ok", "kind": "straight_line_estimate", "distance_km": round(km, 1),
            "note": "Real road distance and time will be longer. Configure Google Routes API for live routes."}


def estimate_trip_budget(destination_id: str, days: int, adults: int = 2, children: int = 0,
                         origin_city: str = "Hyderabad", style: str = "standard",
                         transport_mode: str = "train", requested_budget_inr: int = 0) -> dict[str, Any]:
    """Estimate the total trip cost in INR for a group. Illustrative demo estimate, not live prices.

    Args:
        destination_id: Catalogue id.
        days: Trip length in days (1-30).
        adults: Number of adults.
        children: Number of children.
        origin_city: Starting city, e.g. Hyderabad.
        style: budget, standard or comfort.
        transport_mode: train, bus or flight.
        requested_budget_inr: The user's total budget in INR, or 0 if not given.
    """
    try:
        result = budget_service.estimate_budget(destination_id, days, adults, children, origin_city, style,
                                                transport_mode, requested_budget_inr or None)
    except ValueError as exc:
        return _error(str(exc))
    return {"status": "ok", **result}


def get_weather_forecast(destination_id: str, days: int = 7) -> dict[str, Any]:
    """Get a real weather forecast (Open-Meteo) for a destination, up to 16 days ahead.

    Args:
        destination_id: Catalogue id.
        days: Number of forecast days (1-16).
    """
    try:
        return weather_service.get_forecast(destination_id, days)
    except ValueError as exc:
        return _error(str(exc))


def search_transport_options(origin_city: str, destination_id: str) -> dict[str, Any]:
    """Transport options between a city and a destination. NO live schedules or fares are available.

    Args:
        origin_city: Starting city.
        destination_id: Catalogue id.
    """
    dest = catalog.get_destination(destination_id)
    if dest is None:
        return _error(f"Unknown destination id '{destination_id}'.")
    options = {}
    for mode in ("train", "bus", "flight"):
        cost, note = budget_service.estimate_transport_round_trip_per_adult(origin_city, dest, mode)
        options[mode] = {"round_trip_inr_per_adult": cost, "note": note}
    return {"status": "not_configured", "data_quality": "illustrative_demo", "options": options,
            "message": "Live schedules and prices are not connected. Check IRCTC, airline or bus sites. "
                       "This assistant cannot book tickets."}


def search_accommodation_options(destination_id: str, style: str = "standard") -> dict[str, Any]:
    """Typical nightly room price range for a destination. NO live hotel availability or prices.

    Args:
        destination_id: Catalogue id.
        style: budget or standard.
    """
    dest = catalog.get_destination(destination_id)
    if dest is None:
        return _error(f"Unknown destination id '{destination_id}'.")
    price = dest["stay_budget"] if style == "budget" else dest["stay_mid"]
    return {"status": "not_configured", "data_quality": "illustrative_demo",
            "typical_room_per_night_inr": price,
            "message": "Live hotel availability is not connected. Check hotel booking sites."}


def generate_itinerary(destination_id: str, days: int, interests: str = "") -> dict[str, Any]:
    """Build a day-by-day itinerary (morning, afternoon, evening) from the sample catalogue.

    Args:
        destination_id: Catalogue id.
        days: Number of days (1-14).
        interests: Comma separated interest tags, e.g. "waterfalls,nature".
    """
    try:
        tags = [t.strip() for t in interests.split(",") if t.strip()]
        return {"status": "ok", **itinerary_service.generate_itinerary(destination_id, days, tags)}
    except ValueError as exc:
        return _error(str(exc))


ALL_TOOLS = [search_destinations, get_destination_details, search_attractions, get_place_photos,
             get_route_information, estimate_trip_budget, get_weather_forecast, search_transport_options,
             search_accommodation_options, generate_itinerary]
