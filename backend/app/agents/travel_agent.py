"""
Google ADK travel agent.

One coordinator agent + modular tools (see tools/travel_tools.py). This is the recommended
starting point; specialist sub-agents can be added later via `sub_agents=[...]`.

ADK API used (google-adk, see https://google.github.io/adk-docs/):
    Agent / LlmAgent, Runner, InMemorySessionService, google.genai.types.Content
NOTE: ADK changes quickly. If an import or call below fails after an upgrade, compare with the
official docs for your installed version (`pip show google-adk`).
"""
from __future__ import annotations

import logging
import uuid

from ..config import settings
from ..services import places
from ..services.catalog import match_destination_in_text

log = logging.getLogger(__name__)
APP_NAME = "india_travel_agent"

INSTRUCTION = """
You are an India travel planner for Indian travellers. Use INR (Rs) for all money.

How to work:
1. If destination, number of days, number of travellers or budget is missing, ask ONE short follow-up question first.
2. Use the tools to look up destinations, attractions, budget, and weather. Prefer tool results over your own memory.
3. destination ids come from search_destinations. The catalogue is a seed list covering every state and union territory, not every place in India. If the user wants a place
   that is not in it, say so and give general suggestions clearly marked as general knowledge.
4. Budget tool results are illustrative demo estimates. Say they are estimates, never live prices.
   Never invent live ticket prices, hotel availability, train schedules or booking confirmations.
   You cannot book anything.
5. Weather comes only from get_weather_forecast. If it is unavailable, say it could not be verified.
6. Reply in the language the user writes in. Keep answers short and speakable: no tables, no long markdown,
   no emoji. Mention destination names exactly as in the catalogue so the app can show photos.
7. End with one helpful follow-up suggestion.
""".strip()

_runner = None
_session_service = None


def adk_available() -> bool:
    try:
        import google.adk  # noqa: F401
        return True
    except ImportError:
        return False


def _get_runner():
    """Create the agent and runner once (lazy so the app starts without ADK installed)."""
    global _runner, _session_service
    if _runner is None:
        from google.adk.agents import Agent
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService

        from ..tools.travel_tools import ALL_TOOLS

        # The Gemini API key is read by the google-genai library from GOOGLE_API_KEY.
        agent = Agent(name="travel_planner", model=settings.gemini_model,
                      description="Plans trips within India.", instruction=INSTRUCTION, tools=ALL_TOOLS)
        _session_service = InMemorySessionService()
        _runner = Runner(agent=agent, app_name=APP_NAME, session_service=_session_service)
    return _runner, _session_service


async def run_agent(message: str, session_id: str | None) -> dict:
    """Send one user message through the ADK runner and return the final text."""
    from google.genai import types

    runner, sessions = _get_runner()
    session_id = session_id or uuid.uuid4().hex
    user_id = session_id                       # guest session = user, so sessions stay isolated
    if await sessions.get_session(app_name=APP_NAME, user_id=user_id, session_id=session_id) is None:
        await sessions.create_session(app_name=APP_NAME, user_id=user_id, session_id=session_id)

    content = types.Content(role="user", parts=[types.Part(text=message)])
    final_text = ""
    async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=content):
        if event.is_final_response() and event.content and event.content.parts:
            final_text = "".join(p.text or "" for p in event.content.parts)
    if not final_text:
        raise RuntimeError("The agent returned no final text.")

    ids = places.match_ids_in_text(final_text, 4)
    if not ids and (d := match_destination_in_text(final_text)):
        ids = [d["id"]]
    return {"reply": final_text, "session_id": session_id, "destination_ids": ids}
