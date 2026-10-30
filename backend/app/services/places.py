"""
Scalable destination catalogue.

- The seed list (places_seed.py) is loaded into the SQLite `places` table on startup.
- Search, filters and pagination run in SQL, so the browser never downloads the whole catalogue.
- To add thousands of places, insert rows into the table (see tools/import_places.py); no frontend change needed.
- Pure helpers (nearby, similar, as_destination) use the in-memory seed so budget/itinerary work without a DB.
"""
from __future__ import annotations
from urllib.parse import quote_plus

import json
import math
from datetime import datetime, timezone
from typing import Any

from ..database.db import connect
from . import places_seed as seed
from .catalog import haversine_km
from .destinations_data import BY_ID as RICH, ORIGIN_CITIES

PAGE_MAX = 48

# Illustrative cost profile per tag (INR). Used only when a place has no hand-written costs.
_PROFILES = [
    ({"wildlife"}, dict(food_pp_day=700, local_day=2500, stay_budget=2000, stay_mid=4500)),
    ({"island"}, dict(food_pp_day=1100, local_day=1500, stay_budget=2500, stay_mid=5500)),
    ({"snow", "hills"}, dict(food_pp_day=600, local_day=1500, stay_budget=1500, stay_mid=3500)),
    ({"temple"}, dict(food_pp_day=450, local_day=900, stay_budget=1000, stay_mid=2500)),
    ({"beach"}, dict(food_pp_day=800, local_day=1200, stay_budget=1500, stay_mid=3500)),
]
_DEFAULT_COST = dict(food_pp_day=650, local_day=1000, stay_budget=1300, stay_mid=3000)


def costs_for(place: dict[str, Any]) -> dict[str, int]:
    rich = RICH.get(place["id"])
    if rich:
        return {k: rich[k] for k in ("food_pp_day", "local_day", "stay_budget", "stay_mid")}
    tags = set(place["tags"])
    for needed, cost in _PROFILES:
        if tags & needed:
            return cost
    return _DEFAULT_COST


def summary(place: dict[str, Any]) -> dict[str, Any]:
    """Card-sized view. Keeps the same keys the old catalogue summary had, plus the new ones."""
    c = costs_for(place)
    return {
        "id": place["id"], "slug": place["slug"], "name": place["name"], "state": place["state"],
        "state_slug": place["state_slug"], "description": place["summary"], "interests": place["tags"],
        "tags": place["tags"], "best_season": place["best_season"], "best_months": place["months"],
        "lat": place["lat"], "lng": place["lng"], "featured": place["featured"],
        "budget_per_person_per_day_inr": {"low": int(c["food_pp_day"] * 0.8 + c["stay_budget"] / 2),
                                          "high": int(c["food_pp_day"] * 1.6 + c["stay_mid"] / 2),
                                          "quality": "illustrative_demo"},
        "source": seed.SOURCE_NOTE,
    }


# ---------- database loading and search ----------

def seed_db() -> int:
    """Insert or update the seed rows. Rows you add yourself (different ids) are left alone."""
    with connect() as c:
        for p in seed.PLACES:
            text = " ".join([p["name"], p["state"], p["summary"], " ".join(p["tags"])]).lower()
            c.execute("""INSERT OR REPLACE INTO places
                (id, slug, name, name_lower, state, state_slug, kind, tags, lat, lng, season, months, summary,
                 search_text, featured, published) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)""",
                      (p["id"], p["slug"], p["name"], p["name"].lower(), p["state"], p["state_slug"], p["kind"],
                       "," + ",".join(p["tags"]) + ",", p["lat"], p["lng"], p["best_season"],
                       "," + ",".join(map(str, p["months"])) + ",", p["summary"], text, int(p["featured"])))
    return len(seed.PLACES)


