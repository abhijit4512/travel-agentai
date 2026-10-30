"""SQLite storage for saved trips (stdlib sqlite3, parameterised queries only).
To move to PostgreSQL later, replace this module with SQLAlchemy or psycopg code that keeps the same functions."""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from ..config import settings


def _db_path() -> str:
    url = settings.database_url
    if not url.startswith("sqlite:///"):
        raise RuntimeError("Only sqlite:/// URLs are supported in this version.")
    return url.removeprefix("sqlite:///")


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    path = _db_path()
    if path != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with connect() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            title TEXT NOT NULL,
            plan_json TEXT NOT NULL,
            created_at TEXT NOT NULL)""")
        c.execute("CREATE INDEX IF NOT EXISTS idx_trips_session ON trips(session_id)")
        c.execute("""CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL)""")


def _row(r: sqlite3.Row) -> dict[str, Any]:
    return {"id": r["id"], "title": r["title"], "created_at": r["created_at"], "plan": json.loads(r["plan_json"])}


def save_trip(session_id: str, title: str, plan: dict[str, Any]) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    with connect() as c:
        cur = c.execute("INSERT INTO trips (session_id, title, plan_json, created_at) VALUES (?,?,?,?)",
                        (session_id, title, json.dumps(plan), now))
        return {"id": cur.lastrowid, "title": title, "created_at": now, "plan": plan}


def list_trips(session_id: str) -> list[dict[str, Any]]:
    with connect() as c:
        rows = c.execute("SELECT * FROM trips WHERE session_id=? ORDER BY id DESC", (session_id,)).fetchall()
    return [_row(r) for r in rows]


def get_trip(session_id: str, trip_id: int) -> dict[str, Any] | None:
    with connect() as c:
        r = c.execute("SELECT * FROM trips WHERE id=? AND session_id=?", (trip_id, session_id)).fetchone()
    return _row(r) if r else None


def delete_trip(session_id: str, trip_id: int) -> bool:
    with connect() as c:
        return c.execute("DELETE FROM trips WHERE id=? AND session_id=?", (trip_id, session_id)).rowcount > 0


def create_user(email: str, name: str, password_hash: str) -> dict[str, Any]:
    """Raises sqlite3.IntegrityError if the email already exists."""
    now = datetime.now(timezone.utc).isoformat()
    with connect() as c:
        cur = c.execute("INSERT INTO users (email, name, password_hash, created_at) VALUES (?,?,?,?)",
                        (email, name, password_hash, now))
        return {"id": cur.lastrowid, "email": email, "name": name}


def get_user_by_email(email: str) -> dict[str, Any] | None:
    with connect() as c:
        r = c.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    return dict(r) if r else None


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    with connect() as c:
        r = c.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return dict(r) if r else None
