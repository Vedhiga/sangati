import uuid
from tests.conftest import create_mock_jwt


def test_connection_auth_required(client):
    user_id = uuid.uuid4()
    conn_id = uuid.uuid4()

    res1 = client.post(f"/api/v1/connections/{user_id}")
    assert res1.status_code == 401

    res2 = client.get("/api/v1/connections")
    assert res2.status_code == 401

    res3 = client.get("/api/v1/connections/requests")
    assert res3.status_code == 401

    res4 = client.put(f"/api/v1/connections/{conn_id}/accept")
    assert res4.status_code == 401

    res5 = client.put(f"/api/v1/connections/{conn_id}/reject")
    assert res5.status_code == 401

    res6 = client.delete(f"/api/v1/connections/{conn_id}")
    assert res6.status_code == 401


def test_cannot_connect_to_self(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/profile",
        json={"username": "self_user", "display_name": "Self"},
        headers=headers,
    )

    res = client.post(f"/api/v1/connections/{test_user_id}", headers=headers)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "SELF_CONNECTION"


def test_connection_lifecycle_and_rules(client, test_user_id, test_user_2_id):
    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Setup profiles & activities
    client.post(
        "/api/v1/profile",
        json={"username": "alice_conn", "display_name": "Alice", "bio": "Alice bio", "interests": ["coding"]},
        headers=headers_a,
    )
    client.put("/api/v1/activity/me", json={"activity_type": "BUILD"}, headers=headers_a)

    client.post(
        "/api/v1/profile",
        json={"username": "bob_conn", "display_name": "Bob", "bio": "Bob bio", "interests": ["ai"]},
        headers=headers_b,
    )
    client.put("/api/v1/activity/me", json={"activity_type": "LEARN"}, headers=headers_b)

    # 1. Alice sends connection request to Bob
    res_req = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_a)
    assert res_req.status_code == 201
    conn_data = res_req.json()
    assert conn_data["status"] == "PENDING"
    conn_id = conn_data["id"]

    # 2. Duplicate request: Alice sends again -> rejected
    res_dup = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_a)
    assert res_dup.status_code == 400
    assert res_dup.json()["error"]["code"] == "DUPLICATE_REQUEST"

    # 3. Reverse request: Bob attempts to send to Alice -> rejected
    res_rev = client.post(f"/api/v1/connections/{test_user_id}", headers=headers_b)
    assert res_rev.status_code == 400
    assert res_rev.json()["error"]["code"] == "REVERSE_REQUEST_EXISTS"

    # 4. Bob checks incoming requests -> sees Alice
    res_inc = client.get("/api/v1/connections/requests", headers=headers_b)
    assert res_inc.status_code == 200
    inc_data = res_inc.json()
    assert inc_data["total"] == 1
    req_item = inc_data["requests"][0]
    assert req_item["id"] == conn_id
    assert req_item["requester"]["username"] == "alice_conn"
    assert req_item["requester"]["display_name"] == "Alice"
    assert req_item["requester"]["activity"] == "BUILD"
    # Verify no private data leaked
    assert "email" not in req_item["requester"]
    assert "password" not in req_item["requester"]

    # 5. Bob accepts connection request
    res_acc = client.put(f"/api/v1/connections/{conn_id}/accept", headers=headers_b)
    assert res_acc.status_code == 200
    assert res_acc.json()["status"] == "ACCEPTED"

    # 6. Both Alice and Bob see each other under /connections
    res_conn_a = client.get("/api/v1/connections", headers=headers_a)
    assert res_conn_a.status_code == 200
    data_a = res_conn_a.json()
    assert data_a["total"] == 1
    assert data_a["connections"][0]["user"]["username"] == "bob_conn"
    assert data_a["connections"][0]["user"]["activity"] == "LEARN"

    res_conn_b = client.get("/api/v1/connections", headers=headers_b)
    assert res_conn_b.status_code == 200
    data_b = res_conn_b.json()
    assert data_b["total"] == 1
    assert data_b["connections"][0]["user"]["username"] == "alice_conn"
    assert data_b["connections"][0]["user"]["activity"] == "BUILD"

    # 7. Alice sending request now gives ALREADY_CONNECTED
    res_already = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_a)
    assert res_already.status_code == 400
    assert res_already.json()["error"]["code"] == "ALREADY_CONNECTED"


def test_unauthorized_actions(client, test_user_id, test_user_2_id):
    user_3_id = uuid.uuid4()
    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    token_c = create_mock_jwt(user_3_id)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    headers_c = {"Authorization": f"Bearer {token_c}"}

    client.post("/api/v1/profile", json={"username": "user_u1", "display_name": "U1"}, headers=headers_a)
    client.post("/api/v1/profile", json={"username": "user_u2", "display_name": "U2"}, headers=headers_b)
    client.post("/api/v1/profile", json={"username": "user_u3", "display_name": "U3"}, headers=headers_c)

    # U1 sends request to U2
    conn_res = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_a)
    assert conn_res.status_code == 201
    conn_id = conn_res.json()["id"]

    # U3 tries to accept U1's request to U2 -> 403 UNAUTHORIZED_ACTION
    res_acc_c = client.put(f"/api/v1/connections/{conn_id}/accept", headers=headers_c)
    assert res_acc_c.status_code == 403
    assert res_acc_c.json()["error"]["code"] == "UNAUTHORIZED_ACTION"

    # U3 tries to reject U1's request to U2 -> 403 UNAUTHORIZED_ACTION
    res_rej_c = client.put(f"/api/v1/connections/{conn_id}/reject", headers=headers_c)
    assert res_rej_c.status_code == 403
    assert res_rej_c.json()["error"]["code"] == "UNAUTHORIZED_ACTION"

    # U2 (receiver) tries to cancel U1's outgoing request -> 403 UNAUTHORIZED_ACTION
    res_canc_b = client.delete(f"/api/v1/connections/{conn_id}", headers=headers_b)
    assert res_canc_b.status_code == 403
    assert res_canc_b.json()["error"]["code"] == "UNAUTHORIZED_ACTION"

    # U1 (requester) cancels outgoing request -> 200 OK
    res_canc_a = client.delete(f"/api/v1/connections/{conn_id}", headers=headers_a)
    assert res_canc_a.status_code == 200
    assert res_canc_a.json()["success"] is True


def test_reject_request_flow(client, test_user_id, test_user_2_id):
    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    client.post("/api/v1/profile", json={"username": "rej_u1", "display_name": "R1"}, headers=headers_a)
    client.post("/api/v1/profile", json={"username": "rej_u2", "display_name": "R2"}, headers=headers_b)

    # U1 sends request to U2
    conn_res = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_a)
    conn_id = conn_res.json()["id"]

    # U2 rejects
    rej_res = client.put(f"/api/v1/connections/{conn_id}/reject", headers=headers_b)
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "REJECTED"

    # No incoming requests remaining for U2
    inc = client.get("/api/v1/connections/requests", headers=headers_b)
    assert inc.json()["total"] == 0

    # No connections for either
    assert client.get("/api/v1/connections", headers=headers_a).json()["total"] == 0
    assert client.get("/api/v1/connections", headers=headers_b).json()["total"] == 0
