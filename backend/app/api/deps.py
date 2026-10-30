"""Shared FastAPI dependencies: guest session id and a small in-memory rate limiter."""
from __future__ import annotations

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
    if len(window) >= 10:
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait a minute.")
    window.append(now)


def _user_from_header(authorization: str | None) -> dict | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    user_id = auth.decode_token(token) if scheme.lower() == "bearer" else None
    user = db.get_user_by_id(user_id) if user_id else None
    if user is None:
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
