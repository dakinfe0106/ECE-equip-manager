import json
from datetime import date
from http.cookiejar import CookieJar
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, ProxyHandler, Request, build_opener

import pytest
from django.contrib.auth import get_user_model
from openpyxl import load_workbook
from rest_framework.test import APIClient

from inventory.models import Asset, Category, EquipmentType
from lending.models import Borrower, Loan

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    user = get_user_model().objects.create_user(
        username='analytics-test', password='synthetic-password', role='FACULTY'
    )
    client = APIClient()
    client.force_login(user)
    return client


@pytest.fixture
def records():
    category = Category.objects.create(name='Meters')
    equipment_type = EquipmentType.objects.create(category=category, name='Digital')
    borrower = Borrower.objects.create(first_name='Synthetic', unb_id='TEST-ONLY')
    loans = []
    for index, (checkout, expected, returned) in enumerate([
        (date(2025, 1, 1), date(2025, 1, 10), date(2025, 1, 11)),
        (date(2025, 2, 1), date(2025, 2, 10), None),
        (date(2024, 12, 1), date(2024, 12, 10), date(2024, 12, 5)),
    ]):
        asset = Asset.objects.create(
            type=equipment_type, asset_identifier=f'TEST-{index}', name='Test meter'
        )
        loans.append(Loan.objects.create(
            asset=asset, borrower=borrower, checkout_date=checkout,
            expected_return_date=expected, actual_return_date=returned,
            return_condition='Intact' if returned else None,
        ))
    return category, equipment_type, loans


def test_historical_reports_and_privacy(client, records):
    with patch('lending.analytics.timezone.localdate', return_value=date(2025, 2, 11)):
        data = client.get('/api/analytics/lending/?year=2025&report=borrowing').json()
    assert data['summary'] == {
        'transactions': 2, 'total_loan_days': 20,
        'average_duration': 10, 'overdue_rate': 100,
    }
    assert len(data['rows']) == 12
    assert data['rows'][:2] == [{'label': 'Jan', 'value': 1}, {'label': 'Feb', 'value': 1}]
    result = client.get('/api/analytics/lending/?year=2025&report=borrowers')
    assert result.json()['rows'][1] == {'label': '2–5 loans', 'value': 1}
    assert 'TEST-ONLY' not in result.content.decode()
    assert 'Synthetic' not in result.content.decode()
    assert 'borrower_id' not in result.content.decode()


def test_utilization_and_archived_history(client, records):
    category, equipment_type, loans = records
    category.is_deleted = True
    category.save()
    equipment_type.is_deleted = True
    equipment_type.save()
    asset = loans[0].asset
    asset.is_deleted = True
    asset.save()
    with patch('lending.analytics.timezone.localdate', return_value=date(2025, 2, 11)):
        response = client.get('/api/analytics/lending/', {
            'year': 2025, 'report': 'utilization',
            'category_id': category.pk, 'equipment_type_id': equipment_type.pk,
        })
    assert response.json()['rows'] == [{'label': 'Meters / Digital', 'value': 20}]
    assert client.get('/api/analytics/availability/').json()['rows'] == []


@pytest.mark.parametrize('query', [
    'year=nope', 'year=0', 'year=10000', 'category_id=-1',
    'equipment_type_id=abc', 'report=unknown',
])
def test_invalid_filters(client, query):
    assert client.get(f'/api/analytics/lending/?{query}').status_code == 400


@pytest.mark.parametrize('path', ['options', 'lending', 'availability'])
def test_reports_require_session_and_are_read_only(client, path):
    url = f'/api/analytics/{path}/'
    assert APIClient().get(url).status_code == 403
    assert client.get(url).status_code == 200
    assert client.post(url, {}, format='json').status_code == 405


@pytest.mark.parametrize('role', ['TECHNICIAN', 'ADMINISTRATOR', 'FACULTY'])
def test_all_application_roles_can_read(role):
    user = get_user_model().objects.create_user(username=role, role=role)
    client = APIClient()
    client.force_login(user)
    for path in ('options', 'lending', 'availability'):
        assert client.get(f'/api/analytics/{path}/').status_code == 200


def test_availability_status_counts_and_filters(client, records):
    category, equipment_type, loans = records
    for loan, status in zip(loans, ['Available', 'On_Loan', 'Under_Maintenance'], strict=True):
        loan.asset.status = status
        loan.asset.save()
    Asset.objects.create(type=equipment_type, asset_identifier='TEST-RETIRED',
                         name='Retired meter', status='Retired')
    rows = client.get('/api/analytics/availability/', {'category_id': category.pk}).json()['rows']
    assert rows == [{'label': 'Meters / Digital', 'available': 1, 'on_loan': 1,
                     'under_maintenance': 1, 'retired': 1, 'total': 4}]
    assert client.get('/api/analytics/availability/?equipment_type_id=999999').json()['rows'] == []
    assert client.get('/api/analytics/availability/?category_id=bad').status_code == 400


