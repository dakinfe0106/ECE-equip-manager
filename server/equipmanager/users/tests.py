import pytest
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import RequestFactory
from django.urls import reverse
from rest_framework.test import APIClient

from .models import User


@pytest.mark.django_db
def test_custom_user_model_is_active():
    user = get_user_model().objects.create_user(username='tech', password='pw-for-tests')

    assert get_user_model() is User
    assert user.check_password('pw-for-tests')


@pytest.mark.django_db
def test_csrf_endpoint_is_public_and_sets_a_cookie():
    response = APIClient().get(reverse('auth-csrf'))

    assert response.status_code == 200
    assert response.json()['csrfToken']
    assert 'csrftoken' in response.cookies


@pytest.mark.django_db
def test_login_rejects_requests_without_a_csrf_token():
    get_user_model().objects.create_user(
        username='shop-tech',
        password='pw-for-tests',
    )
    response = APIClient(enforce_csrf_checks=True).post(
        reverse('auth-login'),
        {'username': 'shop-tech', 'password': 'pw-for-tests'},
        format='json',
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_login_returns_user_permissions_and_session_can_be_ended():
    user = get_user_model().objects.create_user(
        username='shop-tech',
        password='pw-for-tests',
    )
    user.groups.add(Group.objects.get(name='Technician'))
    client = APIClient(enforce_csrf_checks=True)
    csrf_response = client.get(reverse('auth-csrf'))
    csrf_token = csrf_response.json()['csrfToken']

    login_response = client.post(
        reverse('auth-login'),
        {'username': 'shop-tech', 'password': 'pw-for-tests'},
        format='json',
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert login_response.status_code == 200
    assert login_response.json()['username'] == 'shop-tech'
    assert 'inventory.add_asset' in login_response.json()['permissions']
    assert client.get(reverse('auth-current-user')).json()['id'] == user.pk

    csrf_token = client.get(reverse('auth-csrf')).json()['csrfToken']
    logout_response = client.post(
        reverse('auth-logout'),
        format='json',
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert logout_response.status_code == 204
    assert client.get(reverse('auth-current-user')).status_code == 403


@pytest.mark.django_db
def test_administrator_group_includes_user_access_permissions():
    user = get_user_model().objects.create_user(
        username='shop-admin',
        password='pw-for-tests',
    )
    user.groups.add(Group.objects.get(name='Administrator'))

    assert 'users.add_user' in user.get_all_permissions()
    assert 'users.change_user' in user.get_all_permissions()
    assert 'auth.change_group' not in user.get_all_permissions()


@pytest.mark.django_db
def test_administrator_user_admin_cannot_grant_superuser_privileges():
    user = get_user_model().objects.create_user(
        username='shop-admin',
        password='pw-for-tests',
    )
    user.groups.add(Group.objects.get(name='Administrator'))
    request = RequestFactory().get('/admin/users/user/')
    request.user = user
    user_admin = admin.site._registry[get_user_model()]

    fieldsets = user_admin.get_fieldsets(request, user)
    fields = {
        field
        for _, options in fieldsets
        for field in options.get('fields', ())
    }
    group_field = get_user_model()._meta.get_field('groups')
    group_form_field = user_admin.formfield_for_manytomany(group_field, request)

    assert 'groups' in fields
    assert 'is_staff' not in fields
    assert 'is_superuser' not in fields
    assert 'user_permissions' not in fields
    assert set(group_form_field.queryset.values_list('name', flat=True)) == {
        'Technician',
        'Faculty',
        'Administrator',
    }


@pytest.mark.django_db
def test_invalid_credentials_return_a_clear_client_error():
    client = APIClient(enforce_csrf_checks=True)
    csrf_token = client.get(reverse('auth-csrf')).json()['csrfToken']

    response = client.post(
        reverse('auth-login'),
        {'username': 'unknown-user', 'password': 'invalid'},
        format='json',
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert response.status_code == 400
    assert response.json()['detail'] == 'Invalid username or password.'
