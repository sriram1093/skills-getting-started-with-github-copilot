from fastapi.testclient import TestClient
from src.app import app
import uuid

client = TestClient(app)


def unique_email():
    return f"test{uuid.uuid4().hex}@example.com"


def test_get_activities_structure():
    resp = client.get("/activities")
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, dict)
    # expect at least one known activity
    assert "Chess Club" in body


def test_signup_and_unregister_flow():
    email = unique_email()
    activity = "Chess Club"

    # signup
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    data = resp.json()
    assert "Signed up" in data.get("message", "")

    # verify participant present
    resp = client.get("/activities")
    assert resp.status_code == 200
    body = resp.json()
    participants = body[activity]["participants"]
    assert email in participants

    # unregister
    resp = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp.status_code == 200
    data = resp.json()
    assert "Unregistered" in data.get("message", "")

    # verify removed
    resp = client.get("/activities")
    assert resp.status_code == 200
    body = resp.json()
    participants = body[activity]["participants"]
    assert email not in participants
