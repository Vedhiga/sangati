import uuid
from datetime import datetime, timezone, timedelta
import pytest
from tests.conftest import create_mock_jwt
from app.services.feed_ranker import FeedRanker
from app.schemas.activity import ActivityType
from app.models.post import ActivityPost
from app.models.profile import Profile


def test_feed_auth_required(client):
    res = client.get("/api/v1/feed")
    assert res.status_code == 401


def test_feed_ranker_unit_recency_decay():
    now = datetime(2026, 9, 19, 18, 0, 0, tzinfo=timezone.utc)

    # 0 hours ago -> max 2.0
    s0 = FeedRanker.calculate_recency_score(now, now)
    assert round(s0, 2) == 2.0

    # 12 hours ago -> 1.0 (half-life)
    t_12h = now - timedelta(hours=12)
    s12 = FeedRanker.calculate_recency_score(t_12h, now)
    assert round(s12, 2) == 1.0

    # 24 hours ago -> 0.67
    t_24h = now - timedelta(hours=24)
    s24 = FeedRanker.calculate_recency_score(t_24h, now)
    assert round(s24, 2) == 0.67

    # 7 days ago -> ~0.13
    t_7d = now - timedelta(days=7)
    s7d = FeedRanker.calculate_recency_score(t_7d, now)
    assert round(s7d, 2) == 0.13

    # Strictly decreasing
    assert s0 > s12 > s24 > s7d


def test_feed_ranker_unit_scoring_comparison():
    now = datetime(2026, 9, 19, 18, 0, 0, tzinfo=timezone.utc)
    viewer_id = uuid.uuid4()
    connected_user_id = uuid.uuid4()
    stranger_id = uuid.uuid4()
    connected_set = {connected_user_id}

    viewer_interests = ["python", "machine learning"]

    # Post A: Connected author, matching activity LEARN, shared interests, 10 hours old
    prof_a = Profile(
        user_id=connected_user_id,
        username="connected_alice",
        display_name="Alice",
        interests='["python", "machine learning"]',
    )
    post_a = ActivityPost(
        id=uuid.uuid4(),
        author_id=connected_user_id,
        activity_type="LEARN",
        content="Deep dive into transformers",
        created_at=now - timedelta(hours=10),
    )
    score_a = FeedRanker.calculate_post_score(
        post=post_a,
        author_profile=prof_a,
        viewer_activity=ActivityType.LEARN,
        connected_user_ids=connected_set,
        viewer_interests=viewer_interests,
        now=now,
    )
    # Expected A: activity(+3) + connection(+3) + interests(+2) + recency(10h ~ 1.09) = ~9.09
    assert score_a > 9.0

    # Post B: Unconnected stranger, mismatched activity BUILD, unrelated interests, 5 minutes old
    prof_b = Profile(
        user_id=stranger_id,
        username="stranger_bob",
        display_name="Bob",
        interests='["woodworking", "gardening"]',
    )
    post_b = ActivityPost(
        id=uuid.uuid4(),
        author_id=stranger_id,
        activity_type="BUILD",
        content="Built a wooden chair",
        created_at=now - timedelta(minutes=5),
    )
    score_b = FeedRanker.calculate_post_score(
        post=post_b,
        author_profile=prof_b,
        viewer_activity=ActivityType.LEARN,
        connected_user_ids=connected_set,
        viewer_interests=viewer_interests,
        now=now,
    )
    # Expected B: activity(0) + connection(0) + interests(0) + recency(5m ~ 1.98) = ~1.98
    assert score_b < 2.1

    # Verified: Highly relevant older post cleanly beats unrelated fresh post
    assert score_a > score_b


def test_feed_ranker_diversity_interleaving():
    author1 = uuid.uuid4()
    author2 = uuid.uuid4()

    # 4 posts from author1, 1 post from author2
    items = [
        {"id": 1, "author_id": author1, "score": 10},
        {"id": 2, "author_id": author1, "score": 9},
        {"id": 3, "author_id": author1, "score": 8},
        {"id": 4, "author_id": author1, "score": 7},
        {"id": 5, "author_id": author2, "score": 6},
    ]

    interleaved = FeedRanker.apply_author_diversity(items, max_consecutive=2)
    author_seq = [item["author_id"] for item in interleaved]

    # Author 2's post must be pulled forward to break consecutive streak of Author 1
    assert author_seq == [author1, author1, author2, author1, author1]


