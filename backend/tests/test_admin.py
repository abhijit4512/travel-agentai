from app.database.db import connect


def _signup(client, email, name="Customer"):
    r = client.post("/api/auth/register", json={"name": name, "email": email, "password": "secret-pass-1"})
    return r.json()["token"], r.json()["user"]["id"]


def _make_admin(client, email="admin@example.com"):
    _, uid = _signup(client, email, "Boss")
    with connect() as c:
        c.execute("UPDATE users SET role='admin' WHERE id=?", (uid,))
    r = client.post("/api/admin/auth/login", json={"email": email, "password": "secret-pass-1"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_admin_apis_reject_anonymous_and_customers(client):
    token, _ = _signup(client, "cust1@example.com")
    for path in ("/api/admin/stats", "/api/admin/users", "/api/admin/trips", "/api/admin/bookings", "/api/admin/analytics", "/api/admin/audit"):
        assert client.get(path).status_code == 401
        assert client.get(path, headers={"Authorization": f"Bearer {token}"}).status_code == 403


def test_customer_cannot_use_admin_login(client):
    _signup(client, "cust2@example.com")
    r = client.post("/api/admin/auth/login", json={"email": "cust2@example.com", "password": "secret-pass-1"})
    assert r.status_code == 401 and r.json()["error"]["message"] == "Incorrect email or password."


def test_admin_token_scope_and_overview(client):
    h = _make_admin(client)
    s = client.get("/api/admin/stats", headers=h).json()
    assert s["revenue_inr"] == 0 and "memories" in s
    assert client.get("/api/admin/analytics?range=7d", headers=h).status_code == 200
    assert client.get("/api/admin/stats?range=custom&start=2026-02-01&end=2026-01-01", headers=h).status_code == 422


def test_user_trip_monitoring_audit_and_deactivation(client):
    h = _make_admin(client, "admin2@example.com")
    token, uid = _signup(client, "cust3@example.com", "Meera")
    uh = {"Authorization": f"Bearer {token}"}
    plan = client.post("/api/trips/plan", json={"destination_id": "munnar", "days": 3, "start_date": "2030-01-10"}).json()
    assert client.post("/api/trips", json={"title": "Munnar", "plan": plan}, headers=uh).status_code == 201

    assert any(n["type"] == "new_user" for n in client.get("/api/admin/notifications", headers=h).json()["items"])
    assert any(n["type"] == "trip_created" for n in client.get("/api/admin/notifications", headers=h).json()["items"])

    trips = client.get("/api/admin/trips?q=meera", headers=h).json()
    assert trips["total"] == 1 and trips["items"][0]["destination_name"] == "Munnar"
    detail = client.get(f"/api/admin/trips/{trips['items'][0]['id']}", headers=h).json()
    assert detail["customer"]["email"] == "cust3@example.com" and "plan" in detail
    assert "password" not in str(client.get(f"/api/admin/users/{uid}", headers=h).json()).lower()

    audit = client.get("/api/admin/audit", headers=h).json()["items"]
    assert {"view_trip", "view_user"} <= {a["action"] for a in audit}

    assert client.post(f"/api/admin/users/{uid}/status", json={"active": False, "reason": "x"}, headers=h).status_code == 422
    assert client.post(f"/api/admin/users/{uid}/status", json={"active": False, "reason": "Abuse of the service"}, headers=h).status_code == 200
    assert client.get("/api/trips", headers=uh).status_code == 401                   # deactivated users are locked out at once
    assert client.post("/api/auth/login", json={"email": "cust3@example.com", "password": "secret-pass-1"}).status_code == 403


def test_csv_export_and_booking_empty_state(client):
    h = _make_admin(client, "admin3@example.com")
    r = client.get("/api/admin/reports/users.csv", headers=h)
    assert r.status_code == 200 and r.text.startswith("id,name,email") and "password" not in r.text.lower()
    assert client.get("/api/admin/reports/passwords.csv", headers=h).status_code == 404
    assert client.get("/api/admin/bookings", headers=h).json()["total"] == 0
    assert client.get("/api/admin/search?q=munnar", headers=h).json()["results"]["destinations"]
