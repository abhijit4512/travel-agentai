"""Cars and fuel, nearby places, hotels, external booking links, saved searches, road trips and the user's own booking log."""
from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field

from ..database.db import connect
from ..services import fuel, links, osm, roadtrip
from ..services.places_seed import PLACE_BY_ID
from ..services.travel_data import CATEGORIES
from .deps import get_current_user, get_owner, rate_limit

router = APIRouter(prefix="/api/travel", dependencies=[Depends(rate_limit)])
DATE = "^\\d{4}-\\d{2}-\\d{2}$"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- vehicles and fuel ----------
@router.get("/vehicles")
def vehicles(category: str = Query("", max_length=30)) -> dict:
    return {"categories": CATEGORIES, "vehicles": roadtrip.list_vehicles(category), "note": "Mileage and rental prices are indicative, not live."}


@router.get("/fuel/price")
def fuel_price(city: str = Query("default", max_length=40), fuel_type: str = Query("petrol", alias="fuel", max_length=10)) -> dict:
    try:
        return fuel.get_price(city, fuel_type)
    except ValueError as exc:
        raise HTTPException(422, str(exc))


@router.get("/fuel/prices")
def fuel_prices(city: str = Query("", max_length=40)) -> dict:
    return {"prices": fuel.list_prices(city), "note": "Reference values are NOT live prices. Check today's price before relying on them."}


class Stop(BaseModel):
    place_id: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=40)
    name: str | None = Field(default=None, max_length=80)
    lat: float | None = Field(default=None, ge=6, le=38)
    lng: float | None = Field(default=None, ge=67, le=98)


class RoadTripRequest(BaseModel):
    stops: list[Stop] = Field(min_length=2, max_length=8)
    vehicle_ids: list[str] = Field(default_factory=list, max_length=4)
    fuel_city: str = Field(default="default", max_length=40)
    fuel_prices_override: dict[Literal["petrol", "diesel", "cng", "electric"], float] = Field(default_factory=dict)
    round_trip: bool = False
    days: int | None = Field(default=None, ge=1, le=60)
    rent_per_day_override: float | None = Field(default=None, ge=0, le=200000)
    tolls_inr: float = Field(default=0, ge=0, le=100000)
    parking_inr: float = Field(default=0, ge=0, le=100000)
    distance_override_km: float | None = Field(default=None, gt=0, le=10000)
    mileage_override: float | None = Field(default=None, gt=0, le=100)


@router.post("/roadtrip/estimate")
def roadtrip_estimate(body: RoadTripRequest) -> dict:
    try:
        stops = [roadtrip.resolve_stop(s.model_dump()) for s in body.stops]
        ids = body.vehicle_ids or ["swift-petrol"]
        results = []
        for vid in ids:
            v = roadtrip.get_vehicle(vid)
            if v is None:
                raise ValueError(f"Unknown vehicle '{vid}'.")
            price = fuel.get_price(body.fuel_city, v["fuel_type"], body.fuel_prices_override.get(v["fuel_type"]))
            results.append(roadtrip.estimate(stops, v, price, body.round_trip, body.days, body.rent_per_day_override, body.tolls_inr, body.parking_inr,
                                             body.distance_override_km, body.mileage_override))
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    return {"stops": stops, "results": results, "maps_link": roadtrip.maps_link(stops, body.round_trip),
            "cheapest_vehicle_id": min((r for r in results if r["total_inr"] is not None), key=lambda r: r["total_inr"], default={"vehicle": {"id": None}})["vehicle"]["id"]}


# ---------- nearby places, hotels, links ----------
def _point(place_id: str | None, lat: float | None, lng: float | None) -> tuple[float, float, str]:
    if place_id:
        p = PLACE_BY_ID.get(place_id)
        if p is None:
            raise HTTPException(404, "Destination not found.")
        return p["lat"], p["lng"], p["name"]
    if lat is None or lng is None:
        raise HTTPException(422, "Give a place_id or lat and lng.")
    return lat, lng, "this location"


@router.get("/nearby")
def nearby(kind: str = Query(..., pattern="^(hotel|restaurant|fuel|ev_charging)$"), place_id: str | None = Query(None, max_length=80), lat: float | None = Query(None, ge=6, le=38),
           lng: float | None = Query(None, ge=67, le=98), radius_km: float = Query(10, ge=1, le=30)) -> dict:
    la, ln, name = _point(place_id, lat, lng)
    return {"around": {"name": name, "lat": la, "lng": ln}, **osm.nearby(kind, la, ln, radius_km)}