def test_personalized_feed_api_integration(client, test_user_id, test_user_2_id):
    user3_id = uuid.uuid4()

    token_viewer = create_mock_jwt(test_user_id)
    token_conn = create_mock_jwt(test_user_2_id)
    token_stranger = create_mock_jwt(user3_id)

    headers_viewer = {"Authorization": f"Bearer {token_viewer}"}
    headers_conn = {"Authorization": f"Bearer {token_conn}"}
    headers_stranger = {"Authorization": f"Bearer {token_stranger}"}

    # 1. Setup Profiles
    client.post(
        "/api/v1/profile",
        json={"username": "feed_viewer", "display_name": "Feed Viewer", "interests": ["python", "ai"]},
        headers=headers_viewer,
    )
    client.post(
        "/api/v1/profile",
        json={"username": "feed_friend", "display_name": "Feed Friend", "interests": ["python", "web"]},
        headers=headers_conn,
    )
    client.post(
        "/api/v1/profile",
        json={"username": "feed_stranger", "display_name": "Feed Stranger", "interests": ["cooking"]},
        headers=headers_stranger,
    )

    # 2. Viewer sets intent to LEARN
    client.put("/api/v1/activity/me", json={"activity_type": "LEARN"}, headers=headers_viewer)

    # 3. Form connection between viewer and friend
    req = client.post(f"/api/v1/connections/{test_user_2_id}", headers=headers_viewer)
    conn_id = req.json()["id"]
    client.put(f"/api/v1/connections/{conn_id}/accept", headers=headers_conn)

    # 4. Friend creates a LEARN post (matching activity + connected + shared interest 'python')
    res_p1 = client.post(
        "/api/v1/posts",
        json={"activity_type": "LEARN", "content": "Learning PyTorch internals today."},
        headers=headers_conn,
    )
    post_friend_learn_id = res_p1.json()["id"]

    # 5. Stranger creates a LEARN post (matching activity, but not connected, no shared interest)
    res_p2 = client.post(
        "/api/v1/posts",
        json={"activity_type": "LEARN", "content": "Studying culinary history."},
        headers=headers_stranger,
    )
    post_stranger_learn_id = res_p2.json()["id"]

    # 6. Friend creates a BUILD post (connected, shared interest, but different activity)
    res_p3 = client.post(
        "/api/v1/posts",
        json={"activity_type": "BUILD", "content": "Shipped a new release."},
        headers=headers_conn,
    )
    post_friend_build_id = res_p3.json()["id"]

    # 7. Query GET /api/v1/feed
    res_feed = client.get("/api/v1/feed", headers=headers_viewer)
    assert res_feed.status_code == 200
    feed_data = res_feed.json()

    assert "posts" in feed_data
    assert "pagination" in feed_data
    assert feed_data["current_user_activity"] == "LEARN"

    post_ids = [p["id"] for p in feed_data["posts"]]

    # Friend's LEARN post has: activity(+3) + connection(+3) + interest(+1) + recency(~2) = ~9
    # Friend's BUILD post has: activity(0) + connection(+3) + interest(+1) + recency(~2) = ~6
    # Stranger's LEARN post has: activity(+3) + connection(0) + interest(0) + recency(~2) = ~5
    assert post_ids[0] == post_friend_learn_id
    assert post_ids[1] == post_friend_build_id
    assert post_ids[2] == post_stranger_learn_id

    # 8. Test Pagination
    res_paged = client.get("/api/v1/feed?limit=2&offset=0", headers=headers_viewer)
    assert res_paged.status_code == 200
    paged_data = res_paged.json()
    assert len(paged_data["posts"]) == 2
    assert paged_data["pagination"]["has_more"] is True

    res_paged_2 = client.get("/api/v1/feed?limit=2&offset=2", headers=headers_viewer)
    assert res_paged_2.status_code == 200
    paged_data_2 = res_paged_2.json()
    assert len(paged_data_2["posts"]) >= 1


def test_own_posts_included_in_feed(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/profile",
        json={"username": "self_author", "display_name": "Self Author"},
        headers=headers,
    )

    # Create a post as self
    res_post = client.post(
        "/api/v1/posts",
        json={"activity_type": "BUILD", "content": "My own new post content"},
        headers=headers,
    )
    assert res_post.status_code == 201
    my_post_id = res_post.json()["id"]

    # Retrieve feed
    res_feed = client.get("/api/v1/feed", headers=headers)
    assert res_feed.status_code == 200
    posts = res_feed.json()["posts"]
    feed_post_ids = [p["id"] for p in posts]
    assert my_post_id in feed_post_ids

