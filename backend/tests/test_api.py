SESSION = {"X-Session-Id": "test-session-12345"}


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["agent_mode"] == "demo"


def test_destinations_filter(client):
    r = client.get("/api/destinations", params={"state": "Kerala"})
    assert r.status_code == 200 and r.json()["count"] >= 2


def test_unknown_destination_uses_error_format(client):
    r = client.get("/api/destinations/atlantis")
    assert r.status_code == 404 and r.json()["error"]["code"] == "http_404"


def test_photos_endpoint_returns_list(client, monkeypatch):
    from app.services import images
    monkeypatch.setattr(images, "get_photos",
                        lambda destination_id, max_photos=3: {"status": "no_photos", "destination_id": destination_id, "photos": []})
    r = client.get("/api/destinations/goa/photos")
    assert r.status_code == 200 and r.json()["photos"] == []


def test_chat_demo_mode(client):
    r = client.post("/api/chat", json={"message": "Plan 3 days in Munnar for two people"})
    body = r.json()
    assert r.status_code == 200 and body["mode"] == "demo" and body["notice"]


def test_chat_validation(client):
    r = client.post("/api/chat", json={"message": ""})
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


def test_plan_and_trip_crud_isolated_by_session(client):
    plan = client.post("/api/trips/plan", json={"destination_id": "munnar", "days": 3}).json()
    saved = client.post("/api/trips", json={"title": "Munnar", "plan": plan}, headers=SESSION)
    assert saved.status_code == 201
    trip_id = saved.json()["id"]
    assert len(client.get("/api/trips", headers=SESSION).json()) == 1
    other = {"X-Session-Id": "another-session-999"}
    assert client.get(f"/api/trips/{trip_id}", headers=other).status_code == 404
    assert client.delete(f"/api/trips/{trip_id}", headers=SESSION).status_code == 204
    assert client.get(f"/api/trips/{trip_id}", headers=SESSION).status_code == 404


def test_trips_require_session_header(client):
    assert client.get("/api/trips").status_code == 400
