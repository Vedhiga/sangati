import uuid
import pytest
from tests.conftest import create_mock_jwt


def test_notification_auth_required(client):
    fake_id = uuid.uuid4()

    res1 = client.get("/api/v1/notifications")
    assert res1.status_code == 401

    res2 = client.get("/api/v1/notifications/unread-count")
    assert res2.status_code == 401

    res3 = client.put("/api/v1/notifications/read-all")
    assert res3.status_code == 401

    res4 = client.put(f"/api/v1/notifications/{fake_id}/read")
    assert res4.status_code == 401


def test_connection_request_and_acceptance_notifications(client, test_user_id, test_user_2_id):
    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    client.post("/api/v1/profile", json={"username": "alice", "display_name": "Alice"}, headers=headers_a)
    client.post("/api/v1/profile", json={"username": "bob", "display_name": "Bob"}, headers=headers_b)

    # Initial unread count should be 0 for both
    res_b_count = client.get("/api/v1/notifications/unread-count", headers=headers_b)
    assert res_b_count.status_code == 200
    assert res_b_count.json()["count"] == 0

    # 1. Alice sends connection request to Bob
    req_res = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_a)
    assert req_res.status_code == 201
    conn_id = req_res.json()["id"]

    # Bob should receive a CONNECTION_REQUEST notification
    notifs_b = client.get("/api/v1/notifications", headers=headers_b)
    assert notifs_b.status_code == 200
    b_data = notifs_b.json()
    assert b_data["total"] == 1
    assert b_data["notifications"][0]["type"] == "CONNECTION_REQUEST"
    assert b_data["notifications"][0]["is_read"] is False
    assert "Alice" in b_data["notifications"][0]["message"]
    assert b_data["notifications"][0]["reference_id"] == conn_id
    assert b_data["notifications"][0]["actor"]["username"] == "alice"

    # Alice (requester) should NOT have received any notification
    notifs_a = client.get("/api/v1/notifications", headers=headers_a)
    assert notifs_a.status_code == 200
    assert notifs_a.json()["total"] == 0

    # Check unread count for Bob
    b_unread = client.get("/api/v1/notifications/unread-count", headers=headers_b).json()
    assert b_unread["count"] == 1

    # 2. Bob accepts the request
    accept_res = client.put(f"/api/v1/connections/{conn_id}/accept", headers=headers_b)
    assert accept_res.status_code == 200

    # Alice should now receive a CONNECTION_ACCEPTED notification
    notifs_a2 = client.get("/api/v1/notifications", headers=headers_a)
    assert notifs_a2.status_code == 200
    a_data = notifs_a2.json()
    assert a_data["total"] == 1
    assert a_data["notifications"][0]["type"] == "CONNECTION_ACCEPTED"
    assert "Bob" in a_data["notifications"][0]["message"]
    assert a_data["notifications"][0]["actor"]["username"] == "bob"

    # Bob's notification count remains 1 (Bob does not receive acceptance notification)
    notifs_b2 = client.get("/api/v1/notifications", headers=headers_b)
    assert notifs_b2.json()["total"] == 1


def test_new_message_notification_and_sender_exclusion(client, test_user_id, test_user_2_id):
    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    client.post("/api/v1/profile", json={"username": "alice_msg", "display_name": "Alice M"}, headers=headers_a)
    client.post("/api/v1/profile", json={"username": "bob_msg", "display_name": "Bob M"}, headers=headers_b)

    # Establish connection
    req = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_a)
    client.put(f"/api/v1/connections/{req.json()['id']}/accept", headers=headers_b)

    # Start conversation
    convo = client.post(f"/api/v1/conversations/{test_user_2_id}", headers=headers_a).json()
    convo_id = convo["id"]

    # Clear prior notifications for clean assertions
    client.put("/api/v1/notifications/read-all", headers=headers_a)
    client.put("/api/v1/notifications/read-all", headers=headers_b)

    # Alice sends a message to Bob
    msg_res = client.post(
        f"/api/v1/conversations/{convo_id}/messages",
        json={"content": "Hello Bob!"},
        headers=headers_a,
    )
    assert msg_res.status_code == 201

    # Bob should receive a NEW_MESSAGE notification
    notifs_b = client.get("/api/v1/notifications", headers=headers_b).json()
    msg_notifs = [n for n in notifs_b["notifications"] if n["type"] == "NEW_MESSAGE"]
    assert len(msg_notifs) == 1
    assert msg_notifs[0]["reference_id"] == convo_id
    assert "Hello Bob!" not in msg_notifs[0]["message"]  # Content not leaked in notification text
    assert "Alice M" in msg_notifs[0]["message"]

    # Alice (the sender) should NOT receive a NEW_MESSAGE notification
    notifs_a = client.get("/api/v1/notifications", headers=headers_a).json()
    alice_msg_notifs = [n for n in notifs_a["notifications"] if n["type"] == "NEW_MESSAGE"]
    assert len(alice_msg_notifs) == 0


