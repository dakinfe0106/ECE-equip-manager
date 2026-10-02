import pytest
from django.contrib.auth import get_user_model

from .models import User


@pytest.mark.django_db
def test_custom_user_model_is_active():
    user = get_user_model().objects.create_user(username='tech', password='pw-for-tests')

    assert get_user_model() is User
    assert user.check_password('pw-for-tests')
