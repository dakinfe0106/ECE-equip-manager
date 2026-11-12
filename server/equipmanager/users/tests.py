import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import User


@pytest.mark.django_db
def test_custom_user_model_is_active():
    user = get_user_model().objects.create_user(role='TECHNICIAN', username='tech', password='pw-for-tests')

    assert get_user_model() is User
    assert user.check_password('pw-for-tests')


@pytest.fixture
def account():
    return get_user_model().objects.create_user(
        role='TECHNICIAN',
        username='shoptech', password=' synthetic password ',
        first_name='Test', last_name='Technician',
    )


def csrf_headers(client):
    response = client.get('/api/auth/csrf/')
    assert response.status_code == 200
    assert 'csrftoken' in response.cookies
    assert 'no-store' in response['Cache-Control']
    return {'HTTP_X_CSRFTOKEN': response.data['csrfToken']}


def sign_in(client):
    return client.post(
        '/api/auth/login/',
        {'username': ' shoptech ', 'password': ' synthetic password '},
        format='json', **csrf_headers(client),
    )


@pytest.mark.django_db
def test_login_restores_user_and_rotates_session_and_csrf(account):
    client = APIClient(enforce_csrf_checks=True)
    headers = csrf_headers(client)
    old_token = client.cookies['csrftoken'].value
    session = client.session
    session['pre_login'] = 'synthetic'
    session.save()
    old_session = session.session_key
    response = client.post(
        '/api/auth/login/',
        {'username': ' shoptech ', 'password': ' synthetic password '},
        format='json', **headers,
    )
    expected = {
        'id': account.pk, 'username': 'shoptech',
        'first_name': 'Test', 'last_name': 'Technician',
        'role': 'TECHNICIAN', 'role_label': 'Technician',
    }
    assert response.status_code == 200
    assert response.data == expected
    assert 'no-store' in response['Cache-Control']
    assert client.cookies['csrftoken'].value != old_token
    assert client.session.session_key != old_session
    assert client.get('/api/auth/me/').data == expected
    assert client.get('/api/assets/').status_code == 200


@pytest.mark.django_db
@pytest.mark.parametrize('payload', [
    {}, {'username': 'shoptech'}, {'password': 'synthetic'},
    {'username': '', 'password': ''},
    {'username': 'shoptech', 'password': 'wrong'},
    {'username': 'missing', 'password': 'wrong'},
    {'username': 'shoptech', 'password': 'synthetic password'},
])
def test_login_rejects_invalid_input_without_creating_session(account, payload):
    client = APIClient(enforce_csrf_checks=True)
    response = client.post('/api/auth/login/', payload, format='json', **csrf_headers(client))
    assert response.status_code == 400
    assert client.get('/api/auth/me/').status_code == 403


@pytest.mark.django_db
def test_inactive_account_has_same_error_as_invalid_credentials(account):
    client = APIClient(enforce_csrf_checks=True)
    account.is_active = False
    account.save(update_fields=['is_active'])
    response = sign_in(client)
    assert response.status_code == 400
    assert response.data == {'non_field_errors': ['Incorrect username or password.']}
    assert client.get('/api/auth/me/').status_code == 403


@pytest.mark.django_db
@pytest.mark.parametrize('path', ['/api/auth/login/', '/api/auth/logout/'])
def test_anonymous_posts_require_csrf(account, path):
    client = APIClient(enforce_csrf_checks=True)
    payload = {'username': 'shoptech', 'password': ' synthetic password '}
    assert client.post(path, payload, format='json').status_code == 403
    csrf_headers(client)
    assert client.post(path, payload, format='json', HTTP_X_CSRFTOKEN='x' * 32).status_code == 403
    assert client.get('/api/auth/me/').status_code == 403


@pytest.mark.django_db
def test_logout_requires_csrf_and_ends_session(account):
    client = APIClient(enforce_csrf_checks=True)
    assert sign_in(client).status_code == 200
    assert client.post('/api/auth/logout/').status_code == 403
    assert client.get('/api/auth/me/').status_code == 200
    assert client.post('/api/auth/logout/', **csrf_headers(client)).status_code == 204
    assert client.get('/api/auth/me/').status_code == 403
    assert client.get('/api/assets/').status_code == 403
    assert client.post('/api/auth/logout/', **csrf_headers(client)).status_code == 204


@pytest.mark.django_db
def test_deactivation_revokes_existing_session(account):
    client = APIClient(enforce_csrf_checks=True)
    assert sign_in(client).status_code == 200
    account.is_active = False
    account.save(update_fields=['is_active'])
    assert client.get('/api/auth/me/').status_code == 403
    assert client.get('/api/assets/').status_code == 403


@pytest.mark.django_db
def test_login_rejects_untrusted_origin(account):
    client = APIClient(enforce_csrf_checks=True)
    response = client.post(
        '/api/auth/login/', {'username': 'shoptech', 'password': ' synthetic password '},
        format='json', HTTP_ORIGIN='https://untrusted.invalid', **csrf_headers(client),
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_login_from_configured_frontend_origin(account, settings):
    settings.CSRF_TRUSTED_ORIGINS = ['http://localhost:5173']
    client = APIClient(enforce_csrf_checks=True)
    response = client.post(
        '/api/auth/login/', {'username': 'shoptech', 'password': ' synthetic password '},
        format='json', HTTP_ORIGIN='http://localhost:5173', **csrf_headers(client),
    )
    assert response.status_code == 200


@pytest.mark.django_db
@pytest.mark.parametrize('role', User.Role.values)
def test_auth_response_includes_assigned_role(account, role):
    account.role = role
    account.save(update_fields=['role'])
    client = APIClient(enforce_csrf_checks=True)
    response = sign_in(client)
    assert response.status_code == 200
    assert response.data['role'] == role
    assert response.data['role_label'] == User.Role(role).label
    assert client.get('/api/auth/me/').data == response.data


@pytest.mark.django_db
@pytest.mark.parametrize('role', ['', 'ADMIN', 'technician', None])
def test_database_rejects_missing_or_invalid_role(role):
    from django.db import IntegrityError, transaction

    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.create_user(username='invalid-role', role=role)


@pytest.mark.django_db
def test_creating_user_requires_explicit_role():
    from django.db import IntegrityError, transaction

    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.create_user(username='missing-role')


@pytest.mark.django_db
def test_role_does_not_grant_django_administration():
    user = User.objects.create_user(username='app-admin', role=User.Role.ADMINISTRATOR)
    assert not user.is_staff
    assert not user.is_superuser


@pytest.mark.django_db
def test_admin_forms_require_role_and_save_selection():
    from django.contrib import admin
    from django.test import RequestFactory

    from .admin import EquipmentUserAdmin

    request = RequestFactory().get('/admin/users/user/add/')
    request.user = User.objects.create_superuser(
        username='super-admin', password='synthetic password', role=User.Role.ADMINISTRATOR,
    )
    model_admin = EquipmentUserAdmin(User, admin.site)
    form_class = model_admin.get_form(request, obj=None)
    data = {
        'username': 'new-faculty', 'password1': 'synthetic-strong-password-726',
        'password2': 'synthetic-strong-password-726', 'usable_password': 'true',
    }
    missing_role = form_class(data=data)
    assert not missing_role.is_valid()
    assert 'role' in missing_role.errors
    form = form_class(data={**data, 'role': User.Role.FACULTY})
    assert form.is_valid(), form.errors
    user = form.save()
    assert user.role == User.Role.FACULTY
    assert not user.is_staff
    assert not user.is_superuser
    change_form = model_admin.get_form(request, obj=user)
    assert 'role' in change_form.base_fields
