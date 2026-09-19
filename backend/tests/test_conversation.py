import uuid
import pytest
from tests.conftest import create_mock_jwt


def test_conversation_auth_required(client):
    fake_id = uuid.uuid4()

    res1 = client.post(f"/api/v1/conversations/{fake_id}")
    assert res1.status_code == 401

    res2 = client.get("/api/v1/conversations")
    assert res2.status_code == 401

    res3 = client.get(f"/api/v1/conversations/{fake_id}")
    assert res3.status_code == 401

    res4 = client.get(f"/api/v1/conversations/{fake_id}/messages")
    assert res4.status_code == 401

    res5 = client.post(f"/api/v1/conversations/{fake_id}/messages", json={"content": "Hi"})
    assert res5.status_code == 401


def test_cannot_message_non_connected_user(client, test_user_id, test_user_2_id):
    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    client.post("/api/v1/profile", json={"username": "user_a", "display_name": "User A"}, headers=headers_a)
    client.post("/api/v1/profile", json={"username": "user_b", "display_name": "User B"}, headers=headers_b)

    # 1. Non-connected user cannot start conversation -> 400 NOT_CONNECTED
    res = client.post(f"/api/v1/conversations/{test_user_2_id}", headers=headers_a)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "NOT_CONNECTED"

    # 2. Cannot start conversation with self -> 400 SELF_CONVERSATION
    res_self = client.post(f"/api/v1/conversations/{test_user_id}", headers=headers_a)
    assert res_self.status_code == 400
    assert res_self.json()["error"]["code"] == "SELF_CONVERSATION"


def test_conversation_lifecycle_and_deduplication(client, test_user_id, test_user_2_id):
    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    client.post("/api/v1/profile", json={"username": "alice_chat", "display_name": "Alice Chat"}, headers=headers_a)
    client.post("/api/v1/profile", json={"username": "bob_chat", "display_name": "Bob Chat"}, headers=headers_b)

    # Establish mutual connection
    req = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_a)
    conn_id = req.json()["id"]
    client.put(f"/api/v1/connections/{conn_id}/accept", headers=headers_b)

    # 1. Connected user can start conversation
    res_create = client.post(f"/api/v1/conversations/{test_user_2_id}", headers=headers_a)
    assert res_create.status_code == 200
    convo_data = res_create.json()
    convo_id = convo_data["id"]
    assert convo_data["other_user"]["user_id"] == str(test_user_2_id)
    assert convo_data["last_message_at"] is None

    # 2. Starting conversation twice with same user returns the existing conversation (no duplicate)
    res_create_again = client.post(f"/api/v1/conversations/{test_user_2_id}", headers=headers_a)
    assert res_create_again.status_code == 200
    assert res_create_again.json()["id"] == convo_id

    # Bob starting conversation with Alice also returns the exact same conversation
    res_bob_starts = client.post(f"/api/v1/conversations/{test_user_id}", headers=headers_b)
    assert res_bob_starts.status_code == 200
    assert res_bob_starts.json()["id"] == convo_id
    assert res_bob_starts.json()["other_user"]["user_id"] == str(test_user_id)

    # 3. Message validation: Empty content rejected
    res_empty = client.post(f"/api/v1/conversations/{convo_id}/messages", json={"content": "   "}, headers=headers_a)
    assert res_empty.status_code == 400
    assert res_empty.json()["error"]["code"] == "VALIDATION_ERROR"

    # Message exceeding 2000 chars rejected
    res_oversized = client.post(
        f"/api/v1/conversations/{convo_id}/messages",
        json={"content": "a" * 2001},
        headers=headers_a,
    )
    assert res_oversized.status_code == 400
    assert res_oversized.json()["error"]["code"] == "VALIDATION_ERROR"

    # 4. User can send message to their conversation
    res_msg1 = client.post(
        f"/api/v1/conversations/{convo_id}/messages",
        json={"content": "Hey Bob, I saw you're learning machine learning too."},
        headers=headers_a,
    )
    assert res_msg1.status_code == 201
    msg1_data = res_msg1.json()
    assert msg1_data["sender_id"] == str(test_user_id)
    assert msg1_data["content"] == "Hey Bob, I saw you're learning machine learning too."
    msg1_created_at = msg1_data["created_at"]

    # 5. Verify conversation.last_message_at was updated
    res_convo_detail = client.get(f"/api/v1/conversations/{convo_id}", headers=headers_a)
    assert res_convo_detail.status_code == 200
    assert res_convo_detail.json()["last_message_at"] is not None

    # 6. Bob replies to conversation
    res_msg2 = client.post(
        f"/api/v1/conversations/{convo_id}/messages",
        json={"content": "Hey Alice! Yes, just started with PyTorch."},
        headers=headers_b,
    )
    assert res_msg2.status_code == 201
    assert res_msg2.json()["sender_id"] == str(test_user_2_id)

    # 7. Messages are returned in chronological order (created_at ASC)
    res_messages = client.get(f"/api/v1/conversations/{convo_id}/messages", headers=headers_a)
    assert res_messages.status_code == 200
    msgs = res_messages.json()["messages"]
    assert len(msgs) == 2
    assert msgs[0]["content"] == "Hey Bob, I saw you're learning machine learning too."
    assert msgs[1]["content"] == "Hey Alice! Yes, just started with PyTorch."

    # 8. User can list only their own conversations, ordered by latest message
    res_list_a = client.get("/api/v1/conversations", headers=headers_a)
    assert res_list_a.status_code == 200
    convos_a = res_list_a.json()["conversations"]
    assert len(convos_a) == 1
    assert convos_a[0]["id"] == convo_id
    assert convos_a[0]["last_message"]["content"] == "Hey Alice! Yes, just started with PyTorch."


