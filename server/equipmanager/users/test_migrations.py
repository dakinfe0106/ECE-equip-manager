import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


@pytest.mark.django_db(transaction=True)
def test_role_migration_assigns_administrator_to_existing_users():
    old_target = [('users', '0001_initial')]
    new_target = [('users', '0002_user_role_user_users_user_role_valid')]
    executor = MigrationExecutor(connection)
    try:
        executor.migrate(old_target)
        old_user = executor.loader.project_state(old_target).apps.get_model('users', 'User')
        old_user.objects.create(username='existing-admin', is_staff=True, is_superuser=True)
        old_user.objects.create(username='existing-account')
        executor = MigrationExecutor(connection)
        executor.migrate(new_target)
        user_model = executor.loader.project_state(new_target).apps.get_model('users', 'User')
        assert list(user_model.objects.values_list('role', flat=True)) == [
            'ADMINISTRATOR', 'ADMINISTRATOR',
        ]
        ordinary = user_model.objects.get(username='existing-account')
        assert not ordinary.is_staff
        assert not ordinary.is_superuser
        assert not user_model._meta.get_field('role').has_default()
    finally:
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
