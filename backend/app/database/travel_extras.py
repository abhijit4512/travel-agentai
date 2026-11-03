"""Tables for cars, fuel, road trips, saved searches, OpenStreetMap cache and travel memories. Safe to run on every start."""
from __future__ import annotations

from .db import connect


def init_travel_tables() -> None:
    with connect() as c:
        # bookings table is shared with the admin module (identical definition, created only if missing)
        c.execute("""CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT NOT NULL UNIQUE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
            category TEXT NOT NULL CHECK (category IN ('hotel','car','bus','train','flight')),
            source TEXT NOT NULL DEFAULT 'platform' CHECK (source IN ('platform','external_referral')),
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed','failed')),
            payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded','failed')),
            title TEXT NOT NULL, from_location TEXT, to_location TEXT, travel_date TEXT,
            amount_inr INTEGER NOT NULL DEFAULT 0, provider TEXT, provider_ref TEXT, booked_at TEXT NOT NULL, cancelled_at TEXT)""")
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)")
        c.execute("""CREATE TABLE IF NOT EXISTS vehicles (
            id TEXT PRIMARY KEY, category TEXT NOT NULL, name TEXT NOT NULL, model TEXT NOT NULL DEFAULT '',
            fuel_type TEXT NOT NULL CHECK (fuel_type IN ('petrol','diesel','cng','electric')),
            mileage REAL, kwh_per_100km REAL, seats INTEGER NOT NULL, transmission TEXT NOT NULL,
            rent_per_day_inr INTEGER NOT NULL, features TEXT NOT NULL DEFAULT '[]', note TEXT NOT NULL DEFAULT '',
            active INTEGER NOT NULL DEFAULT 1)""")
        c.execute("""CREATE TABLE IF NOT EXISTS fuel_prices (
            city TEXT NOT NULL, fuel TEXT NOT NULL, price_inr REAL NOT NULL, updated_at TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'manual_reference', PRIMARY KEY (city, fuel))""")
        c.execute("""CREATE TABLE IF NOT EXISTS road_trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, title TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL)""")
        c.execute("CREATE INDEX IF NOT EXISTS idx_roadtrips_owner ON road_trips(owner)")
        c.execute("""CREATE TABLE IF NOT EXISTS saved_searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL,
            kind TEXT NOT NULL CHECK (kind IN ('hotel','bus','train','flight')), title TEXT NOT NULL, params_json TEXT NOT NULL, created_at TEXT NOT NULL)""")
        c.execute("CREATE INDEX IF NOT EXISTS idx_searches_owner ON saved_searches(owner, kind)")
        c.execute("CREATE TABLE IF NOT EXISTS osm_cache (key TEXT PRIMARY KEY, payload_json TEXT NOT NULL, fetched_at TEXT NOT NULL)")
        c.execute("""CREATE TABLE IF NOT EXISTS memory_albums (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', story TEXT NOT NULL DEFAULT '',
            location_name TEXT NOT NULL DEFAULT '', place_id TEXT, lat REAL, lng REAL, travel_date TEXT,
            visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','shared','public')),
            share_token TEXT UNIQUE, cover_media_id INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)""")
        c.execute("CREATE INDEX IF NOT EXISTS idx_albums_user ON memory_albums(user_id, travel_date)")
        c.execute("""CREATE TABLE IF NOT EXISTS memory_media (
            id INTEGER PRIMARY KEY AUTOINCREMENT, album_id INTEGER NOT NULL REFERENCES memory_albums(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            kind TEXT NOT NULL CHECK (kind IN ('photo','video','document')), original_name TEXT NOT NULL, stored_name TEXT NOT NULL,
            mime TEXT NOT NULL, size_bytes INTEGER NOT NULL, caption TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)""")
        c.execute("CREATE INDEX IF NOT EXISTS idx_media_album ON memory_media(album_id)")
