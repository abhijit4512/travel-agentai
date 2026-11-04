# Yatra AI: India AI Travel Agent

A full-stack travel planner for trips within India.

- **Agent:** Google ADK by default, with an optional CrewAI provider; both use one travel-planner agent and the same tools
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
      agents/            travel_agent.py (Google ADK), crewai_agent.py (optional CrewAI), demo_agent.py (no-key fallback)
      tools/             travel_tools.py (shared tools for both agent frameworks)
      services/          budget, itinerary, weather, images, sample destination data
      schemas/           Pydantic request/response models
      database/          SQLite saved trips
    tests/               pytest tests
    requirements.txt  requirements-crewai.txt (optional)  .env.example
  frontend/
    src/ (components, pages, services, hooks, types, styles)
    package.json  .env.example
```

## Agent providers

The backend supports two real agent frameworks, both using Google Gemini, plus a no-key demo
fallback:

| Provider | Framework | Default | Requirements |
|---|---|---:|---|
| `adk` | Google Agent Development Kit | Yes | `GOOGLE_API_KEY`, `google-adk` from `requirements.txt` |
| `crewai` | CrewAI | No | `GOOGLE_API_KEY`, optional CrewAI dependencies, Python 3.10–3.13 |
| `demo` | Local rule-based reply; not an LLM | Automatic fallback | No AI key |

`AGENT_PROVIDER` selects the real framework (`adk` or `crewai`). The default is `adk`, so
existing installations continue to use the current agent unless you change the setting. The
selected framework uses the same destination catalogue and ten travel tools. The CrewAI
integration is one planner agent with one sequential task; it is not a multi-agent crew.

The application selects demo mode when the Gemini key is missing or the selected framework
isn't installed. If a real agent fails during a chat request (for example, because of an
invalid key or a provider/network error), the backend logs the error and returns a clearly
labelled demo reply. `GET /api/health` reports the selected mode and whether the frameworks
are installed. A health response does not test whether a Gemini key is valid or make a model
request.

## Run it on Windows (PowerShell, VS Code)

For the standard app, install Python 3.11 or newer and Node.js 20.19 or newer (or 22.12 or
newer). To use CrewAI, use a separate Python 3.13 environment as described below; the current
CrewAI release requires Python 3.10 through 3.13 and does not support Python 3.14 or newer.

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
python -m pytest

cd ..\frontend
npm test
npm run build
```

## Enable Gemini

