"""Travel memories: albums, media records, sharing, timeline, recap and optional AI text. Pure sqlite plus local files."""
from __future__ import annotations

import os
import secrets
import zipfile
from datetime import datetime, timezone
from typing import Any

from ..database.db import connect
from . import memory_storage as store
from .places_seed import PLACE_BY_ID

VISIBILITY = ("private", "shared", "public")
MAX_MEDIA_PER_ALBUM = 200


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _quota_bytes() -> int:
    return int(os.getenv("MEMORY_QUOTA_MB", "500")) * 1024 * 1024


def _media_out(m, with_url: bool = True) -> dict[str, Any]:
    d = {k: m[k] for k in ("id", "album_id", "kind", "original_name", "mime", "size_bytes", "caption", "created_at")}
    if with_url:
        d["url"] = store.signed_url(m["id"])
    return d


def _album_out(a, media: list | None = None, owner: bool = True) -> dict[str, Any]:
    d = {k: a[k] for k in ("id", "title", "description", "story", "location_name", "place_id", "lat", "lng", "travel_date", "visibility", "cover_media_id", "created_at", "updated_at")}
    if owner:
        d["share_token"] = a["share_token"]
    if media is not None:
        d["media"] = [_media_out(m) for m in media]
    return d


def create_album(user_id: int, title: str, description: str = "", story: str = "", location_name: str = "", place_id: str | None = None, travel_date: str | None = None) -> dict[str, Any]:
    lat = lng = None
    if place_id:
        p = PLACE_BY_ID.get(place_id)
        if p is None:
            raise ValueError("Unknown destination.")
        lat, lng, location_name = p["lat"], p["lng"], location_name or p["name"]
    now = _now()
    with connect() as c:
        cur = c.execute("""INSERT INTO memory_albums (user_id, title, description, story, location_name, place_id, lat, lng, travel_date, created_at, updated_at)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?)""", (user_id, title.strip(), description.strip(), story.strip(), location_name.strip(), place_id, lat, lng, travel_date, now, now))
        a = c.execute("SELECT * FROM memory_albums WHERE id=?", (cur.lastrowid,)).fetchone()
    return _album_out(a, [])


def _own(c, user_id: int, album_id: int):
    a = c.execute("SELECT * FROM memory_albums WHERE id=? AND user_id=?", (album_id, user_id)).fetchone()
    if a is None:
        raise LookupError("Album not found.")                  # same answer for "missing" and "someone else's"
    return a


def assert_owner(user_id: int, album_id: int) -> None:
    with connect() as c:
        _own(c, user_id, album_id)


def list_albums(user_id: int) -> list[dict[str, Any]]:
    with connect() as c:
        rows = c.execute("""SELECT a.*, (SELECT COUNT(*) FROM memory_media m WHERE m.album_id=a.id) AS media_count FROM memory_albums a
                            WHERE a.user_id=? ORDER BY COALESCE(a.travel_date, a.created_at) DESC""", (user_id,)).fetchall()
        out = []
        for a in rows:
            d = _album_out(a); d["media_count"] = a["media_count"]
            cover = c.execute("SELECT id, kind FROM memory_media WHERE album_id=? AND kind='photo' ORDER BY (id=?) DESC, id LIMIT 1", (a["id"], a["cover_media_id"] or 0)).fetchone()
            d["cover_url"] = store.signed_url(cover["id"]) if cover else None
            out.append(d)
    return out


def get_album(user_id: int, album_id: int) -> dict[str, Any]:
    with connect() as c:
        a = _own(c, user_id, album_id)
        media = c.execute("SELECT * FROM memory_media WHERE album_id=? ORDER BY id", (album_id,)).fetchall()
    return _album_out(a, media)


_EDITABLE = ("title", "description", "story", "location_name", "travel_date", "cover_media_id")


def update_album(user_id: int, album_id: int, fields: dict[str, Any]) -> dict[str, Any]:
    sets = {k: v for k, v in fields.items() if k in _EDITABLE and v is not None}
    with connect() as c:
        _own(c, user_id, album_id)
        if "cover_media_id" in sets and not c.execute("SELECT 1 FROM memory_media WHERE id=? AND album_id=?", (sets["cover_media_id"], album_id)).fetchone():
            raise ValueError("That photo is not in this album.")
        if sets:
            c.execute(f"UPDATE memory_albums SET {', '.join(k + '=?' for k in sets)}, updated_at=? WHERE id=?", [*sets.values(), _now(), album_id])
    return get_album(user_id, album_id)


