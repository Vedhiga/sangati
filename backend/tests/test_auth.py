import uuid
from tests.conftest import create_mock_jwt


def test_auth_missing_token(client):
    response = client.get("/api/v1/profile/me")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "AUTH_REQUIRED"


def test_auth_invalid_token(client):
    headers = {"Authorization": "Bearer invalid.token.payload"}
    response = client.get("/api/v1/profile/me", headers=headers)
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_TOKEN"


def test_auth_expired_token(client, test_user_id):
    expired_token = create_mock_jwt(test_user_id, expired=True)
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/api/v1/profile/me", headers=headers)
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_TOKEN"
    assert "expired" in data["error"]["message"].lower()


def test_auth_wrong_signature(client, test_user_id):
    tampered_token = create_mock_jwt(test_user_id, wrong_secret=True)
    headers = {"Authorization": f"Bearer {tampered_token}"}
    response = client.get("/api/v1/profile/me", headers=headers)
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_TOKEN"


def test_auth_valid_token_reaches_endpoint(client, test_user_id):
    valid_token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {valid_token}"}
    response = client.get("/api/v1/profile/me", headers=headers)
    # Token is valid, profile simply not created yet -> 404 PROFILE_NOT_FOUND
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "PROFILE_NOT_FOUND"
