from typing import ClassVar

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        TECHNICIAN = 'TECHNICIAN', 'Technician'
        FACULTY = 'FACULTY', 'Faculty'
        ADMINISTRATOR = 'ADMINISTRATOR', 'Administrator'

    role = models.CharField(max_length=20, choices=Role.choices)

    # The createsuperuser command must also ask for an explicit application role.
    REQUIRED_FIELDS: ClassVar[list[str]] = [*AbstractUser.REQUIRED_FIELDS, 'role']

    class Meta(AbstractUser.Meta):
        constraints = (
            models.CheckConstraint(
                condition=models.Q(role__in=['TECHNICIAN', 'FACULTY', 'ADMINISTRATOR']),
                name='users_user_role_valid',
            ),
        )
