def _register(client, email="asha@example.com"):
    return client.post("/api/auth/register", json={"name": "Asha", "email": email, "password": "secret-pass-1"})


def test_register_login_me(client):
    r = _register(client)
    assert r.status_code == 201 and r.json()["token"]
    assert "password" not in str(r.json())
    login = client.post("/api/auth/login", json={"email": "ASHA@example.com", "password": "secret-pass-1"})
    assert login.status_code == 200
    token = login.json()["token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["email"] == "asha@example.com"


def test_wrong_password_and_duplicate(client):
    _register(client, "dup@example.com")
    assert _register(client, "dup@example.com").status_code == 409
    bad = client.post("/api/auth/login", json={"email": "dup@example.com", "password": "nope-nope"})
    assert bad.status_code == 401


def test_short_password_rejected(client):
    r = client.post("/api/auth/register", json={"name": "A", "email": "a@b.co", "password": "short"})
    assert r.status_code == 422


def test_trips_and_preferences_belong_to_account(client):
    token = _register(client, "trips@example.com").json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    plan = client.post("/api/trips/plan", json={"destination_id": "goa", "days": 3}).json()
    assert client.post("/api/trips", json={"title": "Goa", "plan": plan}, headers=h).status_code == 201
    assert len(client.get("/api/trips", headers=h).json()) == 1
    assert client.get("/api/trips", headers={"X-Session-Id": "guest-session-12345"}).json() == []
    put = client.put("/api/me/preferences", json={"home_city": "Pune", "interests": ["beach"]}, headers=h)
    assert put.status_code == 200 and client.get("/api/me/preferences", headers=h).json()["home_city"] == "Pune"
    assert client.get("/api/me/preferences").status_code in (400, 401)


def test_bad_token_gets_401(client):
    assert client.get("/api/trips", headers={"Authorization": "Bearer fake"}).status_code == 401