def delete_album(user_id: int, album_id: int) -> None:
    with connect() as c:
        _own(c, user_id, album_id)
        names = [r["stored_name"] for r in c.execute("SELECT stored_name FROM memory_media WHERE album_id=?", (album_id,))]
        c.execute("DELETE FROM memory_albums WHERE id=?", (album_id,))        # media rows go with it (ON DELETE CASCADE)
    for n in names:
        store.delete(n)


def set_visibility(user_id: int, album_id: int, visibility: str) -> dict[str, Any]:
    if visibility not in VISIBILITY:
        raise ValueError("visibility must be private, shared or public.")
    with connect() as c:
        a = _own(c, user_id, album_id)
        token = a["share_token"] if visibility != "private" else None
        if visibility != "private" and not token:
            token = secrets.token_urlsafe(16)
        c.execute("UPDATE memory_albums SET visibility=?, share_token=?, updated_at=? WHERE id=?", (visibility, token, _now(), album_id))   # going private revokes the link
    return get_album(user_id, album_id)


def add_media_record(user_id: int, album_id: int, original_name: str, stored_name: str, mime: str, kind: str, size: int, caption: str = "") -> dict[str, Any]:
    with connect() as c:
        _own(c, user_id, album_id)
        n = c.execute("SELECT COUNT(*) FROM memory_media WHERE album_id=?", (album_id,)).fetchone()[0]
        used = c.execute("SELECT COALESCE(SUM(size_bytes),0) FROM memory_media WHERE user_id=?", (user_id,)).fetchone()[0]
        if n >= MAX_MEDIA_PER_ALBUM:
            raise ValueError(f"An album can hold up to {MAX_MEDIA_PER_ALBUM} files.")
        if used + size > _quota_bytes():
            raise ValueError("Your storage limit has been reached. Delete some files first.")
        cur = c.execute("INSERT INTO memory_media (album_id, user_id, kind, original_name, stored_name, mime, size_bytes, caption, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
                        (album_id, user_id, kind, original_name[:200], stored_name, mime, size, caption.strip()[:300], _now()))
        m = c.execute("SELECT * FROM memory_media WHERE id=?", (cur.lastrowid,)).fetchone()
    return _media_out(m)


def update_caption(user_id: int, media_id: int, caption: str) -> dict[str, Any]:
    with connect() as c:
        r = c.execute("UPDATE memory_media SET caption=? WHERE id=? AND user_id=?", (caption.strip()[:300], media_id, user_id))
        if r.rowcount == 0:
            raise LookupError("File not found.")
        m = c.execute("SELECT * FROM memory_media WHERE id=?", (media_id,)).fetchone()
    return _media_out(m)


def delete_media(user_id: int, media_id: int) -> None:
    with connect() as c:
        m = c.execute("SELECT stored_name FROM memory_media WHERE id=? AND user_id=?", (media_id, user_id)).fetchone()
        if m is None:
            raise LookupError("File not found.")
        c.execute("DELETE FROM memory_media WHERE id=?", (media_id,))
    store.delete(m["stored_name"])


def media_file(media_id: int) -> dict[str, Any] | None:
    with connect() as c:
        r = c.execute("SELECT stored_name, mime, original_name FROM memory_media WHERE id=?", (media_id,)).fetchone()
    return dict(r) if r else None


def shared_album(token: str) -> dict[str, Any] | None:
    with connect() as c:
        a = c.execute("""SELECT a.*, u.name AS owner_name FROM memory_albums a JOIN users u ON u.id = a.user_id
                         WHERE a.share_token=? AND a.visibility IN ('shared','public')""", (token,)).fetchone()
        if a is None:
            return None
        media = c.execute("SELECT * FROM memory_media WHERE album_id=? AND kind IN ('photo','video') ORDER BY id", (a["id"],)).fetchall()   # documents are never shared
    d = _album_out(a, media, owner=False)
    d["by"] = (a["owner_name"] or "A traveller").split()[0]            # first name only
    return d


def public_albums(page: int = 1, size: int = 12) -> dict[str, Any]:
    size, off = max(1, min(size, 48)), (max(1, page) - 1) * max(1, min(size, 48))
    with connect() as c:
        total = c.execute("SELECT COUNT(*) FROM memory_albums WHERE visibility='public'").fetchone()[0]
        rows = c.execute("""SELECT a.id, a.title, a.location_name, a.travel_date, a.share_token, u.name AS owner_name,
                            (SELECT id FROM memory_media m WHERE m.album_id=a.id AND m.kind='photo' ORDER BY id LIMIT 1) AS cover
                            FROM memory_albums a JOIN users u ON u.id=a.user_id WHERE a.visibility='public' ORDER BY a.updated_at DESC LIMIT ? OFFSET ?""", (size, off)).fetchall()
    return {"items": [{"title": r["title"], "location_name": r["location_name"], "travel_date": r["travel_date"], "token": r["share_token"],
                       "by": (r["owner_name"] or "A traveller").split()[0], "cover_url": store.signed_url(r["cover"]) if r["cover"] else None} for r in rows], "total": total, "page": page}