def test_mark_read_and_authorization(client, test_user_id, test_user_2_id):
    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    client.post("/api/v1/profile", json={"username": "alice_auth", "display_name": "Alice Auth"}, headers=headers_a)
    client.post("/api/v1/profile", json={"username": "bob_auth", "display_name": "Bob Auth"}, headers=headers_b)

    # Alice sends request -> Bob receives notification
    client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_a)

    notifs_b = client.get("/api/v1/notifications", headers=headers_b).json()
    b_notif_id = notifs_b["notifications"][0]["id"]
    assert notifs_b["notifications"][0]["is_read"] is False

    # Alice cannot mark Bob's notification as read (403 UNAUTHORIZED_NOTIFICATION_ACTION)
    unauth_res = client.put(f"/api/v1/notifications/{b_notif_id}/read", headers=headers_a)
    assert unauth_res.status_code == 403
    assert unauth_res.json()["error"]["code"] == "UNAUTHORIZED_NOTIFICATION_ACTION"

    # Bob can mark his own notification as read
    read_res = client.put(f"/api/v1/notifications/{b_notif_id}/read", headers=headers_b)
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True

    # Bob's unread count should now be 0
    unread_res = client.get("/api/v1/notifications/unread-count", headers=headers_b)
    assert unread_res.json()["count"] == 0


def test_mark_all_read_and_ordering(client, test_user_id, test_user_2_id):
    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    client.post("/api/v1/profile", json={"username": "alice_bulk", "display_name": "Alice Bulk"}, headers=headers_a)
    client.post("/api/v1/profile", json={"username": "bob_bulk", "display_name": "Bob Bulk"}, headers=headers_b)

    # Setup connection
    conn = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_a).json()
    client.put(f"/api/v1/connections/{conn['id']}/accept", headers=headers_b)
    convo = client.post(f"/api/v1/conversations/{test_user_2_id}", headers=headers_a).json()

    # Alice sends 3 messages to Bob
    for i in range(3):
        client.post(
            f"/api/v1/conversations/{convo['id']}/messages",
            json={"content": f"Message {i+1}"},
            headers=headers_a,
        )

    # Bob has connection request + 3 messages = 4 notifications
    notifs_b = client.get("/api/v1/notifications", headers=headers_b).json()
    assert notifs_b["total"] >= 4
    # Check newest first
    timestamps = [n["created_at"] for n in notifs_b["notifications"]]
    assert timestamps == sorted(timestamps, reverse=True)

    # Mark all as read for Bob
    mark_res = client.put("/api/v1/notifications/read-all", headers=headers_b)
    assert mark_res.status_code == 200
    assert mark_res.json()["marked_read"] >= 4

    # Unread count is now 0
    assert client.get("/api/v1/notifications/unread-count", headers=headers_b).json()["count"] == 0


def test_failed_operations_and_duplicate_handling(client, test_user_id, test_user_2_id):
    token_a = create_mock_jwt(test_user_id)
    headers_a = {"Authorization": f"Bearer {token_a}"}

    client.post("/api/v1/profile", json={"username": "alice_fail", "display_name": "Alice Fail"}, headers=headers_a)

    # 1. Failed self-connection request does not create notification
    fail_res = client.post(f"/api/v1/connections/{test_user_id}", headers=headers_a)
    assert fail_res.status_code == 400
    assert client.get("/api/v1/notifications", headers=headers_a).json()["total"] == 0

    # 2. Failed message to non-existent conversation does not create notification
    fake_convo_id = uuid.uuid4()
    fail_msg = client.post(
        f"/api/v1/conversations/{fake_convo_id}/messages",
        json={"content": "Should fail"},
        headers=headers_a,
    )
    assert fail_msg.status_code == 404
    assert client.get("/api/v1/notifications", headers=headers_a).json()["total"] == 0