def _row_to_place(r) -> dict[str, Any]:
    return {"id": r["id"], "slug": r["slug"], "name": r["name"], "state": r["state"], "state_slug": r["state_slug"],
            "tags": [t for t in r["tags"].split(",") if t], "lat": r["lat"], "lng": r["lng"],
            "best_season": r["season"], "months": [int(m) for m in r["months"].split(",") if m],
            "summary": r["summary"], "featured": bool(r["featured"])}


def search(q: str = "", state: str = "", tag: str = "", tags_any: list[str] | None = None,
           states: list[str] | None = None, month: int | None = None, ids: list[str] | None = None,
           featured: bool = False, sort: str = "relevance", page: int = 1, page_size: int = 12) -> dict[str, Any]:
    where, args = ["published=1"], []
    for word in q.lower().split()[:5]:
        where.append("search_text LIKE ?"); args.append(f"%{word}%")
    if state:
        where.append("(state_slug=? OR lower(state)=?)"); args += [state.lower(), state.lower()]
    if states:
        where.append(f"state IN ({','.join('?' * len(states))})"); args += states
    if tag:
        where.append("tags LIKE ?"); args.append(f"%,{tag},%")
    if tags_any:
        where.append("(" + " OR ".join("tags LIKE ?" for _ in tags_any) + ")"); args += [f"%,{t},%" for t in tags_any]
    if month:
        where.append("months LIKE ?"); args.append(f"%,{int(month)},%")
    if ids:
        where.append(f"id IN ({','.join('?' * len(ids))})"); args += ids
    if featured:
        where.append("featured=1")
    page, page_size = max(1, page), max(1, min(page_size, PAGE_MAX))
    order = "name_lower" if sort == "name" else "featured DESC, name_lower"
    if q and sort == "relevance":
        order = "(name_lower LIKE ?) DESC, featured DESC, name_lower"
        order_args = [q.lower().split()[0] + "%"]
    else:
        order_args = []
    sql_where = " AND ".join(where)
    with connect() as c:
        total = c.execute(f"SELECT COUNT(*) FROM places WHERE {sql_where}", args).fetchone()[0]
        rows = c.execute(f"SELECT * FROM places WHERE {sql_where} ORDER BY {order} LIMIT ? OFFSET ?",
                         args + order_args + [page_size, (page - 1) * page_size]).fetchall()
    return {"items": [summary(_row_to_place(r)) for r in rows], "total": total, "page": page,
            "page_size": page_size, "pages": max(1, math.ceil(total / page_size))}


def get_by_slug(state_slug: str, slug: str) -> dict[str, Any] | None:
    with connect() as c:
        r = c.execute("SELECT * FROM places WHERE state_slug=? AND slug=? AND published=1", (state_slug, slug)).fetchone()
    return _row_to_place(r) if r else None


def list_states() -> list[dict[str, Any]]:
    with connect() as c:
        rows = c.execute("SELECT state, state_slug, kind, COUNT(*) n FROM places WHERE published=1 "
                         "GROUP BY state_slug ORDER BY state").fetchall()
    return [{"name": r["state"], "slug": r["state_slug"], "type": r["kind"], "count": r["n"]} for r in rows]


def tag_counts() -> list[dict[str, Any]]:
    with connect() as c:
        rows = c.execute("SELECT tags FROM places WHERE published=1").fetchall()
    counts: dict[str, int] = {}
    for r in rows:
        for t in r["tags"].split(","):
            if t:
                counts[t] = counts.get(t, 0) + 1
    return [{"id": t, "label": seed.TAGS.get(t, t.title()), "count": n}
            for t, n in sorted(counts.items(), key=lambda kv: -kv[1])]


def suggest(q: str, limit: int = 8) -> list[dict[str, str]]:
    q = q.strip().lower()
    if len(q) < 2:
        return []
    with connect() as c:
        rows = c.execute("SELECT id, name, state, state_slug, slug FROM places WHERE published=1 AND "
                         "(name_lower LIKE ? OR search_text LIKE ?) ORDER BY (name_lower LIKE ?) DESC, featured DESC, name_lower LIMIT ?",
                         (f"{q}%", f"%{q}%", f"{q}%", limit)).fetchall()
    return [{"id": r["id"], "name": r["name"], "state": r["state"], "state_slug": r["state_slug"], "slug": r["slug"]} for r in rows]


