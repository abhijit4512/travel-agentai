"""Admin: manage the car catalogue, fuel prices, view integration status and moderate PUBLIC albums. Private albums are never visible here."""
from __future__ import annotations

import json
import os
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ..database.db import connect
from ..services import admin as svc
from ..services import fuel
from .deps import client_ip, rate_limit, require_admin

router = APIRouter(prefix="/api/admin", dependencies=[Depends(rate_limit)])


class VehicleIn(BaseModel):
    id: str = Field(pattern="^[a-z0-9-]{2,40}$")
    category: Literal["hatchback", "sedan", "suv", "premium_suv", "luxury", "electric", "tempo_traveller"]
    name: str = Field(min_length=2, max_length=80)
    model: str = Field(default="", max_length=40)
    fuel_type: Literal["petrol", "diesel", "cng", "electric"]
    mileage: float | None = Field(default=None, gt=0, le=100)
    kwh_per_100km: float | None = Field(default=None, gt=0, le=100)
    seats: int = Field(ge=1, le=60)
    transmission: str = Field(max_length=40)
    rent_per_day_inr: int = Field(ge=0, le=500000)
    features: list[str] = Field(default_factory=list, max_length=12)
    note: str = Field(default="Indicative figures. Confirm with the rental company.", max_length=200)
    active: bool = True


@router.get("/catalog/vehicles")
def vehicles(admin: dict = Depends(require_admin)) -> dict:
    from ..services import roadtrip
    return {"items": roadtrip.list_vehicles(only_active=False)}


@router.post("/catalog/vehicles")
def upsert_vehicle(body: VehicleIn, request: Request, admin: dict = Depends(require_admin)) -> dict:
    if body.fuel_type == "electric" and not body.kwh_per_100km:
        raise HTTPException(422, "Electric vehicles need kWh per 100 km.")
    if body.fuel_type != "electric" and not body.mileage:
        raise HTTPException(422, "Petrol, diesel and CNG vehicles need a mileage.")
    with connect() as c:
        c.execute("""INSERT OR REPLACE INTO vehicles (id, category, name, model, fuel_type, mileage, kwh_per_100km, seats, transmission, rent_per_day_inr, features, note, active)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""", (body.id, body.category, body.name, body.model, body.fuel_type, body.mileage, body.kwh_per_100km, body.seats,
                                                          body.transmission, body.rent_per_day_inr, json.dumps(body.features), body.note, 1 if body.active else 0))
    svc.audit(admin, "save_vehicle", "vehicle", body.id, body.name, client_ip(request))
    return {"ok": True}


@router.delete("/catalog/vehicles/{vid}")
def hide_vehicle(vid: str, request: Request, admin: dict = Depends(require_admin)) -> dict:
    with connect() as c:
        if c.execute("UPDATE vehicles SET active=0 WHERE id=?", (vid,)).rowcount == 0:
            raise HTTPException(404, "Vehicle not found.")
    svc.audit(admin, "hide_vehicle", "vehicle", vid, "", client_ip(request))
    return {"ok": True}


class FuelIn(BaseModel):
    city: str = Field(min_length=2, max_length=40)
    fuel: Literal["petrol", "diesel", "cng", "electric"]
    price_inr: float = Field(gt=0, lt=1000)


@router.get("/catalog/fuel-prices")
def fuel_prices(admin: dict = Depends(require_admin)) -> dict:
    return {"items": fuel.list_prices(), "provider_configured": bool(os.getenv("FUEL_PRICE_API_URL"))}


@router.put("/catalog/fuel-prices")
def set_fuel_price(body: FuelIn, request: Request, admin: dict = Depends(require_admin)) -> dict:
    fuel.set_price(body.city, body.fuel, body.price_inr)
    svc.audit(admin, "set_fuel_price", "fuel", f"{body.city}/{body.fuel}", str(body.price_inr), client_ip(request))
    return {"ok": True}


@router.get("/integrations")
def integrations(admin: dict = Depends(require_admin)) -> dict:
    def s(ok: bool, text: str) -> dict:
        return {"status": "configured" if ok else "not_configured", "detail": text}
    return {"items": {
        "gemini_ai": s(bool(os.getenv("GOOGLE_API_KEY")), "Real AI agent and memory text helpers"),
        "fuel_price_provider": s(bool(os.getenv("FUEL_PRICE_API_URL")), "Live fuel prices. Without it, manual reference prices are used and labelled."),
        "openstreetmap_overpass": {"status": "available", "detail": "Free, no key. Hotels, restaurants, petrol pumps, EV chargers."},
        "wikimedia_photos": {"status": "available", "detail": "Free, no key."}, "open_meteo_weather": {"status": "available", "detail": "Free, no key."},
        "file_storage": {"status": "local_disk", "detail": f"Uploads folder: {os.getenv('UPLOAD_DIR', 'uploads')}. Use S3 for production."},
        "hotel_booking_provider": {"status": "not_integrated", "detail": "Needs a partner agreement. External links are used instead."},
        "bus_booking_provider": {"status": "not_integrated", "detail": "Needs a partner agreement. External links are used instead."},
        "railway_provider": {"status": "not_integrated", "detail": "Needs authorised access. Official IRCTC links are used instead."},
        "flight_provider": {"status": "not_integrated", "detail": "Needs a partner agreement. External links are used instead."},
        "payment_gateway": {"status": "not_integrated", "detail": "Needs a merchant account. No payments are processed."},
    }}


@router.get("/memories/public")
def public_content(admin: dict = Depends(require_admin)) -> dict:
    with connect() as c:
        rows = c.execute("""SELECT a.id, a.title, a.location_name, a.updated_at, u.name AS owner_name,
                            (SELECT COUNT(*) FROM memory_media m WHERE m.album_id=a.id) AS files FROM memory_albums a JOIN users u ON u.id=a.user_id
                            WHERE a.visibility='public' ORDER BY a.updated_at DESC LIMIT 200""").fetchall()
    return {"items": [dict(r) for r in rows], "note": "Only public albums are listed. Private and shared albums are not visible to admins."}


@router.post("/memories/{album_id}/unpublish")
def unpublish(album_id: int, request: Request, admin: dict = Depends(require_admin)) -> dict:
    with connect() as c:
        r = c.execute("UPDATE memory_albums SET visibility='private', share_token=NULL WHERE id=? AND visibility='public'", (album_id,))
        if r.rowcount == 0:
            raise HTTPException(404, "No public album with that id.")
    svc.audit(admin, "unpublish_album", "album", album_id, "", client_ip(request))
    return {"ok": True}
