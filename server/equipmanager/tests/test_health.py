def test_health_endpoint_returns_ok_with_frontend_cors(client):
    response = client.get(
        '/api/health/',
        HTTP_ORIGIN='http://localhost:5173',
    )

    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}
    assert response['Access-Control-Allow-Origin'] == 'http://localhost:5173'

def test_invalid_api_endpoint_returns_404(client):
    response = client.get('/api/this-does-not-exist/')

    assert response.status_code == 404