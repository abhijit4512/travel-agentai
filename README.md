# Yatra AI: premium India travel platform

Upgrade of the India AI Travel Agent. Backend: FastAPI + Google ADK + SQLite. Frontend: React + Vite + TypeScript.

## What is new in this version
- Full redesign with a design system (`frontend/src/styles/tokens.css`), light and dark mode, route-based code splitting.
- Homepage with rotating photo hero, trip search with autocomplete and voice, and 18 content sections.
- **All 28 states and 8 union territories**: 195 seed destinations (temples, parks, beaches, hills, heritage, islands and more), stored in SQLite and searched on the server with filters and pagination.
- Pages: Explore, States, State detail, Destination detail (`/destinations/kerala/munnar`), Collections, Map, Weekend finder, Seasonal explorer, Compare, Wishlist, Dashboard, Saved trips, Shared trip, About, Contact and feedback, Help, Privacy and Terms (drafts).
- AI concierge: floating widget and full-screen planner with markdown, destination cards, voice in and out, retry, export.
- Itinerary builder: pace, notes, reorder and remove activities, add nearby attractions, live budget recalculation, share link, print or save as PDF.
- Login and account features are kept. New: preferences, wishlist, shared trips.
- Free photos from Wikimedia Commons with author and license on every image.

Nothing from your earlier version was removed. Existing endpoints (`/api/chat`, `/api/trips`, `/api/destinations`, auth) keep their contracts.

## Important: keep your existing data
1. Extract this zip into a **new** folder (do not overwrite your old project).
2. Copy your old `backend\.env` and `backend\travel_agent.db` into the new `backend` folder. New tables are created automatically with `CREATE TABLE IF NOT EXISTS`, so your users and trips stay intact.
3. Optional safety net for your old folder: `git init; git add .; git commit -m "before upgrade"`.

## Run on Windows (PowerShell)

```powershell
# Terminal 1: backend
cd travel-agent-india\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env        # skip if you copied your old .env
uvicorn app.main:app --reload --port 8000

# Terminal 2: frontend
cd travel-agent-india\frontend
npm install
npm run dev                        # open http://localhost:5173
```

Checks:
```powershell
cd backend; pytest                 # backend tests
cd ..\frontend; npm run typecheck; npm test; npm run build
```

`.env` settings: `GOOGLE_API_KEY` (real Gemini agent), `GEMINI_MODEL`, `JWT_SECRET` (generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"`), `PUBLIC_URL`. Put your email in the `User-Agent` line of `backend/app/services/images.py` (Wikimedia asks for it). Optional `frontend\.env`: `VITE_GOOGLE_MAPS_EMBED_KEY` for an embedded route map.

## How the large catalogue works
- `backend/app/services/places_seed.py`: seed list and tag vocabulary. Loaded into the `places` table at startup.
- `GET /api/places?q&state&tag&month&page&page_size&sort` searches in SQL. The browser never downloads the full list.
- Add thousands more without touching React: `python -m app.tools.import_places my_places.csv` (columns: `id,name,state,tags,lat,lng,best_season,summary`, tags separated by `;`).
- Itineraries, budgets, weather and photos work for **every** place, because the place record is converted to a destination automatically. Nearby places become attractions.

## Honest status

**Checked in my sandbox (no internet):** Python syntax of every file; seed data integrity (36 states and UTs covered, unique ids, valid coordinates); SQL search, filters, collections, nearby, weekend distance, planner, budget and demo agent logic (run as a script); password hashing; syntax of all 50 TypeScript/TSX files; a partial TypeScript type check with stubbed library types (no real errors found beyond stub limits); markdown and text helpers.

**Not run, please test on your machine:** `pip install`, `pytest` (the API tests are written but unrun), `npm install`, `npm run build`, the real browser UI, Google ADK and Gemini calls, Wikimedia photo lookups, voice, Playwright end-to-end tests, Lighthouse and accessibility audits. Expect a few small fixes on first run. If something breaks, send me the exact error text.

**Not built yet:**
- Admin area (plan in `docs/ADMIN_PLAN.md`), role-based access.
- Password reset and email verification (need an email service).
- Multi-destination itineraries, per-day regeneration, drag-and-drop (up/down buttons are used instead).
- Server-side rendering or prerendering for SEO. Meta tags, JSON-LD, sitemap (`/api/sitemap.xml`) and `robots.txt` are included, but crawlers that skip JavaScript will see little. Consider prerendering for production.
- Hotel search, live prices, bookings, live road routes, notifications, destination videos.
- Verified details: the seed data has **no opening hours, entry fees, permit rules or ritual details on purpose**. Destination pages show general guidance by category and tell users to check official sources. Add verified details only from official sources.
- Dark-mode and mobile layouts were written carefully but not visually tested.

## Costs and limits
Gemini API (free tier then pay-per-use), Open-Meteo (free, non-commercial), Wikimedia Commons (free; keep attribution). Rate limits are in memory per process.
