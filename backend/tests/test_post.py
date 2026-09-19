import uuid
import pytest
from tests.conftest import create_mock_jwt


def test_post_auth_required(client):
    fake_id = uuid.uuid4()

    res1 = client.post("/api/v1/posts", json={"activity_type": "BUILD", "content": "Hello world"})
    assert res1.status_code == 401

    res2 = client.get("/api/v1/posts")
    assert res2.status_code == 401

    res3 = client.get(f"/api/v1/posts/user/{fake_id}")
    assert res3.status_code == 401

    res4 = client.put(f"/api/v1/posts/{fake_id}", json={"content": "Updated"})
    assert res4.status_code == 401

    res5 = client.delete(f"/api/v1/posts/{fake_id}")
    assert res5.status_code == 401


def test_create_post_validation(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Creating post without profile fails with 404
    res_no_prof = client.post(
        "/api/v1/posts",
        json={"activity_type": "BUILD", "content": "My first build"},
        headers=headers,
    )
    assert res_no_prof.status_code == 404

    # Now create profile
    client.post(
        "/api/v1/profile",
        json={"username": "post_author", "display_name": "Author Guy"},
        headers=headers,
    )

    # Invalid activity
    res_inv_act = client.post(
        "/api/v1/posts",
        json={"activity_type": "GAMING", "content": "Playing games"},
        headers=headers,
    )
    assert res_inv_act.status_code == 400
    assert res_inv_act.json()["error"]["code"] == "VALIDATION_ERROR"

    # Empty content
    res_empty = client.post(
        "/api/v1/posts",
        json={"activity_type": "BUILD", "content": ""},
        headers=headers,
    )
    assert res_empty.status_code == 400
    assert res_empty.json()["error"]["code"] == "VALIDATION_ERROR"

    # Whitespace content
    res_ws = client.post(
        "/api/v1/posts",
        json={"activity_type": "BUILD", "content": "     "},
        headers=headers,
    )
    assert res_ws.status_code == 400
    assert res_ws.json()["error"]["code"] == "VALIDATION_ERROR"

    # Oversized content
    res_over = client.post(
        "/api/v1/posts",
        json={"activity_type": "BUILD", "content": "a" * 1001},
        headers=headers,
    )
    assert res_over.status_code == 400
    assert res_over.json()["error"]["code"] == "VALIDATION_ERROR"


def test_post_lifecycle_and_ordering(client, test_user_id, test_user_2_id):
    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Setup profiles
    client.post(
        "/api/v1/profile",
        json={"username": "alice_posts", "display_name": "Alice P", "bio": "Building stuff"},
        headers=headers_a,
    )
    client.post(
        "/api/v1/profile",
        json={"username": "bob_posts", "display_name": "Bob P", "bio": "Learning stuff"},
        headers=headers_b,
    )

    # 1. Alice creates BUILD post
    res_a1 = client.post(
        "/api/v1/posts",
        json={"activity_type": "BUILD", "content": "I built a small RAG chatbot today."},
        headers=headers_a,
    )
    assert res_a1.status_code == 201
    post_a1_data = res_a1.json()
    assert post_a1_data["activity_type"] == "BUILD"
    assert post_a1_data["content"] == "I built a small RAG chatbot today."
    assert post_a1_data["author"]["username"] == "alice_posts"
    post_a1_id = post_a1_data["id"]

    # 2. Bob creates LEARN post
    res_b1 = client.post(
        "/api/v1/posts",
        json={"activity_type": "LEARN", "content": "I finally understood how attention works."},
        headers=headers_b,
    )
    assert res_b1.status_code == 201
    post_b1_data = res_b1.json()
    assert post_b1_data["author"]["username"] == "bob_posts"
    post_b1_id = post_b1_data["id"]

    # 3. Alice creates EXPLORE post
    res_a2 = client.post(
        "/api/v1/posts",
        json={"activity_type": "EXPLORE", "content": "I came across an interesting paper about agent architectures."},
        headers=headers_a,
    )
    assert res_a2.status_code == 201
    post_a2_id = res_a2.json()["id"]

    # 4. GET /api/v1/posts should return newest first (Alice EXPLORE, Bob LEARN, Alice BUILD)
    res_feed = client.get("/api/v1/posts", headers=headers_a)
    assert res_feed.status_code == 200
    feed_data = res_feed.json()
    assert feed_data["total"] >= 3
    feed_ids = [p["id"] for p in feed_data["posts"][:3]]
    assert feed_ids == [post_a2_id, post_b1_id, post_a1_id]

    # 5. Filter by activity
    res_learn = client.get("/api/v1/posts?activity=LEARN", headers=headers_a)
    assert res_learn.status_code == 200
    learn_posts = res_learn.json()["posts"]
    assert all(p["activity_type"] == "LEARN" for p in learn_posts)
    assert any(p["id"] == post_b1_id for p in learn_posts)

    # 6. Pagination
    res_page = client.get("/api/v1/posts?limit=1&offset=1", headers=headers_a)
    assert res_page.status_code == 200
    page_data = res_page.json()
    assert len(page_data["posts"]) == 1
    assert page_data["posts"][0]["id"] == post_b1_id

    # 7. GET /api/v1/posts/user/{user_id}
    res_user_a = client.get(f"/api/v1/posts/user/{test_user_id}", headers=headers_b)
    assert res_user_a.status_code == 200
    user_a_posts = res_user_a.json()["posts"]
    assert len(user_a_posts) == 2
    assert all(p["author_id"] == str(test_user_id) for p in user_a_posts)


def test_edit_and_delete_authorization(client, test_user_id, test_user_2_id):
    token_a = create_mock_jwt(test_user_id)
    token_b = create_mock_jwt(test_user_2_id)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    client.post(
        "/api/v1/profile",
        json={"username": "alice_perm", "display_name": "Alice Perm"},
        headers=headers_a,
    )
    client.post(
        "/api/v1/profile",
        json={"username": "bob_perm", "display_name": "Bob Perm"},
        headers=headers_b,
    )

    # Alice creates post
    res_create = client.post(
        "/api/v1/posts",
        json={"activity_type": "CONVERSATION", "content": "How do people decide which ML project to build?"},
        headers=headers_a,
    )
    post_id = res_create.json()["id"]

    # Bob tries to edit Alice's post -> 403
    res_bob_edit = client.put(
        f"/api/v1/posts/{post_id}",
        json={"content": "Tampered content"},
        headers=headers_b,
    )
    assert res_bob_edit.status_code == 403
    assert res_bob_edit.json()["error"]["code"] == "UNAUTHORIZED_POST_ACTION"

    # Alice successfully edits her post
    res_alice_edit = client.put(
        f"/api/v1/posts/{post_id}",
        json={"content": "How do people decide which ML project to build? Any recommendations?"},
        headers=headers_a,
    )
    assert res_alice_edit.status_code == 200
    assert res_alice_edit.json()["content"] == "How do people decide which ML project to build? Any recommendations?"

    # Bob tries to delete Alice's post -> 403
    res_bob_del = client.delete(f"/api/v1/posts/{post_id}", headers=headers_b)
    assert res_bob_del.status_code == 403
    assert res_bob_del.json()["error"]["code"] == "UNAUTHORIZED_POST_ACTION"

    # Alice successfully deletes her post
    res_alice_del = client.delete(f"/api/v1/posts/{post_id}", headers=headers_a)
    assert res_alice_del.status_code == 200
    assert res_alice_del.json()["success"] is True

    # Post is no longer found
    res_alice_del_again = client.delete(f"/api/v1/posts/{post_id}", headers=headers_a)
    assert res_alice_del_again.status_code == 404
