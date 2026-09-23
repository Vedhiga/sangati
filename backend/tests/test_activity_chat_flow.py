import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from tests.conftest import create_mock_jwt
from app.models.profile import Profile
from app.models.activity_system import Activity, ActivityParticipant, ParticipantStatus
from app.models.conversation import Conversation, ConversationParticipant, Message


def test_activity_chat_lifecycle_integration(
    client: TestClient,
    db_session: Session,
    test_user_id: uuid4,
):
    # 1. Setup Host Profile
    host_prof = Profile(
        user_id=test_user_id,
        username=f"host_{str(test_user_id)[:8]}",
        display_name="Activity Host",
        avatar_url="https://example.com/host.jpg",
    )
    db_session.add(host_prof)
    db_session.commit()

    token_host = create_mock_jwt(test_user_id)
    headers_host = {"Authorization": f"Bearer {token_host}"}

    # 2. Host creates an Activity
    create_payload = {
        "intent": "BUILD",
        "title": "Quantum Computing Lab",
        "description": "Collaborative quantum algorithm session.",
        "activity_type": "RECURRING",
        "frequency": "WEEKLY",
        "day_of_week": "Friday",
        "time_of_day": "7:00 PM",
        "timezone": "IST (UTC+5:30)",
        "duration_minutes": 90,
        "max_participants": 4,
        "meeting_platform": "Google Meet",
        "meeting_url": "https://meet.google.com/quantum-lab",
        "private_notes": "Qiskit setup required.",
    }

    res_create = client.post("/api/v1/activities", json=create_payload, headers=headers_host)
    assert res_create.status_code == 201
    act_data = res_create.json()
    activity_id = act_data["id"]
    convo_id = act_data["conversation_id"]

    assert convo_id is not None

    # Verify conversation exists in DB
    convo = db_session.query(Conversation).filter(Conversation.id == convo_id).first()
    assert convo is not None
    assert convo.conversation_type == "ACTIVITY"
    assert str(convo.activity_id) == str(activity_id)

    # Verify Host is conversation participant
    host_part = (
        db_session.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == convo_id,
            ConversationParticipant.user_id == test_user_id,
        )
        .first()
    )
    assert host_part is not None

    # Host sends initial message in Activity Chat
    res_msg1 = client.post(
        f"/api/v1/conversations/{convo_id}/messages",
        json={"content": "Welcome to Quantum Computing Lab!"},
        headers=headers_host,
    )
    assert res_msg1.status_code == 201

    # 3. Setup User Two Profile
    user2_id = uuid4()
    user2_prof = Profile(
        user_id=user2_id,
        username=f"user2_{str(user2_id)[:8]}",
        display_name="Quantum Researcher",
        avatar_url="https://example.com/user2.jpg",
    )
    db_session.add(user2_prof)
    db_session.commit()

    token_user2 = create_mock_jwt(user2_id)
    headers_user2 = {"Authorization": f"Bearer {token_user2}"}

    # User 2 attempts to send message BEFORE joining -> MUST BE REJECTED (403)
    res_unauth_msg = client.post(
        f"/api/v1/conversations/{convo_id}/messages",
        json={"content": "Can I post before joining?"},
        headers=headers_user2,
    )
    assert res_unauth_msg.status_code in [403, 401]

    # 4. User 2 Joins Activity
    res_join = client.post(f"/api/v1/activities/{activity_id}/join", headers=headers_user2)
    assert res_join.status_code == 200

    # Verify User 2 is now a conversation participant
    u2_part = (
        db_session.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == convo_id,
            ConversationParticipant.user_id == user2_id,
        )
        .first()
    )
    assert u2_part is not None

    # User 2 sends message -> MUST SUCCEED (201)
    res_msg2 = client.post(
        f"/api/v1/conversations/{convo_id}/messages",
        json={"content": "Super excited for Qiskit!"},
        headers=headers_user2,
    )
    assert res_msg2.status_code == 201

    # Fetch messages list
    res_msgs = client.get(f"/api/v1/conversations/{convo_id}/messages", headers=headers_user2)
    assert res_msgs.status_code == 200
    msgs_data = res_msgs.json()
    assert msgs_data["total"] == 2

    # 5. User 2 Leaves Activity
    res_leave = client.post(f"/api/v1/activities/{activity_id}/leave", headers=headers_user2)
    assert res_leave.status_code == 200

    # User 2 attempts to send another message -> MUST BE REJECTED (403)
    res_post_leave = client.post(
        f"/api/v1/conversations/{convo_id}/messages",
        json={"content": "Sending after leaving?"},
        headers=headers_user2,
    )
    assert res_post_leave.status_code == 403

    # Historical messages STILL EXIST in DB
    all_msgs = db_session.query(Message).filter(Message.conversation_id == convo_id).all()
    assert len(all_msgs) == 2

    # 6. Host Ends Activity
    res_end = client.post(f"/api/v1/activities/{activity_id}/end", headers=headers_host)
    assert res_end.status_code == 200

    # Host attempts to send message in ENDED activity -> MUST BE REJECTED (403)
    res_post_end = client.post(
        f"/api/v1/conversations/{convo_id}/messages",
        json={"content": "Posting in ended activity?"},
        headers=headers_host,
    )
    assert res_post_end.status_code == 403