The ADK and CrewAI providers both use a Google Gemini API key. Create one in
[Google AI Studio](https://aistudio.google.com/apikey), then edit `backend\.env`. Keep this
file private: it contains secrets and must not be committed. Restart the backend after
changing environment settings.

| Variable | Description | Example |
|---|---|---|
| `GOOGLE_API_KEY` | Gemini API key for either real agent provider | Get it from [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Gemini model name used by the selected provider | `gemini-2.5-flash` |
| `AGENT_PROVIDER` | Framework to run: `adk` or `crewai` | `adk` |

Set the environment values in `backend\.env`, for example:

```dotenv
GOOGLE_API_KEY=your-google-ai-studio-key
GEMINI_MODEL=gemini-2.5-flash
AGENT_PROVIDER=adk
```

`GEMINI_MODEL` must name a model available to your Google AI Studio account. Check
[Google's model list](https://ai.google.dev/gemini-api/docs/models) if a model request fails.

## Set up the CrewAI agent

CrewAI is an optional dependency and is not installed by the normal `pip install -r
requirements.txt` command. Install it in a dedicated environment so it does not replace or
alter the environment you use for the default ADK setup. CrewAI's current supported Python
range is `>=3.10,<3.14`; Python 3.13 is recommended for this project. On Windows, install
Python 3.13 if it is not already available. You can list Python versions registered with the
Windows launcher using `py -0p`.

### 1. Create the CrewAI environment

Run these commands from the repository's `backend` folder:

```powershell
cd travel-agent-india\backend
py -3.13 --version
py -3.13 -m venv .venv-crewai
.\.venv-crewai\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install -r requirements-crewai.txt
```

If PowerShell blocks activation, enable script execution for your user in a PowerShell
terminal, then activate the environment again:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\.venv-crewai\Scripts\Activate.ps1
```

To confirm which interpreter is active, run `python --version` and
`python -c "import sys; print(sys.executable)"`. The path should point to
`backend\.venv-crewai`.

### 2. Configure the provider and API key

If you do not already have `backend\.env`, create it from the example. This preserves an
existing `.env` rather than overwriting it:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Set these values in `backend\.env`:

```dotenv
GOOGLE_API_KEY=your-google-ai-studio-key
GEMINI_MODEL=gemini-2.5-flash
AGENT_PROVIDER=crewai
```

Replace the example key with your actual key. Do not put the key in frontend files, source
control, screenshots, or chat messages. The backend reads the key; it is not sent to the
browser. Keep the rest of the `.env` settings as needed for your app (database, allowed
frontend origin, and authentication).

### 3. Start the backend with the CrewAI environment

Open a new PowerShell terminal, or activate `.venv-crewai` in the terminal you will use to
run the backend. Start from the `backend` folder:

```powershell
cd travel-agent-india\backend
.\.venv-crewai\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

Keep this terminal open. To run the frontend, use a second terminal and follow the frontend
steps under [Run it on Windows](#run-it-on-windows-powershell-vs-code).

### 4. Verify CrewAI is selected

Open `http://127.0.0.1:8000/api/health` or run this in PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health | Format-List
```

When the provider is installed and the key is configured, expect:

```text
agent_mode      : crewai
crewai_installed: True
gemini_key_set  : True
```

The health endpoint checks configuration and package availability, not whether the key
authenticates successfully. To exercise a real chat request, try the frontend chat or run:

```powershell
$body = @{ message = "Plan 3 days in Munnar for two people" } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/chat `
  -ContentType "application/json" `
  -Body $body
```

The response's `mode` should be `crewai` for a successful AI response. If the agent fails,
the backend logs the failure and the response switches to `demo`, includes a `notice`, and
uses the local demo planner.

### 5. Switch back to ADK or demo mode

To use ADK again, set `AGENT_PROVIDER=adk` in `backend\.env`, activate the environment where
`google-adk` is installed (normally `.venv`), and restart the backend. To use the no-key demo,
clear `GOOGLE_API_KEY` and restart. The demo provider does not call an LLM.

### CrewAI troubleshooting

| Symptom | What to check |
|---|---|
| CrewAI installation says Python is unsupported | Confirm the active environment uses Python 3.10–3.13. Python 3.14+ is not supported by the current CrewAI release. |
| Health reports `agent_mode: demo` and `crewai_installed: False` | Activate `.venv-crewai`, install `requirements-crewai.txt` there, and restart the backend from that same environment. |
| Health reports `gemini_key_set: False` | Check `GOOGLE_API_KEY` in `backend\.env`; restart after editing it. Do not include quotes or placeholder text in place of the real key. |
| Health reports `agent_mode: crewai`, but chat returns `mode: demo` | Check the backend terminal logs for the CrewAI/Gemini error. Verify the key, model name, network access, and Google AI Studio account/model access. |
| The request still uses ADK | Check that `AGENT_PROVIDER=crewai` is spelled correctly in `backend\.env`, then fully restart the backend. |
| `py -3.13` cannot find Python | Install Python 3.13 and confirm it appears in `py -0p`; then create the virtual environment again. |

Do not install CrewAI into Python 3.14 or newer or assume an installation into one virtual
environment is visible from another. Install the optional requirements and launch the server
using the same `.venv-crewai` interpreter.

## Photos and maps

Photos use Wikimedia Commons and include attribution and license details; photos do not
require an API key. Optional: `VITE_GOOGLE_MAPS_EMBED_KEY` in `frontend\.env` enables an
embedded route map (Maps Embed API). That key is visible in the browser, so restrict it by
HTTP referrer in Google Cloud. Without it, the app shows Google Maps links.

## How things work

- **Chat and provider selection:** the browser sends a message to `POST /api/chat`. The backend uses `AGENT_PROVIDER` to choose ADK or CrewAI when `GOOGLE_API_KEY` is configured and the selected package is installed. Otherwise, or after a real agent error, `demo_agent.py` supplies a clearly labelled local reply. The response includes the active `mode`.
- **CrewAI structure:** `crewai_agent.py` creates one India Travel Planner agent and one sequential task for each request. It uses the configured Gemini model and adapts the app's shared travel tools to CrewAI tools. The API session ID is returned to the caller, but the CrewAI implementation does not persist conversation history between requests; treat each chat request as a standalone prompt.
- **Shared travel tools:** both agent frameworks can use the tools in `backend\app\tools\travel_tools.py`:
  - `search_destinations` — search the small sample catalogue by text, interest or state.
  - `get_destination_details` — look up a catalogue destination's summary, attractions, food and tips.
  - `search_attractions` — list attractions, optionally filtered by interest.
  - `get_place_photos` — fetch licensed destination photos when the image provider can supply them.
  - `get_route_information` — estimate straight-line distance between two listed attractions; this is not a road route or travel time.
  - `estimate_trip_budget` — calculate an illustrative INR budget, not live pricing.
  - `get_weather_forecast` — request a real forecast from the weather service; if it is unavailable, the agent should say it could not be verified.
  - `search_transport_options` — show indicative transport estimates, not live schedules or fares.
  - `search_accommodation_options` — show typical catalogue price estimates, not live availability or hotel prices.
  - `generate_itinerary` — build a day-by-day itinerary from the sample catalogue.
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
- **AI:** Google ADK/Gemini is the default; CrewAI/Gemini is optional and requires a separate compatible Python environment and installation. Without a configured key or available selected provider, the app runs in labelled demo mode. Browser speech support depends on the device and browser.
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