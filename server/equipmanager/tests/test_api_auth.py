import runpy
from pathlib import Path

import pytest
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory


@api_view(['GET'])
def protected_view(_request):
    return Response({'status': 'ok'})


def test_default_session_auth_rejects_anonymous_request_with_403():
    request = APIRequestFactory().get('/api/test-protected/')
    response = protected_view(request)

    assert response.status_code == 403
    assert str(response.data['detail']) == 'Authentication credentials were not provided.'


@pytest.mark.parametrize('csrf_origins, expected', [
    (None, ['http://localhost:5173', 'http://localhost:5174']),
    (' http://localhost:5175, ,http://localhost:5176 ',
     ['http://localhost:5175', 'http://localhost:5176']),
])
def test_csrf_origins_support_explicit_configuration_and_cors_fallback(
    monkeypatch, csrf_origins, expected
):
    monkeypatch.setenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5174')
    if csrf_origins is None:
        monkeypatch.delenv('CSRF_TRUSTED_ORIGINS', raising=False)
    else:
        monkeypatch.setenv('CSRF_TRUSTED_ORIGINS', csrf_origins)
    # Avoid local .env values influencing the explicit environment cases.
    monkeypatch.setattr('dotenv.load_dotenv', lambda *args, **kwargs: None)
    settings_path = Path(__file__).resolve().parents[1] / 'equipmanager' / 'settings.py'
    config = runpy.run_path(str(settings_path))
    assert config['CSRF_TRUSTED_ORIGINS'] == expected
    assert config['CORS_ALLOW_CREDENTIALS'] is True