def test_legacy_activity_conversation_flow(
    client: TestClient,
    db_session: Session,
):
    # 1. Setup Host & Participant Profiles
    host_id = uuid4()
    participant_id = uuid4()
    stranger_id = uuid4()

    db_session.add(Profile(user_id=host_id, username=f"host_{str(host_id)[:6]}", display_name="Legacy Host"))
    db_session.add(Profile(user_id=participant_id, username=f"part_{str(participant_id)[:6]}", display_name="Legacy Participant"))
    db_session.add(Profile(user_id=stranger_id, username=f"stranger_{str(stranger_id)[:6]}", display_name="Stranger User"))
    db_session.commit()

    headers_host = {"Authorization": f"Bearer {create_mock_jwt(host_id)}"}
    headers_part = {"Authorization": f"Bearer {create_mock_jwt(participant_id)}"}
    headers_stranger = {"Authorization": f"Bearer {create_mock_jwt(stranger_id)}"}

    # 2. Insert a LEGACY Activity with conversation_id = NULL
    legacy_act = Activity(
        host_user_id=host_id,
        intent_type="LEARN",
        title="Legacy AI Research Group",
        description="Created before migration 011",
        activity_type="RECURRING",
        frequency="WEEKLY",
        duration_minutes=60,
        max_participants=5,
        meeting_platform="Google Meet",
        meeting_url="https://meet.google.com/legacy-ai",
        status="ACTIVE",
        conversation_id=None,  # Legacy state
    )
    db_session.add(legacy_act)
    db_session.flush()

    # Add host and participant to activity_participants
    db_session.add(ActivityParticipant(activity_id=legacy_act.id, user_id=host_id, status=ParticipantStatus.JOINED.value))
    db_session.add(ActivityParticipant(activity_id=legacy_act.id, user_id=participant_id, status=ParticipantStatus.JOINED.value))
    db_session.commit()

    # 3. GET conversation for legacy activity -> Must idempotently create 1 conversation
    res_get1 = client.get(f"/api/v1/activities/{legacy_act.id}/conversation", headers=headers_host)
    assert res_get1.status_code == 200, res_get1.text
    convo_data1 = res_get1.json()
    convo_id = convo_data1["id"]
    assert convo_data1["conversation_type"] == "ACTIVITY"

    # Verify activity.conversation_id was updated in DB
    db_session.refresh(legacy_act)
    assert str(legacy_act.conversation_id) == str(convo_id)

    # 4. Requesting conversation a SECOND time -> Idempotent, returns exact same conversation
    res_get2 = client.get(f"/api/v1/activities/{legacy_act.id}/conversation", headers=headers_host)
    assert res_get2.status_code == 200
    assert res_get2.json()["id"] == convo_id

    # Verify no duplicate conversations were created for this activity
    convo_count = db_session.query(Conversation).filter(Conversation.activity_id == legacy_act.id).count()
    assert convo_count == 1

    # 5. Non-participant (Stranger) attempts to get activity conversation -> 403 Forbidden (not 500)
    res_stranger = client.get(f"/api/v1/activities/{legacy_act.id}/conversation", headers=headers_stranger)
    assert res_stranger.status_code == 403

    # 6. Joined participant gets conversation detail -> 200 OK
    res_part = client.get(f"/api/v1/activities/{legacy_act.id}/conversation", headers=headers_part)
    assert res_part.status_code == 200
    assert res_part.json()["id"] == convo_id

    # 7. Non-existent activity ID -> 404 Not Found
    res_404 = client.get(f"/api/v1/activities/{uuid4()}/conversation", headers=headers_host)
    assert res_404.status_code == 404