# ---------- collections ----------
NORTH_EAST = ["Arunachal Pradesh", "Assam", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Sikkim", "Tripura"]
SOUTH = ["Andhra Pradesh", "Telangana", "Karnataka", "Kerala", "Tamil Nadu"]
HIMALAYA = ["Himachal Pradesh", "Uttarakhand", "Jammu and Kashmir", "Ladakh", "Sikkim", "Arunachal Pradesh"]
COLLECTIONS = [
    {"slug": "temples-of-south-india", "title": "Best temples in South India", "blurb": "Great temple towns from Tirumala to Kanyakumari.", "tag": "temple", "states": SOUTH, "cover": "meenakshi-temple"},
    {"slug": "best-beaches-in-india", "title": "Best beaches in India", "blurb": "From Goa's shacks to quiet Konkan and Andaman sands.", "tag": "beach", "cover": "palolem"},
    {"slug": "top-national-parks", "title": "Top national parks and tiger reserves", "blurb": "Forests where safaris are run under forest department rules.", "tag": "wildlife", "cover": "kaziranga"},
    {"slug": "hidden-gems-northeast", "title": "Hidden gems of Northeast India", "blurb": "Living root bridges, valleys and monasteries.", "states": NORTH_EAST, "cover": "meghalaya"},
    {"slug": "heritage-trails", "title": "Heritage trails", "blurb": "Forts, palaces and UNESCO sites across India.", "tags_any": ["heritage", "fort"], "cover": "hampi"},
    {"slug": "himalayan-adventures", "title": "Himalayan adventures", "blurb": "Treks, snow and high passes.", "tags_any": ["trekking", "snow", "adventure"], "states": HIMALAYA, "cover": "manali"},
    {"slug": "budget-weekend-escapes", "title": "Weekend escapes", "blurb": "Short getaways that work for two or three days.", "tag": "weekend", "cover": "lonavala"},
    {"slug": "honeymoon-destinations", "title": "Romantic and honeymoon destinations", "blurb": "Quiet hills, beaches and island stays.", "tag": "honeymoon", "cover": "munnar"},
    {"slug": "family-friendly", "title": "Family-friendly destinations", "blurb": "Easy trips with something for every age.", "tag": "family", "cover": "ooty"},
    {"slug": "offbeat-india", "title": "Hidden gems of India", "blurb": "Less-visited places beyond the usual circuit.", "tag": "offbeat", "cover": "ziro-valley"},
]


def collection_items(slug: str, page: int = 1, page_size: int = 24) -> dict[str, Any] | None:
    col = next((c for c in COLLECTIONS if c["slug"] == slug), None)
    if col is None:
        return None
    res = search(tag=col.get("tag", ""), tags_any=col.get("tags_any"), states=col.get("states"), page=page, page_size=page_size)
    return {"collection": {k: col[k] for k in ("slug", "title", "blurb", "cover")}, **res}


# ---------- pure helpers over the in-memory seed ----------

def distance_to(place: dict[str, Any], lat: float, lng: float) -> float:
    return haversine_km(place["lat"], place["lng"], lat, lng)


def nearby(place_id: str, radius_km: float = 120, limit: int = 8) -> list[dict[str, Any]]:
    base = seed.PLACE_BY_ID.get(place_id)
    if base is None:
        return []
    found = sorted(((distance_to(p, base["lat"], base["lng"]), p) for p in seed.PLACES if p["id"] != place_id),
                   key=lambda t: t[0])
    return [{**summary(p), "distance_km": round(d, 1), "distance_kind": "straight_line_estimate"}
            for d, p in found if d <= radius_km][:limit]


def similar(place_id: str, limit: int = 4) -> list[dict[str, Any]]:
    base = seed.PLACE_BY_ID.get(place_id)
    if base is None:
        return []
    mine = set(base["tags"])
    scored = sorted(((len(mine & set(p["tags"])), p["featured"], p) for p in seed.PLACES if p["id"] != place_id and p["state"] != base["state"]),
                    key=lambda t: (-t[0], not t[1]))
    return [summary(p) for s, _, p in scored if s > 0][:limit]


def from_city(origin_city: str, max_km: float, tag: str = "", limit: int = 24) -> list[dict[str, Any]]:
    o = ORIGIN_CITIES.get(origin_city.strip().lower())
    if o is None:
        raise ValueError(f"Unknown origin city. Try one of: {', '.join(sorted(c.title() for c in ORIGIN_CITIES))}.")
    found = sorted(((distance_to(p, *o), p) for p in seed.PLACES if not tag or tag in p["tags"]), key=lambda t: t[0])
    return [{**summary(p), "distance_km": round(d), "distance_kind": "straight_line_estimate"}
            for d, p in found if 5 < d <= max_km][:limit]


def match_ids_in_text(text: str, limit: int = 4) -> list[str]:
    low = text.lower()
    hits = [(low.index(p["name"].lower().split(" (")[0]), p["id"]) for p in seed.PLACES
            if len(p["name"]) > 3 and p["name"].lower().split(" (")[0] in low]
    return [pid for _, pid in sorted(hits)][:limit]


def as_destination(place_id: str) -> dict[str, Any] | None:
    """Build the richer 'destination' shape (attractions, costs) for any place so budget/itinerary/weather work."""
    p = seed.PLACE_BY_ID.get(place_id)
    if p is None:
        return None
    near = nearby(place_id, radius_km=60, limit=5) or nearby(place_id, radius_km=200, limit=5)
    attractions = [{"name": f"Main visit: {p['name']}", "hours": 3, "fee_inr": 0, "fee_known": False,
                    "lat": p["lat"], "lng": p["lng"], "tags": p["tags"]}]
    attractions += [{"name": n["name"], "hours": 2, "fee_inr": 0, "fee_known": False,
                     "lat": n["lat"], "lng": n["lng"], "tags": n["tags"]} for n in near]
    return {"id": p["id"], "name": p["name"], "state": p["state"], "lat": p["lat"], "lng": p["lng"],
            "interests": p["tags"], "description": p["summary"], "best_season": p["best_season"],
            **costs_for(p), "attractions": attractions,
            "food": [],     # no verified food data for seed places; the itinerary then shows free time instead
            "tips": ["Confirm entry rules, timings and any permits on official websites before you go."]}


# ---------- general guidance by tag (NOT verified facts about a specific site) ----------
GUIDANCE = {
    "temple": ["Dress modestly and expect shoes to be removed. Rules differ by temple, so check the official site.",
               "Darshan timings, special entry tickets and photography rules change; confirm with the temple's official channels.",
               "Peak festival days are very crowded. Book stays early and allow extra time."],
    "wildlife": ["Safaris run under forest department rules. Book only through official portals and carry the ID the booking needs.",
                 "Parks often close part of the year (commonly the monsoon). Check the current season on the official site.",
                 "Sightings are never guaranteed. Follow guides, keep distance and never leave the vehicle in restricted areas."],
    "beach": ["Swimming conditions vary by season and tide. Follow lifeguard flags and local warnings.",
              "Check local rules for water sports and always use licensed operators.",
              "Sea and weather conditions are not available live here; check local advisories."],
    "hills": ["Mountain weather changes quickly. Check road and weather updates before travelling.",
              "Carry layers, even in summer. Mountain roads can be slow, so allow buffer time."],
    "snow": ["Roads can close in snow. Confirm access with local authorities before you travel.",
             "Rent or carry proper winter clothing and footwear."],
    "trekking": ["Hire registered guides where required and register at checkpoints.",
                 "Acclimatise on high routes and turn back if you feel unwell."],
    "island": ["Ferry and flight schedules depend on weather. Keep spare days in your plan.",
               "Some islands need entry permits or have protected zones. Confirm with the local administration."],
    "heritage": ["Many monuments have ticket systems for domestic and foreign visitors; check the official site for current prices and hours.",
                 "Visit early in the day, since sites are often open-air with little shade."],
    "fort": ["Expect stairs and uneven paths. Wear good shoes."],
    "desert": ["Daytime heat can be extreme; plan outdoor time for early morning or evening and carry water."],
    "waterfall": ["Waterfalls can be dangerous after rain. Respect local barriers and warnings."],
    "lake": ["Boating is usually run by licensed operators; check safety gear before you board."],
    "cave": ["Caves can be slippery and dark. Wear shoes with grip and carry a light."],
}


def guidance_for(tags: list[str]) -> list[str]:
    out: list[str] = []
    for t in tags:
        for g in GUIDANCE.get(t, []):
            if g not in out:
                out.append(g)
    return out[:8] or ["Check official sources for timings, entry rules and any permits before you travel."]


def suggested_days(tags: list[str]) -> str:
    if {"wildlife", "island", "trekking"} & set(tags):
        return "3 to 5 days"
    if {"hills", "beach", "backwaters", "lake"} & set(tags):
        return "2 to 4 days"
    return "1 to 2 days"

def official_links(place: dict[str, Any]) -> list[dict[str, str]]:
    """Pointers to where verified details (hours, fees, permits) live. No facts are invented here."""
    name, state, tags = place["name"].split(" (")[0], place["state"], set(place["tags"])
    search = lambda q: "https://www.google.com/search?q=" + quote_plus(q)
    links = [
        {"label": f"Search for the official {name} website", "url": search(f"{name} {state} official website"), "kind": "search"},
        {"label": f"{state} tourism department (search)", "url": search(f"{state} tourism department official website"), "kind": "search"},
        {"label": "Incredible India (Ministry of Tourism)", "url": "https://www.incredibleindia.gov.in", "kind": "official"},
    ]
    if tags & {"heritage", "fort"}:
        links.append({"label": "Archaeological Survey of India (for protected monuments)", "url": "https://asi.nic.in", "kind": "official"})
    if "wildlife" in tags:
        links.append({"label": f"{name} safari booking and rules (search)", "url": search(f"{name} forest department safari booking official"), "kind": "search"})
    if "temple" in tags:
        links.append({"label": f"{name} darshan timings and rules (search)", "url": search(f"{name} official website darshan timings"), "kind": "search"})
    return links
def detail(place: dict[str, Any]) -> dict[str, Any]:
    s = summary(place)
    tags = place["tags"]
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return {
        **s,
        "overview": f"{place['summary']} It is in {place['state']}.",
        "reasons_to_visit": [seed.TAGS.get(t, t.title()) for t in tags][:5],
        "best_months_text": ", ".join(months[m - 1] for m in place["months"]),
        "suggested_duration": suggested_days(tags),
        "guidance": guidance_for(tags),
        "faqs": [
            {"q": f"When is the best time to visit {place['name']}?",
             "a": f"General guidance is {place['best_season']}. Weather, closures and crowds change by year, so check current local information."},
                        {"q": "What are the opening hours and entry fees?",
             "a": "We do not list them because they change often and a wrong time can spoil a trip. Open the official links in 'Check official information' on this page, or ask the local tourism office, to confirm hours, fees, permits and booking before you go."},
            {"q": "How do I get there?",
             "a": "Use the map link on this page and check the nearest airport or railway station on official transport sites. This app does not show live schedules or fares."},
        ],
        "nearby": nearby(place["id"]),
        "official_links": official_links(place),
        "similar": similar(place["id"]),
        "last_reviewed": "Seed data. Not independently verified.",
    }
