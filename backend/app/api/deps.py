"""Shared FastAPI dependencies: guest session id and a small in-memory rate limiter."""
from __future__ import annotations

import os
import re
import time
from collections import defaultdict, deque

from fastapi import Header, HTTPException, Request

from ..config import settings

SESSION_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
_hits: dict[str, deque] = defaultdict(deque)


def get_session_id(x_session_id: str | None = Header(default=None)) -> str:
    if not x_session_id or not SESSION_RE.match(x_session_id):
        raise HTTPException(status_code=400, detail="Missing or invalid X-Session-Id header.")
    return x_session_id


def rate_limit(request: Request) -> None:
    """Allow `rate_limit_per_minute` calls per client IP per minute (single-process only)."""
    key = request.client.host if request.client else "unknown"
    now, window = time.monotonic(), _hits[key]
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= settings.rate_limit_per_minute:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute and try again.")
    window.append(now)

from ..database import db
from ..services import auth

_auth_hits: dict[str, deque] = defaultdict(deque)


def strict_rate_limit(request: Request) -> None:
    """Stricter limit for login, register and feedback: 10 tries per minute per IP."""
    key = request.client.host if request.client else "unknown"
    now, window = time.monotonic(), _auth_hits[key]
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= int(os.getenv("AUTH_RATE_LIMIT_PER_MINUTE", "10")):
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait a minute.")
    window.append(now)


def _user_from_header(authorization: str | None) -> dict | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    user_id = auth.decode_token(token) if scheme.lower() == "bearer" else None
    user = db.get_user_by_id(user_id) if user_id else None
    if user is None or not user.get("is_active", 1):          # deactivated accounts stop working immediately
        raise HTTPException(status_code=401, detail="Your login has expired. Please log in again.")
    return user


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    user = _user_from_header(authorization)
    if user is None:
        raise HTTPException(status_code=401, detail="Please log in.")
    return user


def get_owner(authorization: str | None = Header(default=None),
              x_session_id: str | None = Header(default=None)) -> str:
    """Who owns saved data: the logged-in user if there is a valid token, otherwise the guest session."""
    user = _user_from_header(authorization)
    if user:
        return f"user-{user['id']}"
    return get_session_id(x_session_id)


def client_ip(request: Request) -> str:
    return request.client.host if request.client else ""


def require_admin(authorization: str | None = Header(default=None)) -> dict:
    """Every admin API depends on this. It needs an admin-scoped token AND an active admin role in the database."""
    scheme, _, token = (authorization or "").partition(" ")
    decoded = auth.decode_token_scoped(token) if scheme.lower() == "bearer" else None
    if decoded is None:
        raise HTTPException(status_code=401, detail="Admin login required.")
    user_id, scope = decoded
    user = db.get_user_by_id(user_id)
    if scope != "admin" or user is None or user.get("role") != "admin" or not user.get("is_active", 1):
        raise HTTPException(status_code=403, detail="You do not have access to this area.")
    return user
