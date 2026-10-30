"""HTTP endpoints. Handlers stay thin; real work lives in services/, tools/ and agents/."""
from __future__ import annotations

import logging
import sqlite3
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from ..agents import demo_agent, travel_agent
from ..config import settings
from ..database import db
from ..schemas.schemas import (AuthResponse, ChatRequest, ChatResponse, LoginRequest, RegisterRequest,
                               SaveTripRequest, TripPlanRequest, TripRecord, UserOut)
from ..services import auth, catalog, images, planner, weather
from .deps import get_current_user, get_owner, rate_limit, strict_rate_limit

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api", dependencies=[Depends(rate_limit)])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "agent_mode": "adk" if settings.gemini_enabled and travel_agent.adk_available() else "demo",
            "adk_installed": travel_agent.adk_available(), "gemini_key_set": settings.gemini_enabled,
            "photos_provider": "wikimedia-commons", "weather_provider": "open-meteo"}


@router.get("/destinations")
def list_destinations(q: str = Query("", max_length=80), interest: str = Query("", max_length=30),
                      state: str = Query("", max_length=40)) -> dict:
    found = catalog.find_destinations(q, interest, state)
    return {"count": len(found), "note": "Sample catalogue, not all of India.",
            "destinations": [catalog.summary(d) for d in found]}


@router.get("/destinations/{destination_id}")
def destination_details(destination_id: str) -> dict:
    dest = catalog.get_destination(destination_id)
    if dest is None:
        raise HTTPException(404, "Destination not found.")
    return {**catalog.summary(dest), "attractions": dest["attractions"], "food": dest["food"], "tips": dest["tips"]}


@router.get("/destinations/{destination_id}/photos")
def destination_photos(destination_id: str, limit: int = Query(3, ge=1, le=12)) -> dict:
    try:
        return images.get_photos(destination_id, limit)
    except ValueError:
        raise HTTPException(404, "Destination not found.")


@router.get("/destinations/{destination_id}/weather")
def destination_weather(destination_id: str, days: int = Query(7, ge=1, le=16)) -> dict:
    try:
        return weather.get_forecast(destination_id, days)
    except ValueError:
        raise HTTPException(404, "Destination not found.")


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    session_id = body.session_id or uuid.uuid4().hex
    if settings.gemini_enabled and travel_agent.adk_available():
        try:
            out = await travel_agent.run_agent(body.message, session_id)
            return ChatResponse(reply=out["reply"], session_id=session_id, mode="adk",
                                destination_ids=out["destination_ids"],
                                follow_ups=["Show the day-by-day plan", "Make it cheaper", "What is the weather like?"])
        except Exception as exc:  # noqa: BLE001 - logged, then falls back visibly (never silent)
            log.exception("ADK agent failed")
            fallback = await run_in_threadpool(demo_agent.reply_to, body.message)
            fallback["notice"] = f"The AI agent failed ({type(exc).__name__}), so this is a demo-mode reply."
            return ChatResponse(session_id=session_id, mode="demo", **fallback)
    out = await run_in_threadpool(demo_agent.reply_to, body.message)
    return ChatResponse(session_id=session_id, mode="demo", **out)


@router.post("/trips/plan")
def plan_trip(body: TripPlanRequest) -> dict:
    try:
        return planner.build_plan(body.destination_id, body.days, body.adults, body.children, body.origin_city,
                                  body.budget_inr, body.style, body.transport_mode, body.interests,
                                  body.excluded_activities, body.pace, body.start_date,
                                  body.accessibility_needs, body.special_requirements)
    except ValueError as exc:
        raise HTTPException(422, str(exc))


@router.post("/trips", response_model=TripRecord, status_code=201)
def save_trip(body: SaveTripRequest, session_id: str = Depends(get_owner)) -> dict:
    return db.save_trip(session_id, body.title, body.plan)


@router.get("/trips", response_model=list[TripRecord])
def list_trips(session_id: str = Depends(get_owner)) -> list[dict]:
    return db.list_trips(session_id)


@router.get("/trips/{trip_id}", response_model=TripRecord)
def get_trip(trip_id: int, session_id: str = Depends(get_owner)) -> dict:
    trip = db.get_trip(session_id, trip_id)
    if trip is None:
        raise HTTPException(404, "Trip not found.")
    return trip


@router.delete("/trips/{trip_id}", status_code=204)
def delete_trip(trip_id: int, session_id: str = Depends(get_owner)) -> Response:
    if not db.delete_trip(session_id, trip_id):
        raise HTTPException(404, "Trip not found.")
    return Response(status_code=204)


def _public(user: dict) -> dict:
    return {"id": user["id"], "name": user["name"], "email": user["email"]}


@router.post("/auth/register", response_model=AuthResponse, status_code=201,
             dependencies=[Depends(strict_rate_limit)])
def register(body: RegisterRequest) -> dict:
    try:
        user = db.create_user(body.email.strip().lower(), body.name.strip(), auth.hash_password(body.password))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "An account with this email already exists. Try logging in.")
    return {"token": auth.create_token(user["id"]), "user": _public(user)}


@router.post("/auth/login", response_model=AuthResponse, dependencies=[Depends(strict_rate_limit)])
def login(body: LoginRequest) -> dict:
    user = db.get_user_by_email(body.email.strip().lower())
    stored = user["password_hash"] if user else auth.DUMMY_HASH
    ok = auth.verify_password(body.password, stored)
    if not user or not ok:        # same message for both cases, so attackers cannot find which emails exist
        raise HTTPException(401, "Incorrect email or password.")
    return {"token": auth.create_token(user["id"]), "user": _public(user)}


@router.get("/auth/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)) -> dict:
    return _public(user)