def timeline(user_id: int) -> dict[str, Any]:
    albums = list_albums(user_id)
    return {"timeline": [{"id": a["id"], "title": a["title"], "location_name": a["location_name"], "travel_date": a["travel_date"], "media_count": a["media_count"], "cover_url": a["cover_url"]} for a in albums],
            "map": [{"id": a["id"], "title": a["title"], "lat": a["lat"], "lng": a["lng"], "place_id": a["place_id"], "media_count": a["media_count"]} for a in albums if a["lat"] is not None],
            "totals": {"albums": len(albums), "places": len({a["location_name"].lower() for a in albums if a["location_name"]}), "files": sum(a["media_count"] for a in albums)}}


def recap(user_id: int, year: int) -> dict[str, Any]:
    with connect() as c:
        rows = c.execute("""SELECT a.id, a.title, a.location_name, a.travel_date, (SELECT COUNT(*) FROM memory_media m WHERE m.album_id=a.id) AS n
                            FROM memory_albums a WHERE a.user_id=? AND substr(COALESCE(a.travel_date, a.created_at),1,4)=? ORDER BY a.travel_date""", (user_id, str(year))).fetchall()
    by_month: dict[str, int] = {}
    for r in rows:
        m = (r["travel_date"] or "")[:7]
        if m:
            by_month[m] = by_month.get(m, 0) + 1
    return {"year": year, "albums": [dict(r) for r in rows], "album_count": len(rows), "files": sum(r["n"] for r in rows),
            "places": sorted({r["location_name"] for r in rows if r["location_name"]}), "albums_by_month": by_month}


def build_zip(user_id: int, album_id: int, dest_path: str) -> None:
    with connect() as c:
        a = _own(c, user_id, album_id)
        media = c.execute("SELECT * FROM memory_media WHERE album_id=? ORDER BY id", (album_id,)).fetchall()
    with zipfile.ZipFile(dest_path, "w", zipfile.ZIP_STORED) as z:
        notes = [f"{a['title']}", f"Location: {a['location_name']}", f"Date: {a['travel_date'] or ''}", "", a["description"], "", a["story"], "", "Captions:"]
        for i, m in enumerate(media, 1):
            arc = f"{i:03d}-{os.path.basename(m['original_name'])}"
            try:
                z.write(store.path_for(m["stored_name"]), arc)
            except (OSError, ValueError):
                continue
            if m["caption"]:
                notes.append(f"{arc}: {m['caption']}")
        z.writestr("album-notes.txt", "\n".join(notes))


# ---------------- optional AI text (text only: photos are never sent to an AI service) ----------------
def ai_text(prompt: str) -> str:
    key = os.getenv("GOOGLE_API_KEY", "")
    if not key:
        raise RuntimeError("The AI key is not configured. Add GOOGLE_API_KEY to backend/.env.")
    from google import genai                                                    # google-genai comes with google-adk
    client = genai.Client(api_key=key)
    res = client.models.generate_content(model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"), contents=prompt)
    return (res.text or "").strip()


def album_ai(user_id: int, album_id: int, task: str) -> str:
    a = get_album(user_id, album_id)
    caps = "; ".join(m["caption"] for m in a["media"] if m["caption"])[:1500]
    facts = f"Album: {a['title']}. Place: {a['location_name']}. Date: {a['travel_date']}. Description: {a['description']}. Story: {a['story'][:1500]}. Photo captions: {caps}. Number of files: {len(a['media'])}."
    prompts = {
        "titles": "Suggest 5 short, warm album titles for this trip, one per line, no numbering. " + facts,
        "summary": "Write a friendly 3 to 4 sentence summary of this trip using ONLY these facts. Do not invent details. " + facts,
        "highlights": "List 4 to 6 trip highlights as short bullet lines using ONLY these facts. Do not invent details. " + facts,
    }
    if task not in prompts:
        raise ValueError("task must be titles, summary or highlights.")
    return ai_text(prompts[task])


def recap_ai(user_id: int, year: int) -> str:
    r = recap(user_id, year)
    return ai_text(f"Write a friendly 4 sentence travel recap for the year {year} using ONLY these facts. Do not invent details. Albums: {[a['title'] for a in r['albums']]}. Places: {r['places']}. Files saved: {r['files']}.")
