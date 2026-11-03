from app.services import places_seed as seed


def test_seed_covers_every_state_and_ut():
    names = {p["state"] for p in seed.PLACES}
    assert names == {n for n, _ in seed.STATES.values()}
    assert len(seed.STATES) == 36


def test_seed_is_clean():
    ids = [p["id"] for p in seed.PLACES]
    assert len(ids) == len(set(ids))
    assert all(6 <= p["lat"] <= 37 and 68 <= p["lng"] <= 98 for p in seed.PLACES)
    assert all(t in seed.TAGS for p in seed.PLACES for t in p["tags"])


def test_search_filters_and_paging(client):
    r = client.get("/api/places", params={"tag": "wildlife", "page_size": 5}).json()
    assert r["total"] >= 10 and len(r["items"]) == 5 and r["pages"] >= 2
    r = client.get("/api/places", params={"state": "kerala", "q": "beach"}).json()
    assert r["items"] and all(i["state"] == "Kerala" for i in r["items"])
    assert client.get("/api/places", params={"month": 13}).status_code == 422


def test_place_detail_and_nearby(client):
    d = client.get("/api/places/uttarakhand/kedarnath")
    assert d.status_code == 200 and d.json()["guidance"] and d.json()["faqs"]
    assert "opening" in str(d.json()["faqs"]).lower()          # says hours are not stored, never invents them
    assert client.get("/api/places/kerala/nowhere").status_code == 404
    assert client.get("/api/nearby/munnar").json()["items"]


def test_states_collections_suggest(client):
    assert len(client.get("/api/states").json()["states"]) == 36
    assert client.get("/api/collections/best-beaches-in-india").json()["total"] > 10
    assert client.get("/api/places/suggest", params={"q": "tir"}).json()["suggestions"]


def test_plan_works_for_any_place(client):
    r = client.post("/api/trips/plan", json={"destination_id": "tawang", "days": 3, "pace": "relaxed"})
    assert r.status_code == 200 and r.json()["budget"]["total_inr"] > 0


def test_wishlist_roundtrip_and_sitemap(client):
    h = {"X-Session-Id": "wish-session-1234"}
    assert client.post("/api/wishlist", json={"place_id": "goa"}, headers=h).status_code == 201
    assert client.get("/api/wishlist", headers=h).json()["ids"] == ["goa"]
    assert client.delete("/api/wishlist/goa", headers=h).status_code == 204
    assert client.get("/api/wishlist", headers=h).json()["ids"] == []
    assert "<urlset" in client.get("/api/sitemap.xml").text


def test_share_link_hides_owner(client):
    h = {"X-Session-Id": "share-session-1234"}
    plan = client.post("/api/trips/plan", json={"destination_id": "goa", "days": 2}).json()
    tid = client.post("/api/trips", json={"title": "Goa", "plan": plan}, headers=h).json()["id"]
    token = client.post(f"/api/trips/{tid}/share", headers=h).json()["token"]
    shared = client.get(f"/api/share/{token}").json()
    assert shared["title"] == "Goa" and "owner" not in str(shared).lower()
    client.delete(f"/api/trips/{tid}/share", headers=h)
    assert client.get(f"/api/share/{token}").status_code == 404


def test_feedback_and_budget(client):
    assert client.post("/api/feedback", json={"kind": "incorrect_info", "message": "Wrong season listed", "place_id": "goa"}).status_code == 201
    b = client.post("/api/budget/estimate", json={"destination_id": "goa", "days": 3, "sightseeing_fees_per_adult": 500})
    assert b.status_code == 200 and b.json()["items"]["sightseeing_and_activities"] == 1000
