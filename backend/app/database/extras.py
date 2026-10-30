"""Extra tables added by the premium upgrade. Uses CREATE TABLE IF NOT EXISTS, so existing data is untouched."""
from __future__ import annotations

from .db import connect


def init_extras() -> None:
    with connect() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS places (
            id TEXT PRIMARY KEY, slug TEXT NOT NULL, name TEXT NOT NULL, name_lower TEXT NOT NULL,
            state TEXT NOT NULL, state_slug TEXT NOT NULL, kind TEXT NOT NULL,
            tags TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
            season TEXT NOT NULL, months TEXT NOT NULL, summary TEXT NOT NULL, search_text TEXT NOT NULL,
            featured INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1)""")
        c.execute("CREATE INDEX IF NOT EXISTS idx_places_state ON places(state_slug)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_places_slug ON places(state_slug, slug)")
        c.execute("""CREATE TABLE IF NOT EXISTS wishlist (
            owner TEXT NOT NULL, place_id TEXT NOT NULL, created_at TEXT NOT NULL,
            PRIMARY KEY (owner, place_id))""")
        c.execute("""CREATE TABLE IF NOT EXISTS user_prefs (
            user_id INTEGER PRIMARY KEY, prefs_json TEXT NOT NULL)""")
        c.execute("""CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, message TEXT NOT NULL,
            place_id TEXT, email TEXT, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new')""")
        c.execute("""CREATE TABLE IF NOT EXISTS shares (
            token TEXT PRIMARY KEY, trip_id INTEGER NOT NULL, owner TEXT NOT NULL, created_at TEXT NOT NULL)""")
