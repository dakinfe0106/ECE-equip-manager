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