def test_empty_and_future_checkouts(client, records):
    with patch('lending.analytics.timezone.localdate', return_value=date(2025, 1, 1)):
        summary = client.get('/api/analytics/lending/?year=2025').json()['summary']
    assert summary['transactions'] == 1
    assert client.get('/api/analytics/lending/?year=1900').json()['summary'] == {
        'transactions': 0, 'total_loan_days': 0, 'average_duration': 0, 'overdue_rate': 0,
    }


def test_due_today_and_same_day_loans(client, records):
    _, _, loans = records
    Loan.objects.create(
        asset=loans[0].asset, borrower=loans[0].borrower,
        checkout_date=date(2025, 2, 10), expected_return_date=date(2025, 2, 10),
    )
    with patch('lending.analytics.timezone.localdate', return_value=date(2025, 2, 10)):
        data = client.get('/api/analytics/lending/?year=2025').json()
    assert data['as_of'] == '2025-02-10'
    assert data['summary'] == {
        'transactions': 3, 'total_loan_days': 19,
        'average_duration': 6.3, 'overdue_rate': 33.3,
    }


def test_checkout_year_keeps_days_beyond_year_end(client, records):
    _, _, loans = records
    loan = loans[2]
    loan.actual_return_date = date(2025, 1, 5)
    loan.save()
    with patch('lending.analytics.timezone.localdate', return_value=date(2025, 2, 11)):
        data = client.get('/api/analytics/lending/?year=2024&report=utilization').json()
    assert data['summary']['total_loan_days'] == 35
    assert data['rows'] == [{'label': 'Meters / Digital', 'value': 35}]


def test_options_and_combined_filters(client, records):
    category, equipment_type, _ = records
    other_category = Category.objects.create(name='Other')
    with patch('lending.analytics.timezone.localdate', return_value=date(2025, 2, 11)):
        options = client.get('/api/analytics/options/').json()
    assert options['years'] == [2025, 2024]
    assert options['equipment_types'] == [{
        'type_id': equipment_type.pk, 'category_id': category.pk,
        'name': 'Digital', 'is_deleted': False,
    }]
    data = client.get('/api/analytics/lending/', {
        'year': 2025, 'category_id': other_category.pk,
        'equipment_type_id': equipment_type.pk,
    }).json()
    assert data['summary']['transactions'] == 0


@pytest.mark.parametrize('role,is_active', [('UNSUPPORTED', True), ('FACULTY', False)])
def test_denies_unsupported_or_inactive_users(role, is_active):
    user = get_user_model().objects.create_user(username='denied', role='FACULTY')
    # Supply an invalid role in memory without weakening the model's constraint.
    user.role = role
    user.is_active = is_active
    client = APIClient()
    client.force_authenticate(user)
    for path in ('options', 'lending', 'availability'):
        assert client.get(f'/api/analytics/{path}/').status_code == 403


@pytest.mark.django_db(transaction=True)
def test_analytics_over_real_http_with_csrf_and_session(live_server, records):
    get_user_model().objects.create_user(
        username='http-analytics-test', password='synthetic-http-password', role='FACULTY'
    )
    # Use an isolated test database and actual HTTP, not mocked API responses.
    opener = build_opener(ProxyHandler({}), HTTPCookieProcessor(CookieJar()))

    def read(path):
        with opener.open(f'{live_server.url}/api/{path}', timeout=10) as response:
            return json.load(response)

    with pytest.raises(HTTPError) as denied:
        read('analytics/lending/')
    assert denied.value.code == 403
    token = read('auth/csrf/')['csrfToken']
    login = Request(
        f'{live_server.url}/api/auth/login/', method='POST',
        data=json.dumps({
            'username': 'http-analytics-test', 'password': 'synthetic-http-password',
        }).encode(),
        headers={'Content-Type': 'application/json', 'X-CSRFToken': token},
    )
    with opener.open(login, timeout=10) as response:
        assert response.status == 200
    assert read('analytics/options/')['equipment_types'][0]['name'] == 'Digital'
    assert read('analytics/availability/')['rows'][0]['total'] == 3
    for report in ('utilization', 'borrowing', 'borrowers'):
        data = read(f'analytics/lending/?year=2025&report={report}')
        assert data['summary']['transactions'] == 2
    with opener.open(
        f'{live_server.url}/api/analytics/exports/?reports=availability&reports=borrowers&scope=all',
        timeout=10,
    ) as response:
        book = load_workbook(BytesIO(response.read()))
    assert book.sheetnames == ['Export details', 'Equipment Availability', 'Borrower Activity']
