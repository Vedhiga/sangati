import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from tests.conftest import create_mock_jwt
from app.models.profile import Profile
from app.models.connection import Connection, ConnectionStatus
from app.models.activity_system import Activity, ActivityParticipant, ParticipantStatus


def test_activities_crud_and_authorization(
    client: TestClient,
    db_session: Session,
    test_user_id: uuid4,
):
    # Setup Host Profile
    host_prof = Profile(
        user_id=test_user_id,
        username=f"host_{str(test_user_id)[:8]}",
        display_name="Test Host",
        avatar_url="https://example.com/host_avatar.jpg",
    )
    db_session.add(host_prof)
    db_session.commit()

    token1 = create_mock_jwt(test_user_id)
    headers1 = {"Authorization": f"Bearer {token1}"}

    # 1. Host Activity
    create_payload = {
        "intent": "BUILD",
        "title": "RL Agent Builders Core",
        "description": "Building reinforcement learning agents together in PyTorch.",
        "activity_type": "RECURRING",
        "frequency": "WEEKLY",
        "day_of_week": "Saturday",
        "time_of_day": "8:00 PM",
        "timezone": "IST (UTC+5:30)",
        "duration_minutes": 60,
        "max_participants": 5,
        "meeting_platform": "Google Meet",
        "meeting_url": "https://meet.google.com/test-rl-agent",
        "private_notes": "Repo link: https://github.com/sangati/rl-agents",
    }

    res = client.post("/api/v1/activities", json=create_payload, headers=headers1)
    assert res.status_code == 201
    act_data = res.json()
    activity_id = act_data["id"]

    assert act_data["title"] == "RL Agent Builders Core"
    assert act_data["is_host"] is True
    assert act_data["is_participant"] is True
    assert act_data["meeting_url"] == "https://meet.google.com/test-rl-agent"
    assert act_data["private_notes"] == "Repo link: https://github.com/sangati/rl-agents"

    # 2. Get Activities List
    res_list = client.get("/api/v1/activities", headers=headers1)
    assert res_list.status_code == 200
    activities = res_list.json()
    assert len(activities) >= 1
    found = next((a for a in activities if a["id"] == activity_id), None)
    assert found is not None
    assert found["participant_count"] == 1

    # 3. Create User Two Profile
    user2_id = uuid4()
    user2_prof = Profile(
        user_id=user2_id,
        username=f"user2_{str(user2_id)[:8]}",
        display_name="User Two",
        avatar_url="https://example.com/avatar2.jpg",
    )
    db_session.add(user2_prof)
    db_session.commit()

    token2 = create_mock_jwt(user2_id)
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 4. Non-participant User Two fetches Activity Detail
    res_detail2 = client.get(f"/api/v1/activities/{activity_id}", headers=headers2)
    assert res_detail2.status_code == 200
    detail2 = res_detail2.json()

    # AUTHORIZATION BOUNDARY ASSERTIONS: Non-participant MUST NOT receive meeting_url or private_notes
    assert detail2["is_participant"] is False
    assert detail2["is_host"] is False
    assert "meeting_url" not in detail2
    assert "private_notes" not in detail2

    # 5. User Two joins Activity
    res_join = client.post(f"/api/v1/activities/{activity_id}/join", headers=headers2)
    assert res_join.status_code == 200
    joined_data = res_join.json()

    assert joined_data["is_participant"] is True
    assert joined_data["participant_count"] == 2
    assert joined_data["meeting_url"] == "https://meet.google.com/test-rl-agent"
    assert joined_data["private_notes"] == "Repo link: https://github.com/sangati/rl-agents"

    # 6. User Two leaves Activity
    res_leave = client.post(f"/api/v1/activities/{activity_id}/leave", headers=headers2)
    assert res_leave.status_code == 200
    left_data = res_leave.json()
    assert left_data["is_participant"] is False

    # 7. Host Pauses Activity
    res_pause = client.post(f"/api/v1/activities/{activity_id}/pause", headers=headers1)
    assert res_pause.status_code == 200
    assert res_pause.json()["status"] == "PAUSED"

    # 8. Host Resumes Activity
    res_resume = client.post(f"/api/v1/activities/{activity_id}/resume", headers=headers1)
    assert res_resume.status_code == 200
    assert res_resume.json()["status"] == "ACTIVE"

    # 9. Host Ends Activity
    res_end = client.post(f"/api/v1/activities/{activity_id}/end", headers=headers1)
    assert res_end.status_code == 200
    assert res_end.json()["status"] == "ENDED"
