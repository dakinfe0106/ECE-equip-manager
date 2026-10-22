
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import CurrentUserSerializer, LoginSerializer


@method_decorator(never_cache, name='dispatch')
@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfToken(APIView):
    # Anonymous clients need a token before submitting credentials.
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response({'csrfToken': get_token(request)})


@method_decorator(never_cache, name='dispatch')
@method_decorator(csrf_protect, name='dispatch')
class Login(APIView):
    # Signing in is public; dispatch explicitly protects anonymous POSTs too.
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request=request, **serializer.validated_data)
        if user is None:
            return Response(
                {'non_field_errors': ['Incorrect username or password.']}, status=400
            )
        login(request, user)
        return Response(CurrentUserSerializer(user).data)


@method_decorator(never_cache, name='dispatch')
@method_decorator(csrf_protect, name='dispatch')
class Logout(APIView):
    # Idempotent logout also lets an already expired session be cleared.
    permission_classes = (AllowAny,)

    def post(self, request):
        logout(request)
        return Response(status=204)


@method_decorator(never_cache, name='dispatch')
class CurrentUser(APIView):
    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)
