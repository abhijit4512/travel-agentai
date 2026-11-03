import io

from app.database.db import connect

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 64


def _user(client, email):
    r = client.post("/api/auth/register", json={"name": "Asha Rao", "email": email, "password": "secret-pass-1"})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_vehicles_and_fuel_are_labelled_not_live(client):
    v = client.get("/api/travel/vehicles").json()
    assert len(v["vehicles"]) >= 10 and "indicative" in v["note"].lower()
    p = client.get("/api/travel/fuel/price?city=hyderabad&fuel=petrol").json()
    assert p["status"] == "manual_reference" and "NOT LIVE" in p["note"]
    assert client.get("/api/travel/fuel/price?fuel=gold").status_code == 422


def test_roadtrip_matches_the_formula(client):
    body = {"stops": [{"city": "Hyderabad"}, {"city": "Chennai"}], "vehicle_ids": ["city-petrol"], "fuel_prices_override": {"petrol": 105},
            "distance_override_km": 600, "mileage_override": 15}
    r = client.post("/api/travel/roadtrip/estimate", json=body).json()["results"][0]
    assert r["fuel_required"] == 40 and r["fuel_cost_inr"] == 4200
    two = client.post("/api/travel/roadtrip/estimate", json=body | {"round_trip": True}).json()["results"][0]
    assert two["fuel_cost_inr"] == 8400
    assert client.post("/api/travel/roadtrip/estimate", json={"stops": [{"city": "Hyderabad"}]}).status_code == 422
    assert client.post("/api/travel/roadtrip/estimate", json={"stops": [{"city": "Hyderabad"}, {"city": "Atlantis"}]}).status_code == 422


def test_links_do_not_claim_booking(client):
    r = client.get("/api/travel/links?kind=train&src=Hyderabad&dst=Goa").json()
    assert any("irctc" in l["url"] for l in r["links"]) and "does not book" in r["disclaimer"]


def test_external_booking_log_is_never_confirmed(client):
    h = _user(client, "ext1@example.com")
    r = client.post("/api/travel/bookings/external", json={"category": "hotel", "title": "Hotel on another site", "amount_inr": 5000}, headers=h)
    assert r.status_code == 201 and r.json()["source"] == "external_referral"
    item = client.get("/api/travel/bookings", headers=h).json()["items"][0]
    assert item["status"] == "pending" and item["source"] == "external_referral"
    assert client.post("/api/travel/bookings/external", json={"category": "hotel", "title": "x"}).status_code in (400, 401)


def test_memories_privacy_and_upload_rules(client, tmp_path, monkeypatch):
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    a, b = _user(client, "mem1@example.com"), _user(client, "mem2@example.com")
    album = client.post("/api/memories/albums", json={"title": "Goa Trip", "place_id": "goa", "travel_date": "2026-10-25"}, headers=a).json()
    aid = album["id"]
    up = client.post(f"/api/memories/albums/{aid}/media", files={"file": ("beach.jpg", io.BytesIO(JPEG), "image/jpeg")}, data={"caption": "Sunset"}, headers=a)
    assert up.status_code == 201
    exe = client.post(f"/api/memories/albums/{aid}/media", files={"file": ("virus.jpg", io.BytesIO(b"MZ\x90\x00" + b"0" * 64), "image/jpeg")}, headers=a)
    assert exe.status_code == 415                                              # a real check of the content, not the name
    assert client.get(f"/api/memories/albums/{aid}", headers=b).status_code == 404       # other users cannot see it
    assert client.get(f"/api/memories/albums/{aid}").status_code in (400, 401)
    url = client.get(f"/api/memories/albums/{aid}", headers=a).json()["media"][0]["url"]
    assert client.get(url).status_code == 200
    assert client.get(url.replace("sig=", "sig=0")).status_code == 403
    tok = client.post(f"/api/memories/albums/{aid}/visibility", json={"visibility": "shared"}, headers=a).json()["share_token"]
    assert client.get(f"/api/memories/shared/{tok}").json()["by"] == "Asha"
    assert client.get("/api/memories/public").json()["total"] == 0
    client.post(f"/api/memories/albums/{aid}/visibility", json={"visibility": "private"}, headers=a)
    assert client.get(f"/api/memories/shared/{tok}").status_code == 404
    assert client.get(f"/api/memories/albums/{aid}/download", headers=a).status_code == 200


def test_admin_catalog_needs_admin_and_cannot_see_private_albums(client):
    cust = _user(client, "cust9@example.com")
    assert client.get("/api/admin/catalog/vehicles").status_code == 401
    assert client.get("/api/admin/catalog/vehicles", headers=cust).status_code == 403
    assert client.get("/api/admin/memories/public", headers=cust).status_code == 403
