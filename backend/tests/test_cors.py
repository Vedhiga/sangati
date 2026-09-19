from tests.conftest import create_mock_jwt


def test_cors_preflight_options(client):
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type",
    }
    response = client.options("/api/v1/discover", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert response.headers.get("access-control-allow-credentials") == "true"
    assert "access-control-allow-methods" in response.headers


def test_cors_authenticated_get_discover(client, test_user_id):
    token = create_mock_jwt(test_user_id)
    headers = {
        "Origin": "http://localhost:3000",
        "Authorization": f"Bearer {token}",
    }
    response = client.get("/api/v1/discover", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert response.headers.get("access-control-allow-credentials") == "true"
    data = response.json()
    assert "people" in data
    assert "total" in data


def test_cors_disallowed_origin(client):
    headers = {
        "Origin": "http://malicious-website.com",
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/api/v1/discover", headers=headers)
    # Origin should not be allowed
    assert response.headers.get("access-control-allow-origin") != "http://malicious-website.com"