@router.get("/hotels")
def hotels(place_id: str | None = Query(None, max_length=80), lat: float | None = Query(None, ge=6, le=38), lng: float | None = Query(None, ge=67, le=98),
           radius_km: float = Query(10, ge=1, le=30), category: str = Query("", pattern="^(|budget|3_star|4_star|5_star|resort|homestay_guesthouse|villa_apartment|unrated)$"),
           facility: str = Query("", max_length=30), q: str = Query("", max_length=60), check_in: str = Query("", pattern="^(|\\d{4}-\\d{2}-\\d{2})$"),
           check_out: str = Query("", pattern="^(|\\d{4}-\\d{2}-\\d{2})$"), adults: int = Query(2, ge=1, le=20), rooms: int = Query(1, ge=1, le=10)) -> dict:
    la, ln, name = _point(place_id, lat, lng)
    if check_in and check_out and check_out <= check_in:
        raise HTTPException(422, "Check-out must be after check-in.")
    res = osm.nearby("hotel", la, ln, radius_km, 60)
    items = res["items"]
    if category:
        items = [h for h in items if h.get("category") == category]
    if facility:
        items = [h for h in items if any(facility.lower() in f.lower() for f in h.get("facilities", []))]
    if q:
        items = [h for h in items if q.lower() in h["name"].lower()]
    return {**res, "items": items, "around": {"name": name, "lat": la, "lng": ln},
            "booking_links": links.hotel_links(name, check_in, check_out, adults, rooms),
            "availability_note": "Prices, ratings, photos and room availability are not available from this data. Check them on a booking site. Booking happens on that site, not here."}


@router.get("/links")
def external_links(kind: str = Query(..., pattern="^(hotel|bus|train|flight)$"), src: str = Query("", max_length=60), dst: str = Query("", max_length=60), date: str = Query("", pattern="^(|\\d{4}-\\d{2}-\\d{2})$"),
                   return_date: str = Query("", pattern="^(|\\d{4}-\\d{2}-\\d{2})$"), place: str = Query("", max_length=60)) -> dict:
    return {"kind": kind, "links": links.build(kind, src=src, dst=dst, date=date, return_date=return_date, place=place),
            "disclaimer": "These links open other websites. This app does not book tickets, does not show live fares or availability, and cannot see what you book there."}


