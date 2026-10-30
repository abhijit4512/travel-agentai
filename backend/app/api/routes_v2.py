"""Endpoints added by the premium upgrade: places search, states, collections, wishlist, preferences,
feedback, trip sharing, budget recalculation and sitemap. Existing /api routes are unchanged."""
from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from ..config import settings
from ..database import db
from ..database.db import connect
from ..schemas.schemas import BudgetRequest, FeedbackIn, PreferencesIn, WishlistAdd
from ..services import budget as budget_service
from ..services import places
from ..services.places_seed import PLACE_BY_ID, PLACES
from .deps import get_current_user, get_owner, rate_limit, strict_rate_limit

router = APIRouter(prefix="/api", dependencies=[Depends(rate_limit)])


# ---------- places ----------
@router.get("/places")
def search_places(q: str = Query("", max_length=80), state: str = Query("", max_length=60),
                  tag: str = Query("", max_length=30), month: int | None = Query(None, ge=1, le=12),
                  ids: str = Query("", max_length=600), featured: bool = False,
                  sort: str = Query("relevance", pattern="^(relevance|name)$"),
                  page: int = Query(1, ge=1, le=500), page_size: int = Query(12, ge=1, le=places.PAGE_MAX)) -> dict:
    id_list = [i for i in ids.split(",") if i][:40]
    return places.search(q, state, tag, None, None, month, id_list or None, featured, sort, page, page_size)


@router.get("/places/suggest")
def suggest(q: str = Query("", max_length=60)) -> dict:
    return {"suggestions": places.suggest(q)}


@router.get("/places/{state_slug}/{slug}")
def place_detail(state_slug: str, slug: str) -> dict:
    p = places.get_by_slug(state_slug, slug)
    if p is None:
        raise HTTPException(404, "Destination not found.")
    return places.detail(p)


@router.get("/nearby/{place_id}")
def place_nearby(place_id: str, radius_km: int = Query(120, ge=5, le=500)) -> dict:
    if place_id not in PLACE_BY_ID:
        raise HTTPException(404, "Destination not found.")
    return {"items": places.nearby(place_id, radius_km, 12)}


@router.get("/states")
def states() -> dict:
    return {"states": places.list_states()}


@router.get("/tags")
def tags() -> dict:
    return {"tags": places.tag_counts()}


@router.get("/weekend")
def weekend(origin: str = Query("Hyderabad", max_length=60), max_km: int = Query(400, ge=20, le=2500),
            tag: str = Query("", max_length=30)) -> dict:
    try:
        return {"items": places.from_city(origin, max_km, tag), "distance_kind": "straight_line_estimate",
                "note": "Distances are straight-line estimates, not road distances or travel times."}
    except ValueError as exc:
        raise HTTPException(422, str(exc))


@router.get("/collections")
def collections() -> dict:
        return {"collections": [{k: c[k] for k in ("slug", "title", "blurb", "cover")} for c in places.COLLECTIONS]}


@router.get("/collections/{slug}")
def collection(slug: str, page: int = Query(1, ge=1), page_size: int = Query(24, ge=1, le=places.PAGE_MAX)) -> dict:
    res = places.collection_items(slug, page, page_size)
    if res is None:
        raise HTTPException(404, "Collection not found.")
    return res


# ---------- budget recalculation (after the user edits an itinerary) ----------
@router.post("/budget/estimate")
def budget_estimate(body: BudgetRequest) -> dict:
    try:
        return budget_service.estimate_budget(body.destination_id, body.days, body.adults, body.children,
                                              body.origin_city, body.style, body.transport_mode, body.budget_inr,
                                              sightseeing_fees_per_adult=body.sightseeing_fees_per_adult)
    except ValueError as exc:
        raise HTTPException(422, str(exc))


# ---------- wishlist (guest session or logged-in account) ----------
@router.get("/wishlist")
def wishlist(owner: str = Depends(get_owner)) -> dict:
    with connect() as c:
        rows = c.execute("SELECT place_id FROM wishlist WHERE owner=? ORDER BY created_at DESC", (owner,)).fetchall()
    ids = [r["place_id"] for r in rows]
    items = places.search(ids=ids, page_size=places.PAGE_MAX)["items"] if ids else []
    order = {pid: i for i, pid in enumerate(ids)}
    return {"ids": ids, "items": sorted(items, key=lambda x: order.get(x["id"], 0))}


