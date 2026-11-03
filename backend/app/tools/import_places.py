"""
Add many places from a CSV file without touching any frontend code.

    python -m app.tools.import_places my_places.csv

CSV columns: id,name,state,tags,lat,lng,best_season,summary   (tags separated by semicolons, e.g. "temple;heritage")
State must be one of the 28 states or 8 union territories. Rows are inserted or updated in the `places` table.
Only import data you have the right to use, and keep `summary` factual (no invented prices or opening hours).
"""
from __future__ import annotations

import csv
import sys

from ..database.db import connect, init_db
from ..database.extras import init_extras
from ..services.places_seed import STATES, parse_months, slugify

NAME_TO_KIND = {name: kind for name, kind in STATES.values()}


def main(path: str) -> None:
    init_db(); init_extras()
    added = 0
    with open(path, newline="", encoding="utf-8") as f, connect() as c:
        for row in csv.DictReader(f):
            state = row["state"].strip()
            if state not in NAME_TO_KIND:
                print(f"Skipping {row['id']}: unknown state '{state}'"); continue
            tags = [t.strip() for t in row["tags"].split(";") if t.strip()]
            season = row.get("best_season", "") or ""
            text = " ".join([row["name"], state, row["summary"], " ".join(tags)]).lower()
            c.execute("""INSERT OR REPLACE INTO places (id, slug, name, name_lower, state, state_slug, kind, tags, lat, lng,
                      season, months, summary, search_text, featured, published) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,1)""",
                      (row["id"], row["id"], row["name"], row["name"].lower(), state, slugify(state), NAME_TO_KIND[state],
                       "," + ",".join(tags) + ",", float(row["lat"]), float(row["lng"]), season,
                       "," + ",".join(map(str, parse_months(season))) + ",", row["summary"], text))
            added += 1
    print(f"Imported {added} places.")


if __name__ == "__main__":
    main(sys.argv[1])
