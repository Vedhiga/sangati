import uuid
from tests.conftest import create_mock_jwt


def test_create_profile_success(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "username": "vedhiga",
        "display_name": "Vedhiga",
        "bio": "Exploring AI and building meaningful projects.",
        "avatar_url": "https://example.com/avatar.png",
    }

    response = client.post("/api/v1/profile", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "vedhiga"
    assert data["display_name"] == "Vedhiga"
    assert data["bio"] == "Exploring AI and building meaningful projects."
    assert data["avatar_url"] == "https://example.com/avatar.png"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data
    # Ensure sensitive credentials/user_id are not leaked
    assert "password" not in data
    assert "email" not in data


def test_create_profile_invalid_usernames(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}

    invalid_usernames = [
        "ab",  # too short (<3)
        "this_username_is_way_too_long_for_the_platform_rule",  # too long (>30)
        "user name",  # contains space
        "user@name",  # contains invalid symbol
        "user!",  # contains invalid symbol
    ]

    for invalid_name in invalid_usernames:
        payload = {
            "username": invalid_name,
            "display_name": "Valid Name",
        }
        response = client.post("/api/v1/profile", json=payload, headers=headers)
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "INVALID_USERNAME"


def test_duplicate_username_conflict(client, test_user_id, test_user_2_id):
    token1 = create_mock_jwt(test_user_id)
    token2 = create_mock_jwt(test_user_2_id)

    # User 1 registers username "unique_coder"
    res1 = client.post(
        "/api/v1/profile",
        json={"username": "unique_coder", "display_name": "Coder 1"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert res1.status_code == 201

    # User 2 tries to register same username
    res2 = client.post(
        "/api/v1/profile",
        json={"username": "unique_coder", "display_name": "Coder 2"},
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert res2.status_code == 409
    data = res2.json()
    assert data["error"]["code"] == "USERNAME_ALREADY_EXISTS"


def test_duplicate_profile_for_same_user(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}

    res1 = client.post(
        "/api/v1/profile",
        json={"username": "first_profile", "display_name": "User One"},
        headers=headers,
    )
    assert res1.status_code == 201

    # Attempting to create a second profile for the same user account
    res2 = client.post(
        "/api/v1/profile",
        json={"username": "second_profile", "display_name": "User One Again"},
        headers=headers,
    )
    assert res2.status_code == 409
    data = res2.json()
    assert data["error"]["code"] == "PROFILE_ALREADY_EXISTS"


def test_get_and_update_my_profile(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create initial profile
    client.post(
        "/api/v1/profile",
        json={"username": "quest_master", "display_name": "Quest Master", "bio": "Starting out"},
        headers=headers,
    )

    # 2. Get profile
    get_res = client.get("/api/v1/profile/me", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["username"] == "quest_master"
    assert get_res.json()["bio"] == "Starting out"

    # 3. Update profile
    update_res = client.put(
        "/api/v1/profile/me",
        json={"bio": "Now on Level 2!", "display_name": "Quest Master Pro"},
        headers=headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["bio"] == "Now on Level 2!"
    assert updated_data["display_name"] == "Quest Master Pro"
    assert updated_data["username"] == "quest_master"


def test_user_cannot_modify_another_user_profile(client, test_user_id, test_user_2_id):
    token1 = create_mock_jwt(test_user_id)
    token2 = create_mock_jwt(test_user_2_id)

    # User 1 creates profile
    client.post(
        "/api/v1/profile",
        json={"username": "user_one", "display_name": "User One"},
        headers={"Authorization": f"Bearer {token1}"},
    )

    # User 2 creates profile
    client.post(
        "/api/v1/profile",
        json={"username": "user_two", "display_name": "User Two"},
        headers={"Authorization": f"Bearer {token2}"},
    )

    # User 2 updates /profile/me -> Only updates User 2's profile
    client.put(
        "/api/v1/profile/me",
        json={"display_name": "User Two Modified"},
        headers={"Authorization": f"Bearer {token2}"},
    )

    # Verify User 1's profile remains untouched
    res1 = client.get("/api/v1/profile/me", headers={"Authorization": f"Bearer {token1}"})
    assert res1.status_code == 200
    assert res1.json()["display_name"] == "User One"


def test_profile_interests_create_and_update(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Create profile with interests
    res = client.post(
        "/api/v1/profile",
        json={
            "username": "coder_interests",
            "display_name": "Coder",
            "interests": ["Python", "Open Source", "Design"],
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["interests"] == ["Python", "Open Source", "Design"]

    # Update profile interests
    up_res = client.put(
        "/api/v1/profile/me",
        json={"interests": ["Rust", "Systems"]},
        headers=headers,
    )
    assert up_res.status_code == 200
    assert up_res.json()["interests"] == ["Rust", "Systems"]

