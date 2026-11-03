"""
Secure file storage for travel memories.

- Files are checked by their real content (magic bytes), not by the name or the browser's content type.
- Stored under a random name outside any public folder; the database keeps the metadata.
- Access is only through short-lived signed links created by the server for the owner or for a valid share link.
Local disk is used by default (UPLOAD_DIR). For production, swap `save`/`path_for`/`delete` for an S3 version (boto3) with
pre-signed URLs; the rest of the app does not change.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time
from pathlib import Path

from ..config import settings

MAX_BYTES = {"photo": 10 * 1024 * 1024, "video": 60 * 1024 * 1024, "document": 10 * 1024 * 1024}
URL_TTL = 3600


def upload_dir() -> Path:
    p = Path(os.getenv("UPLOAD_DIR", "uploads")).resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p


def sniff(head: bytes) -> tuple[str, str, str] | None:
    """Return (mime, kind, extension) from the file's first bytes, or None if the type is not allowed."""
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", "photo", ".jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", "photo", ".png"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif", "photo", ".gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp", "photo", ".webp"
    if head[4:8] == b"ftyp":
        return "video/mp4", "video", ".mp4"
    if head.startswith(b"\x1a\x45\xdf\xa3"):
        return "video/webm", "video", ".webm"
    if head.startswith(b"%PDF"):
        return "application/pdf", "document", ".pdf"
    return None


def new_name(user_id: int, ext: str) -> str:
    return f"{user_id}/{secrets.token_hex(16)}{ext}"


def path_for(stored_name: str) -> Path:
    p = (upload_dir() / stored_name).resolve()
    if upload_dir() not in p.parents:                       # never allow a path outside the upload folder
        raise ValueError("Invalid file path.")
    return p


def delete(stored_name: str) -> None:
    try:
        path_for(stored_name).unlink(missing_ok=True)
    except (ValueError, OSError):
        pass


def _sig(media_id: int, exp: int) -> str:
    return hmac.new(settings.jwt_secret.encode(), f"media:{media_id}:{exp}".encode(), hashlib.sha256).hexdigest()[:32]


def signed_url(media_id: int, ttl: int = URL_TTL) -> str:
    exp = int(time.time()) + ttl
    return f"/api/memories/file/{media_id}?exp={exp}&sig={_sig(media_id, exp)}"


def verify(media_id: int, exp: int, sig: str) -> bool:
    return exp >= time.time() and hmac.compare_digest(_sig(media_id, exp), sig)