def test_conversation_authorization_and_privacy(client, test_user_id, test_user_2_id):
    user_stranger_id = uuid.uuid4()

    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    token_stranger = create_mock_jwt(user_stranger_id)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    headers_stranger = {"Authorization": f"Bearer {token_stranger}"}

    client.post("/api/v1/profile", json={"username": "user_p1", "display_name": "P1"}, headers=headers_a)
    client.post("/api/v1/profile", json={"username": "user_p2", "display_name": "P2"}, headers=headers_b)
    client.post("/api/v1/profile", json={"username": "user_stranger", "display_name": "Stranger"}, headers=headers_stranger)

    # Connect A and B
    req = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_a)
    client.put(f"/api/v1/connections/{req.json()['id']}/accept", headers=headers_b)

    # Start conversation
    res_convo = client.post(f"/api/v1/conversations/{test_user_2_id}", headers=headers_a)
    convo_id = res_convo.json()["id"]

    # Stranger cannot view conversation details -> 403
    res_stranger_detail = client.get(f"/api/v1/conversations/{convo_id}", headers=headers_stranger)
    assert res_stranger_detail.status_code == 403
    assert res_stranger_detail.json()["error"]["code"] == "UNAUTHORIZED_CONVERSATION_ACTION"

    # Stranger cannot fetch messages -> 403
    res_stranger_msgs = client.get(f"/api/v1/conversations/{convo_id}/messages", headers=headers_stranger)
    assert res_stranger_msgs.status_code == 403
    assert res_stranger_msgs.json()["error"]["code"] == "UNAUTHORIZED_CONVERSATION_ACTION"

    # Stranger cannot send message -> 403
    res_stranger_send = client.post(
        f"/api/v1/conversations/{convo_id}/messages",
        json={"content": "Intruder message"},
        headers=headers_stranger,
    )
    assert res_stranger_send.status_code == 403
    assert res_stranger_send.json()["error"]["code"] == "UNAUTHORIZED_CONVERSATION_ACTION"

    # Stranger's conversation list is empty
    res_stranger_list = client.get("/api/v1/conversations", headers=headers_stranger)
    assert res_stranger_list.status_code == 200
    assert len(res_stranger_list.json()["conversations"]) == 0


def test_group_conversation_creation_and_authorization(client, test_user_id, test_user_2_id):
    user_c_id = uuid.uuid4()
    user_stranger_id = uuid.uuid4()

    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    token_c = create_mock_jwt(user_c_id)
    token_stranger = create_mock_jwt(user_stranger_id)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    headers_c = {"Authorization": f"Bearer {token_c}"}
    headers_stranger = {"Authorization": f"Bearer {token_stranger}"}

    client.post("/api/v1/profile", json={"username": "g_user_a", "display_name": "G User A"}, headers=headers_a)
    client.post("/api/v1/profile", json={"username": "g_user_b", "display_name": "G User B"}, headers=headers_b)
    client.post("/api/v1/profile", json={"username": "g_user_c", "display_name": "G User C"}, headers=headers_c)
    client.post("/api/v1/profile", json={"username": "g_stranger", "display_name": "G Stranger"}, headers=headers_stranger)

    # Establish connections: A-B and A-C
    req1 = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_a)
    client.put(f"/api/v1/connections/{req1.json()['id']}/accept", headers=headers_b)

    req2 = client.post(f"/api/v1/connections/{user_c_id}", headers=headers_a)
    client.put(f"/api/v1/connections/{req2.json()['id']}/accept", headers=headers_c)

    # 1. Cannot create group with unconnected stranger
    res_fail = client.post(
        "/api/v1/conversations/group",
        json={"participant_user_ids": [str(test_user_2_id), str(user_stranger_id)], "title": "Secret Group"},
        headers=headers_a,
    )
    assert res_fail.status_code == 400
    assert res_fail.json()["error"]["code"] == "NOT_CONNECTED"

    # 2. Successfully create group conversation with connected B and C
    res_group = client.post(
        "/api/v1/conversations/group",
        json={"participant_user_ids": [str(test_user_2_id), str(user_c_id)], "title": "Build Squad"},
        headers=headers_a,
    )
    assert res_group.status_code == 201
    group_data = res_group.json()
    group_id = group_data["id"]
    assert group_data["is_group"] is True
    assert group_data["title"] == "Build Squad"
    assert len(group_data["participants"]) == 2  # B and C

    # 3. Send message in group
    res_msg = client.post(
        f"/api/v1/conversations/{group_id}/messages",
        json={"content": "Welcome to the group chat everyone!"},
        headers=headers_a,
    )
    assert res_msg.status_code == 201

    # 4. Participant C can fetch group messages
    res_c_msgs = client.get(f"/api/v1/conversations/{group_id}/messages", headers=headers_c)
    assert res_c_msgs.status_code == 200
    assert len(res_c_msgs.json()["messages"]) == 1
    assert res_c_msgs.json()["messages"][0]["content"] == "Welcome to the group chat everyone!"

    # 5. Non-participant stranger is rejected with 403
    res_stranger_grp = client.get(f"/api/v1/conversations/{group_id}/messages", headers=headers_stranger)
    assert res_stranger_grp.status_code == 403

