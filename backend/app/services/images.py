
from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from typing import Any

import httpx
from dotenv import load_dotenv

from .catalog import get_destination
from ..database.db import connect

load_dotenv()

log = logging.getLogger(__name__)

UNSPLASH_API = "https://api.unsplash.com/search/photos"

UNSPLASH_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "").strip()

# Cache destination photo metadata for one hour.
# Admin-selected images are always checked before this cache.
PHOTO_CACHE_TTL_SECONDS = 60 * 60

_photo_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_photo_cache_lock = asyncio.Lock()


def _ensure_table():
    with connect() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS destination_photo_selections (
                destination_id TEXT PRIMARY KEY,
                destination_name TEXT NOT NULL,
                state TEXT NOT NULL DEFAULT '',
                provider TEXT NOT NULL,
                source_id TEXT NOT NULL DEFAULT '',
                url TEXT NOT NULL,
                alt TEXT NOT NULL DEFAULT '',
                attribution TEXT NOT NULL DEFAULT '',
                attribution_uri TEXT NOT NULL DEFAULT '',
                license TEXT NOT NULL DEFAULT '',
                license_uri TEXT NOT NULL DEFAULT '',
                photo_uri TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_by INTEGER
            )
        """)


def get_selected(destination_id: str):
    _ensure_table()

    with connect() as c:
        row = c.execute(
            "SELECT * FROM destination_photo_selections WHERE destination_id=?",
            (destination_id.strip().lower(),),
        ).fetchone()

    return dict(row) if row else None


def save_selection(
    destination_id,
    destination_name,
    state,
    photo,
    admin_id=None,
):
    if not photo.get("url") or not photo.get("provider"):
        raise ValueError("Image URL and provider are required.")

    _ensure_table()

    vals = (
        destination_id.strip().lower(),
        destination_name.strip(),
        state.strip(),
        photo.get("provider", ""),
        photo.get("source_id", ""),
        photo["url"],
        photo.get("alt", destination_name),
        photo.get("attribution", ""),
        photo.get("attribution_uri", ""),
        photo.get("license", ""),
        photo.get("license_uri", ""),
        photo.get("photo_uri", ""),
        admin_id,
    )

    with connect() as c:
        c.execute("""
            INSERT INTO destination_photo_selections
            (
                destination_id, destination_name, state, provider,
                source_id, url, alt, attribution, attribution_uri,
                license, license_uri, photo_uri, updated_at, updated_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)

            ON CONFLICT(destination_id) DO UPDATE SET
                destination_name=excluded.destination_name,
                state=excluded.state,
                provider=excluded.provider,
                source_id=excluded.source_id,
                url=excluded.url,
                alt=excluded.alt,
                attribution=excluded.attribution,
                attribution_uri=excluded.attribution_uri,
                license=excluded.license,
                license_uri=excluded.license_uri,
                photo_uri=excluded.photo_uri,
                updated_at=CURRENT_TIMESTAMP,
                updated_by=excluded.updated_by
        """, vals)

    # Invalidate automatic cached images for this destination.
    destination_key = destination_id.strip().lower()

    for key in list(_photo_cache):
        if key.startswith(destination_key + ":"):
            _photo_cache.pop(key, None)

    return get_selected(destination_id)



async def search_candidates(query: str, limit: int = 8):
    query = query.strip()

    if len(query) < 2:
        raise ValueError("Enter at least two characters.")

    limit = max(1, min(limit, 12))

    items = []
    errors = []

    if not UNSPLASH_KEY:
        return {
            "items": [],
            "errors": ["Unsplash API key is not configured."]
        }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                UNSPLASH_API,
                headers={
                    "Authorization": f"Client-ID {UNSPLASH_KEY}",
                    "Accept-Version": "v1",
                },
                params={
                    "query": query,
                    "per_page": limit,
                    "orientation": "landscape",
                    "content_filter": "high",
                },
            )

            response.raise_for_status()
            data = response.json()

        for photo in data.get("results", []):
            user = photo.get("user") or {}
            links = photo.get("links") or {}
            user_links = user.get("links") or {}
            urls = photo.get("urls") or {}

            image_url = urls.get("small") or urls.get("regular")

            if not image_url:
                continue

            def track(url):
                return (
                    url
                    + ("&" if "?" in url else "?")
                    + "utm_source=travel_agent_india"
                    + "&utm_medium=referral"
                )

            items.append({
                "url": image_url,
                "alt": photo.get("alt_description") or query,
                "attribution": user.get(
                    "name",
                    "Unsplash photographer"
                ),
                "attribution_uri": track(
                    user_links.get(
                        "html",
                        "https://unsplash.com"
                    )
                ),
                "provider": "Unsplash",
                "license": "Unsplash License",
                "license_uri": "https://unsplash.com/license",
                "photo_uri": track(
                    links.get(
                        "html",
                        "https://unsplash.com"
                    )
                ),
                "source_id": photo.get("id", ""),
            })

    except httpx.HTTPStatusError as e:
        log.warning(
            "Unsplash API returned HTTP %s",
            e.response.status_code
        )
        errors.append(
            f"Unsplash API error: HTTP {e.response.status_code}"
        )

    except (httpx.HTTPError, ValueError) as e:
        log.warning("Unsplash search error: %s", e)
        errors.append("Unable to retrieve images from Unsplash.")

    return {
        "items": items,
        "errors": errors,
    }



async def get_photos(
    destination_id: str,
    max_photos: int = 3,
    name: str | None = None,
    state: str | None = None,
):
    destination_key = destination_id.strip().lower()

    max_photos = max(
        1,
        min(max_photos, 12),
    )

    # -------------------------------------------------
    # 1. CHECK ADMIN-SELECTED IMAGE FIRST
    # -------------------------------------------------

    selected = get_selected(destination_key)

    if selected:
        keys = (
            "url",
            "alt",
            "attribution",
            "attribution_uri",
            "provider",
            "license",
            "license_uri",
            "photo_uri",
        )

        return {
            "status": "ok",
            "destination_id": destination_id,
            "photos": [
                {
                    key: selected.get(key, "")
                    for key in keys
                }
            ],
        }

    # -------------------------------------------------
    # 2. GET DESTINATION INFORMATION
    # -------------------------------------------------

    if name and name.strip():
        place = name.strip()
        region = (state or "").strip()

    else:
        destination = get_destination(destination_id)

        if not destination:
            raise ValueError(
                f"Unknown destination: {destination_id}"
            )

        place = destination["name"].split(" (")[0]
        region = destination.get("state", "")

    query = ", ".join(
        part
        for part in (place, region, "India")
        if part
    )

    # Normalize query before creating the cache key.
    normalized_query = re.sub(
        r"\s+",
        " ",
        query.lower(),
    ).strip()

    cache_key = (
        f"{destination_key}:"
        f"{max_photos}:"
        f"{normalized_query}"
    )

    # -------------------------------------------------
    # 3. CHECK CACHE
    # -------------------------------------------------

    now = time.monotonic()

    cached = _photo_cache.get(cache_key)

    if cached and now - cached[0] < PHOTO_CACHE_TTL_SECONDS:
        return cached[1]

    if cached:
        _photo_cache.pop(cache_key, None)

    # -------------------------------------------------
    # 4. PREVENT DUPLICATE SIMULTANEOUS REQUESTS
    # -------------------------------------------------

    async with _photo_cache_lock:

        now = time.monotonic()

        cached = _photo_cache.get(cache_key)

        if cached and now - cached[0] < PHOTO_CACHE_TTL_SECONDS:
            return cached[1]

        # -------------------------------------------------
        # 5. SEARCH IMAGE PROVIDERS
        # -------------------------------------------------

        found = await search_candidates(
            query,
            max_photos,
        )

        photos = found["items"][:max_photos]

        result = {
    "status": "ok" if photos else "no_photos",
    "destination_id": destination_id,
    "photos": photos,
    "errors": found["errors"],
}

        # -------------------------------------------------
        # 6. CACHE SUCCESSFUL RESULTS
        # -------------------------------------------------

        if photos:
            _photo_cache[cache_key] = (
                time.monotonic(),
                result,
            )

            # Prevent unlimited cache growth.
            if len(_photo_cache) > 500:
                oldest = min(
                    _photo_cache,
                    key=lambda key: _photo_cache[key][0],
                )

                _photo_cache.pop(oldest, None)

        return result
