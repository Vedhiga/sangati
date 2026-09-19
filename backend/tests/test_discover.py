import uuid
from tests.conftest import create_mock_jwt


def test_discover_unauthorized(client):
    response = client.get("/api/v1/discover")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_REQUIRED"


def test_discover_empty_initially(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # User 1 sets up profile
    client.post(
        "/api/v1/profile",
        json={"username": "alice", "display_name": "Alice"},
        headers=headers,
    )

    response = client.get("/api/v1/discover", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["people"] == []


def test_discover_excludes_current_user_and_ranks_by_intent(client, test_user_id, test_user_2_id):
    token1 = create_mock_jwt(test_user_id)
    token2 = create_mock_jwt(test_user_2_id)
    user3_id = uuid.uuid4()
    token3 = create_mock_jwt(user3_id)

    # User 1 (Alice): LEARN, interests: [python, design]
    client.post(
        "/api/v1/profile",
        json={
            "username": "alice_disc",
            "display_name": "Alice",
            "interests": ["python", "design"],
        },
        headers={"Authorization": f"Bearer {token1}"},
    )
    client.put(
        "/api/v1/activity/me",
        json={"activity_type": "LEARN"},
        headers={"Authorization": f"Bearer {token1}"},
    )

    # User 2 (Bob): LEARN, interests: [python, machine-learning]
    client.post(
        "/api/v1/profile",
        json={
            "username": "bob_disc",
            "display_name": "Bob",
            "bio": "Building models",
            "interests": ["python", "machine-learning"],
        },
        headers={"Authorization": f"Bearer {token2}"},
    )
    client.put(
        "/api/v1/activity/me",
        json={"activity_type": "LEARN"},
        headers={"Authorization": f"Bearer {token2}"},
    )

    # User 3 (Charlie): BUILD, interests: [rust]
    client.post(
        "/api/v1/profile",
        json={
            "username": "charlie_disc",
            "display_name": "Charlie",
            "interests": ["rust"],
        },
        headers={"Authorization": f"Bearer {token3}"},
    )
    client.put(
        "/api/v1/activity/me",
        json={"activity_type": "BUILD"},
        headers={"Authorization": f"Bearer {token3}"},
    )

    # Alice queries discover
    res = client.get("/api/v1/discover", headers={"Authorization": f"Bearer {token1}"})
    assert res.status_code == 200
    data = res.json()

    assert data["total"] == 2
    usernames = [p["username"] for p in data["people"]]
    # Alice must NOT be in results
    assert "alice_disc" not in usernames

    # Bob should be ranked first because of matching LEARN activity and shared 'python' interest
    assert data["people"][0]["username"] == "bob_disc"
    assert data["people"][0]["activity"] == "LEARN"
    assert "Also learning" in data["people"][0]["match_reason"]
    assert "python" in data["people"][0]["match_reason"]

    # Charlie is second with BUILD
    assert data["people"][1]["username"] == "charlie_disc"
    assert data["people"][1]["activity"] == "BUILD"


def test_discover_filter_by_activity(client, test_user_id, test_user_2_id):
    token1 = create_mock_jwt(test_user_id)
    token2 = create_mock_jwt(test_user_2_id)
    user3_id = uuid.uuid4()
    token3 = create_mock_jwt(user3_id)

    client.post(
        "/api/v1/profile",
        json={"username": "user_filter1", "display_name": "F1"},
        headers={"Authorization": f"Bearer {token1}"},
    )

    client.post(
        "/api/v1/profile",
        json={"username": "user_learn", "display_name": "Learner"},
        headers={"Authorization": f"Bearer {token2}"},
    )
    client.put(
        "/api/v1/activity/me",
        json={"activity_type": "LEARN"},
        headers={"Authorization": f"Bearer {token2}"},
    )

    client.post(
        "/api/v1/profile",
        json={"username": "user_build", "display_name": "Builder"},
        headers={"Authorization": f"Bearer {token3}"},
    )
    client.put(
        "/api/v1/activity/me",
        json={"activity_type": "BUILD"},
        headers={"Authorization": f"Bearer {token3}"},
    )

    headers = {"Authorization": f"Bearer {token1}"}

    # Filter by BUILD
    res_build = client.get("/api/v1/discover?activity=BUILD", headers=headers)
    assert res_build.status_code == 200
    build_data = res_build.json()
    assert build_data["total"] == 1
    assert build_data["people"][0]["username"] == "user_build"

    # Filter by LEARN
    res_learn = client.get("/api/v1/discover?activity=LEARN", headers=headers)
    assert res_learn.status_code == 200
    learn_data = res_learn.json()
    assert learn_data["total"] == 1
    assert learn_data["people"][0]["username"] == "user_learn"

    # Filter ALL
    res_all = client.get("/api/v1/discover?activity=ALL", headers=headers)
    assert res_all.status_code == 200
    assert res_all.json()["total"] == 2


def test_discover_pagination(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/profile",
        json={"username": "main_user", "display_name": "Main"},
        headers=headers,
    )

    # Create 3 other users
    for i in range(3):
        u_id = uuid.uuid4()
        u_tok = create_mock_jwt(u_id)
        client.post(
            "/api/v1/profile",
            json={"username": f"page_user_{i}", "display_name": f"User {i}"},
            headers={"Authorization": f"Bearer {u_tok}"},
        )

    # Query with limit 1
    res = client.get("/api/v1/discover?limit=1&offset=0", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    assert len(data["people"]) == 1

    # Query with offset 1
    res2 = client.get("/api/v1/discover?limit=1&offset=1", headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2["people"]) == 1
    assert data2["people"][0]["username"] != data["people"][0]["username"]


def test_discover_includes_connection_status(client, test_user_id, test_user_2_id):
    token1 = create_mock_jwt(test_user_id)
    token2 = create_mock_jwt(test_user_2_id)
    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    client.post(
        "/api/v1/profile",
        json={"username": "viewer_conn", "display_name": "Viewer"},
        headers=headers1,
    )
    client.post(
        "/api/v1/profile",
        json={"username": "target_conn", "display_name": "Target"},
        headers=headers2,
    )

    # Initially connection_status is NONE
    res1 = client.get("/api/v1/discover", headers=headers1)
    assert res1.status_code == 200
    p1 = [p for p in res1.json()["people"] if p["username"] == "target_conn"][0]
    assert p1["connection_status"] == "NONE"
    assert p1["connection_id"] is None

    # Viewer sends connection request
    conn_res = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers1)
    assert conn_res.status_code == 201
    conn_id = conn_res.json()["id"]

    # Now viewer sees REQUEST_SENT
    res2 = client.get("/api/v1/discover", headers=headers1)
    p2 = [p for p in res2.json()["people"] if p["username"] == "target_conn"][0]
    assert p2["connection_status"] == "REQUEST_SENT"
    assert p2["connection_id"] == conn_id

    # Target sees REQUEST_RECEIVED
    res3 = client.get("/api/v1/discover", headers=headers2)
    p3 = [p for p in res3.json()["people"] if p["username"] == "viewer_conn"][0]
    assert p3["connection_status"] == "REQUEST_RECEIVED"
    assert p3["connection_id"] == conn_id

    # Target accepts
    client.put(f"/api/v1/connections/{conn_id}/accept", headers=headers2)

    # Now both see CONNECTED
    res4 = client.get("/api/v1/discover", headers=headers1)
    p4 = [p for p in res4.json()["people"] if p["username"] == "target_conn"][0]
    assert p4["connection_status"] == "CONNECTED"

