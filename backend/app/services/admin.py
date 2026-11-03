"""
Admin queries, notifications, audit log and report exports. Pure sqlite, no web framework, so it is easy to test.

Honesty rules built in:
- Revenue counts ONLY paid payments on platform-confirmed bookings. Trip budget estimates and external referrals are never revenue.
- Bookings with source 'external_referral' are reported separately and are never called completed here.
- Nothing here ever returns password hashes.
"""
from __future__ import annotations

import csv
import io
import json
from datetime import date, datetime, timedelta, timezone
from typing import Any

from ..database.db import connect

BOOKING_DETAIL_TABLES = {"hotel": "hotel_bookings", "car": "car_bookings", "bus": "bus_bookings", "train": "train_bookings", "flight": "flight_bookings"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today() -> str:
    return date.today().isoformat()


def _page(page: int, size: int) -> tuple[int, int, int]:
    page, size = max(1, page), max(1, min(size, 100))
    return page, size, (page - 1) * size


def _like(q: str) -> str:
    return "%" + q.strip().lower().replace("%", "").replace("_", "") + "%"


def date_range(key: str, start: str | None = None, end: str | None = None) -> tuple[str | None, str | None]:
    """Returns a half-open [start, end) pair of ISO date strings, or (None, None) for all time. Dates are UTC."""
    today = date.today()
    if key == "today":
        s, e = today, today
    elif key in ("7d", "30d", "90d"):
        s, e = today - timedelta(days=int(key[:-1]) - 1), today
    elif key == "custom" and start and end:
        s, e = date.fromisoformat(start), date.fromisoformat(end)
        if e < s:
            raise ValueError("End date is before the start date.")
    else:
        return None, None
    return s.isoformat(), (e + timedelta(days=1)).isoformat()


def _rng(col: str, s: str | None, e: str | None) -> tuple[str, list[Any]]:
    if not s:
        return "", []
    return f" AND {col} >= ? AND {col} < ?", [s, e]


# ---------------- notifications and audit ----------------
def notify(type_: str, title: str, body: str = "", ref_type: str | None = None, ref_id: Any = None) -> None:
    """Never raises: a notification problem must not break the customer's action."""
    try:
        with connect() as c:
            c.execute("INSERT INTO notifications (type, title, body, ref_type, ref_id, created_at) VALUES (?,?,?,?,?,?)",
                      (type_, title, body, ref_type, None if ref_id is None else str(ref_id), _now()))
    except Exception:                                                      # noqa: BLE001
        pass


def notify_trip_created(owner: str, trip_id: int, title: str) -> None:
    who = "A guest"
    if owner.startswith("user-"):
        with connect() as c:
            r = c.execute("SELECT name, email FROM users WHERE id=?", (owner[5:],)).fetchone()
        if r:
            who = f"{r['name']} ({r['email']})"
    notify("trip_created", "New trip saved", f"{who} saved: {title}", "trip", trip_id)


def audit(admin: dict | None, action: str, target_type: str | None = None, target_id: Any = None, detail: str = "", ip: str = "") -> None:
    with connect() as c:
        c.execute("INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, detail, ip, created_at) VALUES (?,?,?,?,?,?,?,?)",
                  (admin["id"] if admin else None, admin["email"] if admin else None, action, target_type,
                   None if target_id is None else str(target_id), detail[:500], ip, _now()))


def audit_list(page: int = 1, size: int = 50) -> dict[str, Any]:
    page, size, off = _page(page, size)
    with connect() as c:
        total = c.execute("SELECT COUNT(*) FROM admin_audit_logs").fetchone()[0]
        rows = c.execute("SELECT * FROM admin_audit_logs ORDER BY id DESC LIMIT ? OFFSET ?", (size, off)).fetchall()
    return {"items": [dict(r) for r in rows], "total": total, "page": page, "page_size": size}


def notifications(unread_only: bool = False, limit: int = 50) -> dict[str, Any]:
    with connect() as c:
        unread = c.execute("SELECT COUNT(*) FROM notifications WHERE read_at IS NULL").fetchone()[0]
        rows = c.execute(f"SELECT * FROM notifications {'WHERE read_at IS NULL' if unread_only else ''} ORDER BY id DESC LIMIT ?", (min(limit, 200),)).fetchall()
    return {"items": [dict(r) for r in rows], "unread": unread}


def mark_read(ids: list[int] | None = None) -> None:
    with connect() as c:
        if ids:
            c.execute(f"UPDATE notifications SET read_at=? WHERE read_at IS NULL AND id IN ({','.join('?' * len(ids))})", [_now(), *ids])
        else:
            c.execute("UPDATE notifications SET read_at=? WHERE read_at IS NULL", (_now(),))


# ---------------- trip status ----------------
STATUS_SQL = """CASE
  WHEN t.status = 'cancelled' THEN 'cancelled'
  WHEN t.end_date IS NOT NULL AND t.end_date < :today THEN 'completed'
  WHEN t.start_date IS NOT NULL AND t.start_date <= :today AND t.end_date >= :today THEN 'ongoing'
  WHEN EXISTS (SELECT 1 FROM bookings b WHERE b.trip_id = t.id AND b.status = 'confirmed' AND b.source = 'platform') THEN 'confirmed'
  WHEN EXISTS (SELECT 1 FROM bookings b WHERE b.trip_id = t.id AND b.status = 'pending' AND b.source = 'platform') THEN 'booking_in_progress'
  ELSE t.status END"""
TRIP_SELECT = f"""SELECT t.*, u.id AS cust_id, u.name AS cust_name, u.email AS cust_email, u.phone AS cust_phone,
  {STATUS_SQL} AS derived_status FROM trips t LEFT JOIN users u ON t.session_id = 'user-' || u.id"""


# ---------------- dashboard stats ----------------
def stats(s: str | None, e: str | None) -> dict[str, Any]:
    today = _today()
    with connect() as c:
        one = lambda sql, a=(): c.execute(sql, a).fetchone()[0]                       # noqa: E731
        w, a = _rng("created_at", s, e)
        bw, ba = _rng("booked_at", s, e)
        by_cat = {r["category"]: r["n"] for r in c.execute(f"SELECT category, COUNT(*) n FROM bookings WHERE source='platform'{bw} GROUP BY category", ba)}
        return {
            "users": one(f"SELECT COUNT(*) FROM users WHERE role='user'{w}", a),
            "active_users": one(f"SELECT COUNT(*) FROM users WHERE role='user' AND is_active=1{w}", a),
            "bookings_total": sum(by_cat.values()),
            "bookings_by_category": {k: by_cat.get(k, 0) for k in BOOKING_DETAIL_TABLES},
            "external_referrals": one(f"SELECT COUNT(*) FROM bookings WHERE source='external_referral'{bw}", ba),
            "trips_planned": one(f"SELECT COUNT(*) FROM trips WHERE 1=1{w}", a),
            "trips_upcoming": one("SELECT COUNT(*) FROM trips WHERE start_date >= ? AND status != 'cancelled'", (today,)),
            "trips_completed": one("SELECT COUNT(*) FROM trips WHERE end_date < ? AND status != 'cancelled'", (today,)),
            "bookings_cancelled": one(f"SELECT COUNT(*) FROM bookings WHERE source='platform' AND status='cancelled'{bw}", ba),
            "revenue_inr": one(f"""SELECT COALESCE(SUM(p.amount_inr), 0) FROM payments p JOIN bookings b ON b.id = p.booking_id
                                   WHERE p.status='paid' AND b.source='platform' AND b.status IN ('confirmed','completed'){_rng('p.created_at', s, e)[0]}""", _rng("p.created_at", s, e)[1]),
            "memories": {"available": False, "note": "The app has no travel-memory feature yet."},
            "notes": ["Bookings and revenue stay 0 until a booking integration writes to the bookings and payments tables.",
                      "Revenue counts only paid payments on platform-confirmed bookings, never trip estimates or referrals."],
        }


# ---------------- users ----------------
USER_SORT = {"newest": "u.id DESC", "oldest": "u.id ASC", "name": "u.name COLLATE NOCASE ASC"}


def list_users(q: str = "", status: str = "", sort: str = "newest", page: int = 1, size: int = 20) -> dict[str, Any]:
    page, size, off = _page(page, size)
    where, args = ["u.role = 'user'"], []
    if q.strip():
        where.append("(lower(u.name) LIKE ? OR lower(u.email) LIKE ? OR lower(COALESCE(u.phone,'')) LIKE ?)"); args += [_like(q)] * 3
    if status in ("active", "inactive"):
        where.append("u.is_active = ?"); args.append(1 if status == "active" else 0)
    sql_w = " AND ".join(where)
    with connect() as c:
        total = c.execute(f"SELECT COUNT(*) FROM users u WHERE {sql_w}", args).fetchone()[0]
        rows = c.execute(f"""SELECT u.id, u.name, u.email, u.phone, u.created_at, u.is_active,
              (SELECT COUNT(*) FROM trips t WHERE t.session_id = 'user-' || u.id) AS trips,
              (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) AS bookings
              FROM users u WHERE {sql_w} ORDER BY {USER_SORT.get(sort, USER_SORT['newest'])} LIMIT ? OFFSET ?""", args + [size, off]).fetchall()
    return {"items": [dict(r) for r in rows], "total": total, "page": page, "page_size": size}


def user_detail(user_id: int) -> dict[str, Any] | None:
    with connect() as c:
        u = c.execute("SELECT id, name, email, phone, created_at, is_active, role, last_login_at FROM users WHERE id=?", (user_id,)).fetchone()
        if u is None:
            return None
        trips = c.execute(f"SELECT id, title, destination_name, origin_city, start_date, end_date, est_total_inr, created_at, derived_status FROM ({TRIP_SELECT}) WHERE cust_id = :uid ORDER BY id DESC",
                          {"today": _today(), "uid": user_id}).fetchall()
        bookings = c.execute("SELECT id, reference, category, source, status, payment_status, title, travel_date, amount_inr, booked_at FROM bookings WHERE user_id=? ORDER BY id DESC", (user_id,)).fetchall()
    trips_l = [dict(t) for t in trips]
    return {"user": dict(u), "trips": trips_l, "bookings": [dict(b) for b in bookings],
            "counts": {"planned_trips": sum(1 for t in trips_l if t["derived_status"] not in ("completed", "cancelled")),
                       "completed_trips": sum(1 for t in trips_l if t["derived_status"] == "completed"),
                       "cancelled_bookings": sum(1 for b in bookings if b["status"] == "cancelled")}}


def set_user_active(admin: dict, user_id: int, active: bool, reason: str, ip: str = "") -> dict[str, Any]:
    if len(reason.strip()) < 5:
        raise ValueError("Please give a reason (at least 5 characters).")
    if user_id == admin["id"]:
        raise ValueError("You cannot change your own account status.")
    with connect() as c:
        u = c.execute("SELECT id, role, email FROM users WHERE id=?", (user_id,)).fetchone()
        if u is None:
            raise LookupError("User not found.")
        if u["role"] != "user":
            raise ValueError("Admin accounts cannot be changed here. Use the make_admin command line tool.")
        c.execute("UPDATE users SET is_active=? WHERE id=?", (1 if active else 0, user_id))
    audit(admin, "activate_user" if active else "deactivate_user", "user", user_id, reason, ip)
    return {"id": user_id, "is_active": active}


# ---------------- trips ----------------
TRIP_SORT = {"newest": "id DESC", "oldest": "id ASC", "travel_date": "start_date ASC", "budget": "est_total_inr DESC"}


def list_trips(q: str = "", status: str = "", travel_from: str = "", travel_to: str = "", s: str | None = None, e: str | None = None,
               sort: str = "newest", page: int = 1, size: int = 20) -> dict[str, Any]:
    page, size, off = _page(page, size)
    where, args = ["1=1"], {"today": _today()}
    if q.strip():
        where.append("(lower(COALESCE(destination_name,'')) LIKE :q OR lower(title) LIKE :q OR lower(COALESCE(origin_city,'')) LIKE :q OR lower(COALESCE(cust_name,'')) LIKE :q OR lower(COALESCE(cust_email,'')) LIKE :q)")
        args["q"] = _like(q)
    if status:
        where.append("derived_status = :status"); args["status"] = status
    if travel_from:
        where.append("start_date >= :tf"); args["tf"] = travel_from
    if travel_to:
        where.append("start_date <= :tt"); args["tt"] = travel_to
    if s:
        where.append("created_at >= :s AND created_at < :e"); args["s"], args["e"] = s, e
    sql_w = " AND ".join(where)
    with connect() as c:
        total = c.execute(f"SELECT COUNT(*) FROM ({TRIP_SELECT}) WHERE {sql_w}", args).fetchone()[0]
        rows = c.execute(f"""SELECT id, title, cust_id, cust_name, cust_email, origin_city, destination_name, start_date, end_date,
              travellers, transport_mode, est_total_inr, created_at, updated_at, derived_status
              FROM ({TRIP_SELECT}) WHERE {sql_w} ORDER BY {TRIP_SORT.get(sort, TRIP_SORT['newest'])} LIMIT :lim OFFSET :off""", args | {"lim": size, "off": off}).fetchall()
    return {"items": [dict(r) for r in rows], "total": total, "page": page, "page_size": size}


def trip_detail(trip_id: int) -> dict[str, Any] | None:
    with connect() as c:
        r = c.execute(f"SELECT * FROM ({TRIP_SELECT}) WHERE id = :id", {"today": _today(), "id": trip_id}).fetchone()
        if r is None:
            return None
        bookings = c.execute("SELECT id, reference, category, source, status, payment_status, title, travel_date, amount_inr FROM bookings WHERE trip_id=? ORDER BY id", (trip_id,)).fetchall()
    row = dict(r)
    plan = json.loads(row.pop("plan_json"))
    row.pop("session_id", None)                                  # guest session ids are private
    confirmed = sum(b["amount_inr"] for b in bookings if b["source"] == "platform" and b["status"] in ("confirmed", "completed"))
    return {"trip": row, "plan": plan, "bookings": [dict(b) for b in bookings], "confirmed_booking_cost_inr": confirmed,
            "customer": {"id": row["cust_id"], "name": row["cust_name"] or "Guest (not logged in)", "email": row["cust_email"], "phone": row["cust_phone"]},
            "notes": ["Hotels and cars are not selectable in the app yet, so only the estimated stay range from the plan is shown.",
                      "Estimated costs come from illustrative rules. Confirmed costs come only from platform bookings."]}


# ---------------- bookings ----------------
def list_bookings(category: str = "", source: str = "platform", status: str = "", payment_status: str = "", q: str = "",
                  s: str | None = None, e: str | None = None, travel_from: str = "", travel_to: str = "", page: int = 1, size: int = 20) -> dict[str, Any]:
    page, size, off = _page(page, size)
    where, args = ["1=1"], []
    for col, val in (("b.category", category), ("b.source", source), ("b.status", status), ("b.payment_status", payment_status)):
        if val:
            where.append(f"{col} = ?"); args.append(val)
    if q.strip():
        where.append("(lower(b.reference) LIKE ? OR lower(b.title) LIKE ? OR lower(COALESCE(u.name,'')) LIKE ? OR lower(COALESCE(u.email,'')) LIKE ?)"); args += [_like(q)] * 4
    if s:
        where.append("b.booked_at >= ? AND b.booked_at < ?"); args += [s, e]
    if travel_from:
        where.append("b.travel_date >= ?"); args.append(travel_from)
    if travel_to:
        where.append("b.travel_date <= ?"); args.append(travel_to)
    sql_w = " AND ".join(where)
    with connect() as c:
        total = c.execute(f"SELECT COUNT(*) FROM bookings b LEFT JOIN users u ON u.id = b.user_id WHERE {sql_w}", args).fetchone()[0]
        rows = c.execute(f"""SELECT b.id, b.reference, b.category, b.source, b.status, b.payment_status, b.title, b.from_location, b.to_location,
              b.travel_date, b.amount_inr, b.booked_at, u.name AS customer_name, u.email AS customer_email
              FROM bookings b LEFT JOIN users u ON u.id = b.user_id WHERE {sql_w} ORDER BY b.id DESC LIMIT ? OFFSET ?""", args + [size, off]).fetchall()
    return {"items": [dict(r) for r in rows], "total": total, "page": page, "page_size": size}


def booking_detail(booking_id: int) -> dict[str, Any] | None:
    with connect() as c:
        b = c.execute("""SELECT b.*, u.name AS customer_name, u.email AS customer_email FROM bookings b
                         LEFT JOIN users u ON u.id = b.user_id WHERE b.id=?""", (booking_id,)).fetchone()
        if b is None:
            return None
        d = c.execute(f"SELECT * FROM {BOOKING_DETAIL_TABLES[b['category']]} WHERE booking_id=?", (booking_id,)).fetchone()
        pays = c.execute("SELECT id, amount_inr, status, provider, provider_ref, created_at FROM payments WHERE booking_id=? ORDER BY id", (booking_id,)).fetchall()
    out = {"booking": dict(b), "detail": dict(d) if d else {}, "payments": [dict(p) for p in pays]}
    if b["source"] == "external_referral":
        out["warning"] = "External booking referral. The booking was completed on the provider's own site and is not verified or confirmed inside this application."
    return out


# ---------------- analytics ----------------
def analytics(s: str | None, e: str | None) -> dict[str, Any]:
    today = _today()
    with connect() as c:
        rows = lambda sql, a=(): [dict(r) for r in c.execute(sql, a).fetchall()]      # noqa: E731
        w, a = _rng("created_at", s, e)
        bw, ba = _rng("b.booked_at", s, e)
        short = bool(s) and (date.fromisoformat(e) - date.fromisoformat(s)).days <= 92
        fmt = "%Y-%m-%d" if short else "%Y-%m"
        total_b = c.execute(f"SELECT COUNT(*) FROM bookings b WHERE b.source='platform'{bw}", ba).fetchone()[0]
        cancelled = c.execute(f"SELECT COUNT(*) FROM bookings b WHERE b.source='platform' AND b.status='cancelled'{bw}", ba).fetchone()[0]
        ww, wa = _rng("w.created_at", s, e)
        pw, pa = _rng("p.created_at", s, e)
        avg = c.execute(f"SELECT AVG(est_total_inr) FROM trips WHERE est_total_inr IS NOT NULL{w}", a).fetchone()[0]
        return {
            "granularity": "day" if short else "month",
            "popular_destinations": rows(f"SELECT destination_name AS label, COUNT(*) AS value FROM trips WHERE destination_id IS NOT NULL{w} GROUP BY destination_id ORDER BY value DESC LIMIT 10", a),
            "most_saved_places": rows(f"SELECT p.name AS label, COUNT(*) AS value FROM wishlist w JOIN places p ON p.id = w.place_id WHERE 1=1{ww} GROUP BY w.place_id ORDER BY value DESC LIMIT 10", wa),
            "most_searched": {"available": False, "note": "Searches are not recorded, to protect visitor privacy. Popularity above is based on saved trips and wishlists."},
            "hotels_booked": rows(f"SELECT h.hotel_name AS label, COUNT(*) AS value FROM hotel_bookings h JOIN bookings b ON b.id = h.booking_id WHERE b.source='platform'{bw} GROUP BY h.hotel_name ORDER BY value DESC LIMIT 10", ba),
            "transport_popularity": rows(f"SELECT COALESCE(transport_mode,'unknown') AS label, COUNT(*) AS value FROM trips WHERE 1=1{w} GROUP BY transport_mode ORDER BY value DESC", a),
            "trips_over_time": rows(f"SELECT strftime('{fmt}', created_at) AS label, COUNT(*) AS value FROM trips WHERE 1=1{w} GROUP BY label ORDER BY label", a),
            "registrations_over_time": rows(f"SELECT strftime('{fmt}', created_at) AS label, COUNT(*) AS value FROM users WHERE role='user'{w} GROUP BY label ORDER BY label", a),
            "bookings_over_time": rows(f"SELECT strftime('{fmt}', b.booked_at) AS label, COUNT(*) AS value FROM bookings b WHERE b.source='platform'{bw} GROUP BY label ORDER BY label", ba),
            "revenue_over_time": rows(f"""SELECT strftime('{fmt}', p.created_at) AS label, SUM(p.amount_inr) AS value FROM payments p JOIN bookings b ON b.id = p.booking_id
                                          WHERE p.status='paid' AND b.source='platform' AND b.status IN ('confirmed','completed'){pw} GROUP BY label ORDER BY label""", pa),
            "upcoming_trips": c.execute("SELECT COUNT(*) FROM trips WHERE start_date >= ? AND status != 'cancelled'", (today,)).fetchone()[0],
            "average_estimated_budget_inr": round(avg) if avg is not None else None,
            "cancellation_rate_percent": round(cancelled * 100 / total_b, 1) if total_b else None,
            "platform_bookings": total_b,
        }


# ---------------- global search ----------------
def search(q: str) -> dict[str, list[dict[str, Any]]]:
    if len(q.strip()) < 2:
        return {}
    like = _like(q)
    with connect() as c:
        rows = lambda sql, a: [dict(r) for r in c.execute(sql, a).fetchall()]          # noqa: E731
        return {
            "users": rows("SELECT id, name, email FROM users WHERE role='user' AND (lower(name) LIKE ? OR lower(email) LIKE ? OR lower(COALESCE(phone,'')) LIKE ?) LIMIT 5", (like,) * 3),
            "trips": rows("SELECT id, title, destination_name FROM trips WHERE lower(title) LIKE ? OR lower(COALESCE(destination_name,'')) LIKE ? LIMIT 5", (like,) * 2),
            "bookings": rows("SELECT id, reference, title FROM bookings WHERE lower(reference) LIKE ? OR lower(title) LIKE ? LIMIT 5", (like,) * 2),
            "destinations": rows("SELECT id, name, state FROM places WHERE search_text LIKE ? LIMIT 5", (like,)),
            "hotels": rows("SELECT b.id, h.hotel_name AS name FROM hotel_bookings h JOIN bookings b ON b.id = h.booking_id WHERE lower(h.hotel_name) LIKE ? LIMIT 5", (like,)),
            "cars": rows("SELECT b.id, k.car_name AS name FROM car_bookings k JOIN bookings b ON b.id = k.booking_id WHERE lower(k.car_name) LIKE ? LIMIT 5", (like,)),
        }


# ---------------- CSV export ----------------
def _cell(v: Any) -> str:
    s = "" if v is None else str(v)
    return "'" + s if s[:1] in ("=", "+", "-", "@", "\t", "\r") else s        # stops spreadsheet formula injection


def export_csv(kind: str, s: str | None, e: str | None) -> str:
    out = io.StringIO()
    w = csv.writer(out)
    if kind == "users":
        with connect() as c:
            wh, a = _rng("created_at", s, e)
            rows = c.execute(f"SELECT id, name, email, phone, created_at, CASE is_active WHEN 1 THEN 'active' ELSE 'inactive' END FROM users WHERE role='user'{wh} ORDER BY id", a).fetchall()
        w.writerow(["id", "name", "email", "phone", "registered_at", "status"])
    elif kind == "trips":
        with connect() as c:
            wh, a = ("", {"today": _today()})
            if s:
                wh, a = " WHERE created_at >= :s AND created_at < :e", {"today": _today(), "s": s, "e": e}
            rows = c.execute(f"SELECT id, cust_name, cust_email, origin_city, destination_name, start_date, end_date, travellers, transport_mode, est_total_inr, derived_status, created_at FROM ({TRIP_SELECT}){wh} ORDER BY id", a).fetchall()
        w.writerow(["id", "customer", "email", "from", "destination", "departure", "return", "travellers", "transport", "estimated_budget_inr", "status", "created_at"])
    elif kind == "bookings":
        with connect() as c:
            wh, a = _rng("b.booked_at", s, e)
            rows = c.execute(f"""SELECT b.reference, b.category, b.source, u.name, u.email, b.title, b.travel_date, b.amount_inr, b.status, b.payment_status, b.booked_at
                                 FROM bookings b LEFT JOIN users u ON u.id = b.user_id WHERE 1=1{wh} ORDER BY b.id""", a).fetchall()
        w.writerow(["reference", "category", "source", "customer", "email", "title", "travel_date", "amount_inr", "status", "payment_status", "booked_at"])
    else:
        raise ValueError("Unknown report.")
    for r in rows:
        w.writerow([_cell(v) for v in tuple(r)])
    return out.getvalue()
