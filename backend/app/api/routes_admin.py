"""Admin authentication and management API routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

from ..database import db
from ..services import admin as svc
from ..services import auth
from .deps import client_ip, rate_limit, require_admin, strict_rate_limit

router = APIRouter(prefix="/api/admin", dependencies=[Depends(rate_limit)])


class AdminLogin(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class UserStatusUpdate(BaseModel):
    active: bool
    reason: str = Field(min_length=5, max_length=500)


class NotificationRead(BaseModel):
    ids: list[int] | None = Field(default=None, max_length=200)


def _date_window(period: str, start: str | None, end: str | None):
    try:
        return svc.date_range(period, start, end)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/login", dependencies=[Depends(strict_rate_limit)])
@router.post("/auth/login", dependencies=[Depends(strict_rate_limit)])
def admin_login(body: AdminLogin) -> dict:
    """Issue an admin-scoped token only to an active admin account."""
    user = db.get_user_by_email(body.email.strip().lower())
    stored_hash = user["password_hash"] if user else auth.DUMMY_HASH
    password_ok = auth.verify_password(body.password, stored_hash)

    if not user or not password_ok:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not user.get("is_active", 1):
        raise HTTPException(status_code=403, detail="This account has been deactivated.")
    if user.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = auth.create_token(user["id"], scope="admin")
    return {
        "token": token,
        "admin": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]},
    }


@router.get("/overview")
@router.get("/stats")
def overview(
    range_name: str = Query("30d", alias="range", pattern="^(today|7d|30d|90d|all|custom)$"),
    period: str | None = Query(None, pattern="^(today|7d|30d|90d|all|custom)$"),
    start: str | None = Query(None),
    end: str | None = Query(None),
    admin: dict = Depends(require_admin),
) -> dict:
    s, e = _date_window(period or range_name, start, end)
    return svc.stats(s, e)


@router.get("/analytics")
def analytics(
    range_name: str = Query("30d", alias="range", pattern="^(today|7d|30d|90d|all|custom)$"),
    period: str | None = Query(None, pattern="^(today|7d|30d|90d|all|custom)$"),
    start: str | None = Query(None),
    end: str | None = Query(None),
    admin: dict = Depends(require_admin),
) -> dict:
    s, e = _date_window(period or range_name, start, end)
    return svc.analytics(s, e)


@router.get("/users")
def users(
    q: str = Query("", max_length=100),
    status: str = Query("", pattern="^(|active|inactive)$"),
    sort: str = Query("newest", pattern="^(newest|oldest|name)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(require_admin),
) -> dict:
    return svc.list_users(q=q, status=status, sort=sort, page=page, size=page_size)


@router.get("/users/{user_id}")
def user_detail(user_id: int, admin: dict = Depends(require_admin)) -> dict:
    result = svc.user_detail(user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="User not found.")
    svc.audit(admin, "view_user", "user", user_id)
    return result


@router.patch("/users/{user_id}/status")
@router.post("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    body: UserStatusUpdate,
    request: Request,
    admin: dict = Depends(require_admin),
) -> dict:
    try:
        return svc.set_user_active(admin, user_id, body.active, body.reason, client_ip(request))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/trips")
def trips(
    q: str = Query("", max_length=100),
    status: str = Query("", max_length=40),
    travel_from: str = Query("", max_length=10),
    travel_to: str = Query("", max_length=10),
    range_name: str = Query("all", alias="range", pattern="^(today|7d|30d|90d|all|custom)$"),
    period: str | None = Query(None, pattern="^(today|7d|30d|90d|all|custom)$"),
    start: str | None = Query(None),
    end: str | None = Query(None),
    sort: str = Query("newest", pattern="^(newest|oldest|travel_date|budget)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(require_admin),
) -> dict:
    s, e = _date_window(period or range_name, start, end)
    return svc.list_trips(q=q, status=status, travel_from=travel_from, travel_to=travel_to,
                          s=s, e=e, sort=sort, page=page, size=page_size)


@router.get("/trips/{trip_id}")
def trip_detail(trip_id: int, admin: dict = Depends(require_admin)) -> dict:
    result = svc.trip_detail(trip_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found.")
    svc.audit(admin, "view_trip", "trip", trip_id)
    return result


@router.get("/bookings")
def bookings(
    category: str = Query("", max_length=20),
    source: str = Query("platform", pattern="^(|platform|external_referral)$"),
    status: str = Query("", max_length=30),
    payment_status: str = Query("", max_length=30),
    q: str = Query("", max_length=100),
    range_name: str = Query("all", alias="range", pattern="^(today|7d|30d|90d|all|custom)$"),
    period: str | None = Query(None, pattern="^(today|7d|30d|90d|all|custom)$"),
    start: str | None = Query(None),
    end: str | None = Query(None),
    travel_from: str = Query("", max_length=10),
    travel_to: str = Query("", max_length=10),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(require_admin),
) -> dict:
    s, e = _date_window(period or range_name, start, end)
    return svc.list_bookings(category=category, source=source, status=status, payment_status=payment_status,
                             q=q, s=s, e=e, travel_from=travel_from, travel_to=travel_to,
                             page=page, size=page_size)


@router.get("/bookings/{booking_id}")
def booking_detail(booking_id: int, admin: dict = Depends(require_admin)) -> dict:
    result = svc.booking_detail(booking_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    return result


@router.get("/notifications")
def notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    admin: dict = Depends(require_admin),
) -> dict:
    return svc.notifications(unread_only=unread_only, limit=limit)


@router.post("/notifications/read")
def mark_notifications_read(body: NotificationRead, admin: dict = Depends(require_admin)) -> dict:
    svc.mark_read(body.ids)
    return {"ok": True}


@router.get("/audit")
def audit_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    admin: dict = Depends(require_admin),
) -> dict:
    return svc.audit_list(page=page, size=page_size)


@router.get("/auth/me")
def admin_me(admin: dict = Depends(require_admin)) -> dict:
    return {"id": admin["id"], "name": admin["name"], "email": admin["email"],
            "last_login_at": admin.get("last_login_at")}


@router.get("/search")
def global_search(q: str = Query(..., min_length=2, max_length=100),
                  admin: dict = Depends(require_admin)) -> dict:
    return {"results": svc.search(q)}


@router.get("/export/{kind}")
@router.get("/reports/{kind}.csv")
def export_report(
    kind: str,
    range_name: str = Query("all", alias="range", pattern="^(today|7d|30d|90d|all|custom)$"),
    period: str | None = Query(None, pattern="^(today|7d|30d|90d|all|custom)$"),
    start: str | None = Query(None),
    end: str | None = Query(None),
    admin: dict = Depends(require_admin),
) -> Response:
    if kind not in {"users", "trips", "bookings"}:
        raise HTTPException(status_code=404, detail="Report not found.")
    s, e = _date_window(period or range_name, start, end)
    content = svc.export_csv(kind, s, e)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="travel-agent-{kind}.csv"'},
    )