@router.post("/wishlist", status_code=201)
def wishlist_add(body: WishlistAdd, owner: str = Depends(get_owner)) -> dict:
    if body.place_id not in PLACE_BY_ID:
        raise HTTPException(404, "Destination not found.")
    with connect() as c:
        c.execute("INSERT OR IGNORE INTO wishlist (owner, place_id, created_at) VALUES (?,?,?)",
                  (owner, body.place_id, datetime.now(timezone.utc).isoformat()))
    return {"place_id": body.place_id, "saved": True}


@router.delete("/wishlist/{place_id}", status_code=204)
def wishlist_remove(place_id: str, owner: str = Depends(get_owner)) -> Response:
    with connect() as c:
        c.execute("DELETE FROM wishlist WHERE owner=? AND place_id=?", (owner, place_id))
    return Response(status_code=204)


# ---------- preferences (logged-in users only) ----------
@router.get("/me/preferences")
def get_preferences(user: dict = Depends(get_current_user)) -> dict:
    with connect() as c:
        r = c.execute("SELECT prefs_json FROM user_prefs WHERE user_id=?", (user["id"],)).fetchone()
    return json.loads(r["prefs_json"]) if r else PreferencesIn().model_dump()


@router.put("/me/preferences")
def put_preferences(body: PreferencesIn, user: dict = Depends(get_current_user)) -> dict:
    with connect() as c:
        c.execute("INSERT OR REPLACE INTO user_prefs (user_id, prefs_json) VALUES (?,?)",
                  (user["id"], json.dumps(body.model_dump())))
    return body.model_dump()


# ---------- feedback ----------
@router.post("/feedback", status_code=201, dependencies=[Depends(strict_rate_limit)])
def feedback(body: FeedbackIn) -> dict:
    with connect() as c:
        c.execute("INSERT INTO feedback (kind, message, place_id, email, created_at) VALUES (?,?,?,?,?)",
                  (body.kind, body.message.strip(), body.place_id, body.email, datetime.now(timezone.utc).isoformat()))
    return {"received": True}


# ---------- sharing: anyone with the link can read the plan, nothing about the owner ----------
@router.post("/trips/{trip_id}/share", status_code=201)
def share_trip(trip_id: int, owner: str = Depends(get_owner)) -> dict:
    if db.get_trip(owner, trip_id) is None:
        raise HTTPException(404, "Trip not found.")
    with connect() as c:
        row = c.execute("SELECT token FROM shares WHERE trip_id=? AND owner=?", (trip_id, owner)).fetchone()
        token = row["token"] if row else secrets.token_urlsafe(12)
        if not row:
            c.execute("INSERT INTO shares (token, trip_id, owner, created_at) VALUES (?,?,?,?)",
                      (token, trip_id, owner, datetime.now(timezone.utc).isoformat()))
    return {"token": token, "path": f"/shared/{token}"}


@router.delete("/trips/{trip_id}/share", status_code=204)
def unshare_trip(trip_id: int, owner: str = Depends(get_owner)) -> Response:
    with connect() as c:
        c.execute("DELETE FROM shares WHERE trip_id=? AND owner=?", (trip_id, owner))
    return Response(status_code=204)


@router.get("/share/{token}")
def shared_trip(token: str) -> dict:
    with connect() as c:
        row = c.execute("SELECT s.owner, s.trip_id, t.title, t.plan_json, t.created_at FROM shares s "
                        "JOIN trips t ON t.id = s.trip_id WHERE s.token=?", (token,)).fetchone()
    if row is None:
        raise HTTPException(404, "This shared trip was not found or sharing was turned off.")
    return {"title": row["title"], "created_at": row["created_at"], "plan": json.loads(row["plan_json"])}


# ---------- sitemap ----------
@router.get("/sitemap.xml")
def sitemap() -> Response:
    base = settings.public_url
    urls = [f"{base}{p}" for p in ("/", "/explore", "/states", "/collections", "/plan", "/map", "/weekend", "/seasons",
                                   "/compare", "/about", "/help")]
    urls += [f"{base}/states/{s['slug']}" for s in places.list_states()]
    urls += [f"{base}/collections/{c['slug']}" for c in places.COLLECTIONS]
    urls += [f"{base}/destinations/{p['state_slug']}/{p['slug']}" for p in PLACES]
    body = "".join(f"<url><loc>{escape(u)}</loc></url>" for u in urls)
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>'
    return Response(content=xml, media_type="application/xml")
