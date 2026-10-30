"""
Destination photos from Wikimedia Commons (free, no API key, no subscription).

Photos are openly licensed (Creative Commons / public domain). Each photo comes with its
author and license so the website can show the required attribution.
Docs: https://www.mediawiki.org/wiki/API:Search and https://commons.wikimedia.org/wiki/Commons:Reuse
"""
from __future__ import annotations

import html
import logging
import re
from typing import Any

import httpx

from .catalog import get_destination

log = logging.getLogger(__name__)
API_URL = "https://commons.wikimedia.org/w/api.php"
# Wikimedia asks every app to send a descriptive User-Agent. Put your own contact here.
HEADERS = {"User-Agent": "YatraAI/1.0 (student travel project; contact: your-email@example.com)"}
_cache: dict[tuple[str, int], dict[str, Any]] = {}       # (destination_id, limit) -> successful result


def _clean(text: str) -> str:
    """Wikimedia returns author names as HTML, so strip the tags."""
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def _is_free_license(name: str) -> bool:
    n = name.lower()
    return n.startswith("cc") or "public domain" in n or n.startswith("pd")


def get_photos(destination_id: str, max_photos: int = 3) -> dict[str, Any]:
    dest = get_destination(destination_id)
    if dest is None:
        raise ValueError(f"Unknown destination '{destination_id}'.")
    max_photos = max(1, min(max_photos, 12))
    cache_key = (dest["id"], max_photos)
    if cache_key in _cache:
        return _cache[cache_key]

    place = dest["name"].split(" (")[0]            # "Alleppey (Alappuzha)" -> "Alleppey"
    keyword = place.split()[0].lower()             # file title must contain this, so photos match the place
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": f"{place} filetype:bitmap", "gsrnamespace": 6, "gsrlimit": 30,
        "prop": "imageinfo", "iiprop": "url|extmetadata|mime|size", "iiurlwidth": 1200,
        "iiextmetadatafilter": "Artist|LicenseShortName|LicenseUrl",
    }
    try:
        resp = httpx.get(API_URL, params=params, headers=HEADERS, timeout=8.0)
        resp.raise_for_status()
        pages = resp.json().get("query", {}).get("pages", {})
    except (httpx.HTTPError, ValueError) as exc:
        log.warning("Commons lookup failed for %s: %s", dest["id"], type(exc).__name__)
        return {"status": "unavailable", "destination_id": dest["id"], "photos": [],
                "message": "Photos could not be loaded right now."}

    photos = []
    for page in sorted(pages.values(), key=lambda p: p.get("index", 999)):   # best search match first
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        license_name = _clean(meta.get("LicenseShortName", {}).get("value", ""))
        if (keyword not in page.get("title", "").lower()
                or info.get("mime") not in ("image/jpeg", "image/png")
                or info.get("width", 0) < info.get("height", 1)       # landscape photos only
                or info.get("width", 0) < 800
                or not _is_free_license(license_name)
                or not info.get("thumburl")):
            continue
        photos.append({
            "url": info["thumburl"],                                  # served directly by Wikimedia
            "alt": f"Photo of {place}, {dest['state']}, India",
            "attribution": _clean(meta.get("Artist", {}).get("value", "")) or "Wikimedia Commons contributor",
            "attribution_uri": info.get("descriptionurl", ""),        # Commons page for this file
            "provider": "Wikimedia Commons",
            "license": license_name,
            "license_uri": meta.get("LicenseUrl", {}).get("value", ""),
        })
        if len(photos) >= max_photos:
            break

    result = {"status": "ok" if photos else "no_photos", "destination_id": dest["id"], "photos": photos}
    if photos:
        _cache[cache_key] = result
    return result
