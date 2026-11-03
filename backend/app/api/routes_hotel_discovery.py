from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..services.hotel_discovery import HotelSearchRequest, autocomplete_destination, discover_hotels

router = APIRouter(prefix="/api/hotel-discovery")


@router.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "providers": {
            "google_places": bool(__import__("os").getenv("GOOGLE_PLACES_API_KEY") or __import__("os").getenv("GOOGLE_MAPS_API_KEY")),
            "amadeus": bool(__import__("os").getenv("AMADEUS_CLIENT_ID") and __import__("os").getenv("AMADEUS_CLIENT_SECRET")),
        },
        "note": "This module performs discovery and supplier lookups; live booking confirmation must come from the supplier.",
    }


@router.get("/autocomplete")
def autocomplete(input_text: str = Query(..., min_length=2, max_length=120)) -> dict[str, object]:
    predictions = autocomplete_destination(input_text)
    return {"predictions": [{"description": p.get("description"), "place_id": p.get("place_id"), "id": p.get("place_id") or p.get("id"), "structured_formatting": p.get("structured_formatting", {})} for p in predictions]}


@router.post("/search")
def search(request: HotelSearchRequest) -> dict[str, object]:
    try:
        return discover_hotels(request)
    except Exception as exc:  # pragma: no cover - surfaced to API layer for consistent client handling
        raise HTTPException(status_code=400, detail=str(exc)) from exc
