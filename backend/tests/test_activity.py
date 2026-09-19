import uuid
from tests.conftest import create_mock_jwt


def test_activity_unauthorized(client):
    response = client.get("/api/v1/activity/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_REQUIRED"


def test_activity_get_none_initially(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/activity/me", headers=headers)
    assert response.status_code == 200
    assert response.json() is None


def test_activity_set_invalid_type(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.put(
        "/api/v1/activity/me",
        json={"activity_type": "GAMING"},
        headers=headers,
    )
    assert response.status_code == 400


def test_activity_set_and_update(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Set activity to BUILD
    res1 = client.put(
        "/api/v1/activity/me",
        json={"activity_type": "BUILD"},
        headers=headers,
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["activity_type"] == "BUILD"
    assert "id" in data1
    assert "created_at" in data1
    assert "updated_at" in data1

    # 2. Get activity
    get_res = client.get("/api/v1/activity/me", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["activity_type"] == "BUILD"

    # 3. Update activity to CONVERSATION
    res2 = client.put(
        "/api/v1/activity/me",
        json={"activity_type": "CONVERSATION"},
        headers=headers,
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["activity_type"] == "CONVERSATION"
    # Ensure it updated the same record
    assert data2["id"] == data1["id"]


def test_activity_user_isolation(client, test_user_id, test_user_2_id):
    token1 = create_mock_jwt(test_user_id)
    token2 = create_mock_jwt(test_user_2_id)

    # User 1 chooses LEARN
    client.put(
        "/api/v1/activity/me",
        json={"activity_type": "LEARN"},
        headers={"Authorization": f"Bearer {token1}"},
    )

    # User 2 chooses EXPLORE
    client.put(
        "/api/v1/activity/me",
        json={"activity_type": "EXPLORE"},
        headers={"Authorization": f"Bearer {token2}"},
    )

    # Verify User 1 still has LEARN
    res1 = client.get("/api/v1/activity/me", headers={"Authorization": f"Bearer {token1}"})
    assert res1.status_code == 200
    assert res1.json()["activity_type"] == "LEARN"

    # Verify User 2 still has EXPLORE
    res2 = client.get("/api/v1/activity/me", headers={"Authorization": f"Bearer {token2}"})
    assert res2.status_code == 200
    assert res2.json()["activity_type"] == "EXPLORE"
