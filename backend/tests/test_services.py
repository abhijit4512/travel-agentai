import pytest

from app.agents import demo_agent
from app.services import budget, itinerary, planner


def test_budget_totals_add_up():
    b = budget.estimate_budget("munnar", 5, adults=2, requested_budget=25000)
    assert b["total_inr"] == sum(b["items"].values())
    assert b["data_quality"] == "illustrative_demo"
    assert b["within_budget"] in (True, False)


def test_budget_rejects_bad_input():
    with pytest.raises(ValueError):
        budget.estimate_budget("nowhere", 3)
    with pytest.raises(ValueError):
        budget.estimate_budget("goa", 0)


def test_itinerary_has_requested_days_and_respects_exclusions():
    it = itinerary.generate_itinerary("jaipur", 3, ["heritage"], excluded=["Hawa Mahal"])
    assert len(it["days"]) == 3
    titles = [s["title"] for d in it["days"] for s in d["slots"]]
    assert "Hawa Mahal" not in titles


def test_plan_has_alternatives():
    plan = planner.build_plan("munnar", 4, interests=["waterfalls"])
    assert plan["alternatives"] and all(a["id"] != "munnar" for a in plan["alternatives"])


def test_demo_agent_parses_budget_and_state():
    req = demo_agent.parse_request("trip to goa 3 days Rs 20,000 four people")
    assert req["days"] == 3 and req["budget"] == 20000 and req["adults"] == 4
    out = demo_agent.reply_to("5 days from Hyderabad to Kerala, nature")
    assert "munnar" in out["destination_ids"]
