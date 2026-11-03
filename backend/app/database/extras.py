"""
Extra tables for the premium upgrade and the admin module.
Everything uses CREATE TABLE IF NOT EXISTS / ADD COLUMN IF MISSING, so existing users and trips are never touched.
"""
from __future__ import annotations

import json

from .db import connect
from .tripfields import trip_fields


def _add_column(c, table: str, name: str, ddl: str) -> None:
    if name not in {r["name"] for r in c.execute(f"PRAGMA table_info({table})")}:
        c.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")


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
        c.execute("CREATE TABLE IF NOT EXISTS user_prefs (user_id INTEGER PRIMARY KEY, prefs_json TEXT NOT NULL)")
        c.execute("""CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, message TEXT NOT NULL,
            place_id TEXT, email TEXT, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new')""")
        c.execute("""CREATE TABLE IF NOT EXISTS shares (
            token TEXT PRIMARY KEY, trip_id INTEGER NOT NULL, owner TEXT NOT NULL, created_at TEXT NOT NULL)""")

        # ---------- admin module: roles on users ----------
        _add_column(c, "users", "role", "TEXT NOT NULL DEFAULT 'user'")          # 'user' or 'admin'
        _add_column(c, "users", "is_active", "INTEGER NOT NULL DEFAULT 1")
        _add_column(c, "users", "phone", "TEXT")
        _add_column(c, "users", "last_login_at", "TEXT")

        # ---------- admin module: searchable trip columns ----------
        for col, ddl in [("destination_id", "TEXT"), ("destination_name", "TEXT"), ("origin_city", "TEXT"),
                         ("start_date", "TEXT"), ("end_date", "TEXT"), ("travellers", "INTEGER"),
                         ("transport_mode", "TEXT"), ("est_total_inr", "INTEGER"),
                         ("status", "TEXT NOT NULL DEFAULT 'saved'"), ("updated_at", "TEXT")]:
            _add_column(c, "trips", col, ddl)
        c.execute("CREATE INDEX IF NOT EXISTS idx_trips_dest ON trips(destination_id)")
        for r in c.execute("SELECT id, plan_json FROM trips WHERE destination_id IS NULL").fetchall():   # backfill old rows once
            try:
                f = trip_fields(json.loads(r["plan_json"]))
            except (ValueError, TypeError):
                continue
            c.execute("""UPDATE trips SET destination_id=?, destination_name=?, origin_city=?, start_date=?, end_date=?,
                         travellers=?, transport_mode=?, est_total_inr=? WHERE id=?""",
                      (f["destination_id"], f["destination_name"], f["origin_city"], f["start_date"], f["end_date"],
                       f["travellers"], f["transport_mode"], f["est_total_inr"], r["id"]))
        c.execute("UPDATE trips SET updated_at = created_at WHERE updated_at IS NULL")

        # ---------- admin module: bookings (filled by a future booking integration) ----------
        c.execute("""CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT NOT NULL UNIQUE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
            category TEXT NOT NULL CHECK (category IN ('hotel','car','bus','train','flight')),
            source TEXT NOT NULL DEFAULT 'platform' CHECK (source IN ('platform','external_referral')),
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed','failed')),
            payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded','failed')),
            title TEXT NOT NULL, from_location TEXT, to_location TEXT, travel_date TEXT,
            amount_inr INTEGER NOT NULL DEFAULT 0, provider TEXT, provider_ref TEXT,
            booked_at TEXT NOT NULL, cancelled_at TEXT)""")
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_cat ON bookings(category, status)")
        c.execute("""CREATE TABLE IF NOT EXISTS hotel_bookings (
            booking_id INTEGER PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
            hotel_name TEXT, destination TEXT, check_in TEXT, check_out TEXT, guests INTEGER, room_details TEXT)""")
        c.execute("""CREATE TABLE IF NOT EXISTS car_bookings (
            booking_id INTEGER PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
            car_name TEXT, start_location TEXT, destination TEXT, travel_date TEXT, rental_days INTEGER,
            est_mileage_km INTEGER, fuel_cost_estimate_inr INTEGER, rental_cost_inr INTEGER)""")
        c.execute("""CREATE TABLE IF NOT EXISTS bus_bookings (
            booking_id INTEGER PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
            operator TEXT, from_location TEXT, to_location TEXT, journey_date TEXT, passengers INTEGER, ticket_price_inr INTEGER)""")
        c.execute("""CREATE TABLE IF NOT EXISTS train_bookings (
            booking_id INTEGER PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
            train_name TEXT, train_number TEXT, from_station TEXT, to_station TEXT, journey_date TEXT,
            travel_class TEXT, passengers INTEGER)""")
        c.execute("""CREATE TABLE IF NOT EXISTS flight_bookings (
            booking_id INTEGER PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
            airline TEXT, flight_number TEXT, from_airport TEXT, to_airport TEXT, departure_date TEXT,
            passengers_json TEXT, ticket_price_inr INTEGER)""")
        # Payments hold amounts and provider references only. Never store card numbers.
        c.execute("""CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            amount_inr INTEGER NOT NULL, status TEXT NOT NULL CHECK (status IN ('pending','paid','failed','refunded')),
            provider TEXT, provider_ref TEXT, created_at TEXT NOT NULL)""")

        # ---------- admin module: notifications and audit log ----------
        c.execute("""CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT,
            ref_type TEXT, ref_id TEXT, created_at TEXT NOT NULL, read_at TEXT)""")
        c.execute("CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(read_at, id)")
        c.execute("""CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            admin_email TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, detail TEXT, ip TEXT,
            created_at TEXT NOT NULL)""")