# ---------- saved road trips and saved searches (guest or logged in) ----------
class SaveRoadTrip(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    request: dict[str, Any]
    summary: dict[str, Any] = Field(default_factory=dict)


@router.post("/roadtrips", status_code=201)
def save_roadtrip(body: SaveRoadTrip, owner: str = Depends(get_owner)) -> dict:
    payload = json.dumps({"request": body.request, "summary": body.summary})
    if len(payload) > 30000:
        raise HTTPException(413, "That road trip is too large to save.")
    with connect() as c:
        cur = c.execute("INSERT INTO road_trips (owner, title, payload_json, created_at) VALUES (?,?,?,?)", (owner, body.title.strip(), payload, _now()))
    return {"id": cur.lastrowid, "title": body.title}


@router.get("/roadtrips")
def list_roadtrips(owner: str = Depends(get_owner)) -> dict:
    with connect() as c:
        rows = c.execute("SELECT id, title, payload_json, created_at FROM road_trips WHERE owner=? ORDER BY id DESC", (owner,)).fetchall()
    return {"items": [{"id": r["id"], "title": r["title"], "created_at": r["created_at"], **json.loads(r["payload_json"])} for r in rows]}


@router.delete("/roadtrips/{rid}", status_code=204)
def delete_roadtrip(rid: int, owner: str = Depends(get_owner)) -> Response:
    with connect() as c:
        if c.execute("DELETE FROM road_trips WHERE id=? AND owner=?", (rid, owner)).rowcount == 0:
            raise HTTPException(404, "Not found.")
    return Response(status_code=204)


class SaveSearch(BaseModel):
    kind: Literal["hotel", "bus", "train", "flight"]
    title: str = Field(min_length=1, max_length=100)
    params: dict[str, Any]


@router.post("/searches", status_code=201)
def save_search(body: SaveSearch, owner: str = Depends(get_owner)) -> dict:
    payload = json.dumps(body.params)
    if len(payload) > 4000:
        raise HTTPException(413, "Search is too large to save.")
    with connect() as c:
        cur = c.execute("INSERT INTO saved_searches (owner, kind, title, params_json, created_at) VALUES (?,?,?,?,?)", (owner, body.kind, body.title.strip(), payload, _now()))
    return {"id": cur.lastrowid}


@router.get("/searches")
def list_searches(kind: str = Query("", pattern="^(|hotel|bus|train|flight)$"), owner: str = Depends(get_owner)) -> dict:
    with connect() as c:
        rows = c.execute("SELECT * FROM saved_searches WHERE owner=? AND (?='' OR kind=?) ORDER BY id DESC LIMIT 100", (owner, kind, kind)).fetchall()
    return {"items": [{"id": r["id"], "kind": r["kind"], "title": r["title"], "params": json.loads(r["params_json"]), "created_at": r["created_at"]} for r in rows]}


@router.delete("/searches/{sid}", status_code=204)
def delete_search(sid: int, owner: str = Depends(get_owner)) -> Response:
    with connect() as c:
        if c.execute("DELETE FROM saved_searches WHERE id=? AND owner=?", (sid, owner)).rowcount == 0:
            raise HTTPException(404, "Not found.")
    return Response(status_code=204)


# ---------- the user's own log of bookings they made on other websites ----------
class ExternalBooking(BaseModel):
    category: Literal["hotel", "car", "bus", "train", "flight"]
    title: str = Field(min_length=2, max_length=120)
    provider: str = Field(default="", max_length=60)
    from_location: str = Field(default="", max_length=80)
    to_location: str = Field(default="", max_length=80)
    travel_date: str | None = Field(default=None, pattern=DATE)
    amount_inr: int = Field(default=0, ge=0, le=10_000_000)
    reference_from_provider: str = Field(default="", max_length=60)


@router.post("/bookings/external", status_code=201)
def log_external(body: ExternalBooking, user: dict = Depends(get_current_user)) -> dict:
    """Records something you booked on ANOTHER site. It is never shown as confirmed, and it is not counted as platform revenue."""
    ref = "EXT-" + secrets.token_hex(4).upper()
    with connect() as c:
        cur = c.execute("""INSERT INTO bookings (reference, user_id, category, source, status, payment_status, title, from_location, to_location, travel_date,
                           amount_inr, provider, provider_ref, booked_at) VALUES (?,?,?,'external_referral','pending','unpaid',?,?,?,?,?,?,?,?)""",
                        (ref, user["id"], body.category, body.title.strip(), body.from_location, body.to_location, body.travel_date, body.amount_inr, body.provider,
                         body.reference_from_provider, _now()))
    return {"id": cur.lastrowid, "reference": ref, "source": "external_referral",
            "note": "Saved as your own record. It is not verified or confirmed by this app."}


@router.get("/bookings")
def my_bookings(category: str = Query("", pattern="^(|hotel|car|bus|train|flight)$"), user: dict = Depends(get_current_user)) -> dict:
    with connect() as c:
        rows = c.execute("""SELECT id, reference, category, source, status, title, provider, from_location, to_location, travel_date, amount_inr, booked_at
                            FROM bookings WHERE user_id=? AND (?='' OR category=?) ORDER BY id DESC""", (user["id"], category, category)).fetchall()
    return {"items": [dict(r) for r in rows], "note": "Entries marked external_referral were booked on another website and are not verified here."}


@router.delete("/bookings/{bid}", status_code=204)
def delete_my_record(bid: int, user: dict = Depends(get_current_user)) -> Response:
    with connect() as c:
        if c.execute("DELETE FROM bookings WHERE id=? AND user_id=? AND source='external_referral'", (bid, user["id"])).rowcount == 0:
            raise HTTPException(404, "Not found, or it is not one of your own records.")
    return Response(status_code=204)


@router.get("/my/overview")
def overview(user: dict = Depends(get_current_user)) -> dict:
    owner = f"user-{user['id']}"
    with connect() as c:
        one = lambda sql, a: c.execute(sql, a).fetchone()[0]                          # noqa: E731
        cats = {r["category"]: r["n"] for r in c.execute("SELECT category, COUNT(*) n FROM bookings WHERE user_id=? GROUP BY category", (user["id"],))}
        return {"trips": one("SELECT COUNT(*) FROM trips WHERE session_id=?", (owner,)), "bookings_by_category": cats,
                "road_trips": one("SELECT COUNT(*) FROM road_trips WHERE owner=?", (owner,)), "saved_searches": one("SELECT COUNT(*) FROM saved_searches WHERE owner=?", (owner,)),
                "wishlist": one("SELECT COUNT(*) FROM wishlist WHERE owner=?", (owner,)), "albums": one("SELECT COUNT(*) FROM memory_albums WHERE user_id=?", (user["id"],)),
                "memory_files": one("SELECT COUNT(*) FROM memory_media WHERE user_id=?", (user["id"],)),
                "estimated_spend_inr": one("SELECT COALESCE(SUM(est_total_inr),0) FROM trips WHERE session_id=? AND status!='cancelled'", (owner,)),
                "payments": {"available": False, "note": "This app does not process payments, so there is nothing to show here."}}
