# Yatra AI: India AI Travel Agent

A full-stack travel planner for trips within India.

- **Agent:** Google ADK (Python) with one coordinator agent and 10 typed tools
- **Backend:** FastAPI + Pydantic + SQLite
- **Frontend:** React + Vite + TypeScript
- **Features:** chat and browser voice, editable itineraries and INR estimates, accounts, saved trips, wishlist, travel guides, memories, and an admin dashboard

Without any API keys the app still runs in **demo mode** (clearly labelled), so you can try everything first.

## Folder layout

```
travel-agent-india/
  backend/
    app/
      main.py            FastAPI app, CORS, error format
      config.py          reads .env
      api/               routes + rate limiting + session header
      agents/            travel_agent.py (Google ADK), demo_agent.py (no-key fallback)
      tools/             travel_tools.py (functions the ADK agent can call)
      services/          budget, itinerary, weather, images, sample destination data
      schemas/           Pydantic request/response models
      database/          SQLite saved trips
    tests/               pytest tests
    requirements.txt  .env.example
  frontend/
    src/ (components, pages, services, hooks, types, styles)
    package.json  .env.example
```

## Run it on Windows (PowerShell, VS Code)

Install first: Python 3.11 or newer, and Node.js 20.19 or newer (or 22.12 or newer).

### 1. Backend (terminal 1)

```powershell
cd travel-agent-india\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

If PowerShell blocks the activate script, run once:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Check it: open http://127.0.0.1:8000/api/health and the API docs at http://127.0.0.1:8000/docs.

### 2. Frontend (terminal 2)

```powershell
cd travel-agent-india\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open http://localhost:5173 (Chrome or Edge recommended for voice).

### 3. Tests

```powershell
cd travel-agent-india\backend
.\.venv\Scripts\Activate.ps1
pytest

cd ..\frontend
npm test
npm run build
```

## Turn on the real AI and photos

Edit `backend\.env` (never commit it), then restart uvicorn. Set a persistent `JWT_SECRET` for deployments so login tokens remain valid after a server restart.

| Variable | What it enables | Where to get it |
|---|---|---|
| `GOOGLE_API_KEY` | Real Google ADK agent with Gemini | https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | Model name (default `gemini-2.5-flash`) | https://ai.google.dev/gemini-api/docs/models |

Photos use Wikimedia Commons and do not require a key. Optional: `VITE_GOOGLE_MAPS_EMBED_KEY` in `frontend\.env` enables an embedded route map (Maps Embed API). That key is visible in the browser, so restrict it by HTTP referrer in Google Cloud. Without it, the app shows Google Maps links.

`GET /api/health` shows `"agent_mode": "adk"` when the real agent is active.

## How things work

- **Chat:** browser sends the message to `POST /api/chat`. The ADK `Runner` runs the coordinator agent, which calls tools. If no key is set, `demo_agent.py` answers with simple rules and the reply says so.
- **Voice:** the mic uses the browser's speech recognition. Text appears in the input so you can edit it. Replies are read with browser speech synthesis. You can stop playback anytime. If the mic is denied or unsupported you get a message and can type. Hindi, Telugu, Tamil, Kannada and Malayalam are selectable, but support depends on your browser and device voices.
- **Images:** photos come from Wikimedia Commons with attribution and license details. If no suitable free photo is available, the app shows a labelled placeholder.
- **Budget:** `services/budget.py` uses simple rules (distance-based fares, room count, food, fees, 8% contingency). Everything is labelled "illustrative demo estimate". Live fares and hotel availability are not connected.
- **Weather:** real forecast from Open-Meteo (free, no key). If it fails, the app says so.
- **Accounts and trips:** users can register and log in; passwords are hashed. Saved trips and wishlists can also use a browser guest session (`X-Session-Id`).
- **Memories and admin:** signed-in users can manage private/shared travel albums. Admin access is granted explicitly to an existing account; customer accounts cannot sign in to the admin area.

## Status and limitations

- **Sample data:** destinations are a hand-curated catalogue, not a complete list of India. Budget figures and attraction fees are illustrative.
- **Not connected:** live train/flight/hotel inventory, in-app bookings, or road-routing times. Travel links and estimates do not book services.
- **Storage:** SQLite is used locally; use a production database and shared rate-limit store before scaling to multiple workers.
- **AI:** Google ADK/Gemini is optional. Without a configured key, the app runs in labelled demo mode. Browser speech support depends on the device and browser.
- **External services:** weather comes from Open-Meteo; destination photos come from Wikimedia Commons; nearby places use OpenStreetMap.

## Costs and restrictions

- Gemini API: free tier with limits, then pay-per-use. Check current pricing at https://ai.google.dev/pricing.
- Wikimedia Commons and OpenStreetMap have their own usage terms. Keep photo attribution visible.
- Open-Meteo: free for non-commercial use; check their terms for commercial use.

## Deployment (no Docker)

1. Frontend: `npm run build` creates `frontend/dist`. Host it on any static host (Netlify, Vercel, Cloudflare Pages, or the same server).
2. Backend: run `uvicorn app.main:app --host 0.0.0.0 --port 8000` on a VM or PaaS (Render, Railway, Azure App Service, a small Linux VPS) behind HTTPS.
3. Route `/api/*` from the frontend domain to the backend (reverse proxy), or add the frontend domain to `FRONTEND_ORIGIN` and change `api.ts` to use a full backend URL.
4. Set the environment variables in the host's settings, not in files. For many users, switch SQLite to PostgreSQL by replacing `database/db.py`.
## Admin access (optional)

1. Register a normal account in the app.
2. From the `backend` folder, activate the virtual environment and run `python -m app.tools.make_admin you@example.com`.
3. Sign in at http://localhost:5173/admin/login.
4. To remove admin access, run `python -m app.tools.make_admin you@example.com --remove`.

The backend applies its SQLite schema updates at startup. Never grant admin access to an account you do not control.
admin url http://localhost:5173/admin