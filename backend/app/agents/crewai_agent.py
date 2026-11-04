"""Optional CrewAI implementation of the travel-planning agent."""
from __future__ import annotations

from functools import wraps
from importlib.util import find_spec
from inspect import signature
from typing import Any, get_type_hints

from ..config import settings
from ..services.destinations_data import DESTINATIONS
from ..tools.travel_tools import ALL_TOOLS


INSTRUCTION = """
Plan trips within India for Indian travellers, using INR (Rs) for all money.
Use the provided tools for destinations, attractions, budget and weather, and prefer their
results over memory. The catalogue is only a sample of India; clearly label general knowledge
when a place is not in it. Budget figures are illustrative estimates, never live prices.
Do not invent live ticket prices, hotel availability, schedules or booking confirmations;
you cannot book anything. Weather must come from the weather tool, and if unavailable say it
could not be verified. Reply in the user's language, keep the answer short and speakable,
mention destination names exactly as listed in the catalogue, and end with one helpful suggestion.
If destination, trip length, traveller count or budget is missing, ask one short follow-up question.
""".strip()


def crewai_available() -> bool:
    return find_spec("crewai") is not None


def _convert_tool(function: Any, tool_factory: Any) -> Any:
    @wraps(function)
    def invoke(*args: Any, **kwargs: Any) -> Any:
        return function(*args, **kwargs)

    annotations = get_type_hints(function)
    invoke.__annotations__ = annotations
    original_signature = signature(function)
    invoke.__signature__ = original_signature.replace(
        parameters=[
            parameter.replace(annotation=annotations.get(parameter.name, parameter.annotation))
            for parameter in original_signature.parameters.values()
        ],
        return_annotation=annotations.get("return", original_signature.return_annotation),
    )
    return tool_factory(function.__name__)(invoke)


def run_agent(message: str, session_id: str | None = None) -> dict[str, Any]:
    """Run a single-agent CrewAI crew using the configured Gemini model."""
    del session_id  # CrewAI runs are request-scoped; the API still preserves the caller's session id.
    from crewai import Agent, Crew, LLM, Process, Task
    from crewai.tools import tool

    tools = [_convert_tool(function, tool) for function in ALL_TOOLS]
    llm = LLM(model=f"gemini/{settings.gemini_model}", api_key=settings.google_api_key)
    agent = Agent(
        role="India Travel Planner",
        goal="Give travellers a concise, accurate trip plan grounded in the provided catalogue and tools.",
        backstory=INSTRUCTION,
        llm=llm,
        tools=tools,
        verbose=False,
    )
    task = Task(
        description=f"Respond to this travel-planning request:\n\n{message}",
        expected_output="A concise, helpful travel-planning response in the user's language.",
        agent=agent,
    )
    result = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False).kickoff()
    final_text = str(getattr(result, "raw", result)).strip()
    if not final_text:
        raise RuntimeError("The CrewAI agent returned no final text.")

    low = final_text.lower()
    ids = [d["id"] for d in DESTINATIONS if d["name"].lower().split(" (")[0] in low][:4]
    return {"reply": final_text, "destination_ids": ids}
