from typing import ClassVar

from rest_framework.permissions import BasePermission


class AnalyticsReadPermissions(BasePermission):
    """Allow aggregate reporting to each active application role."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and getattr(user, 'role', None) in {
                'TECHNICIAN', 'FACULTY', 'ADMINISTRATOR'
            }
        )


class InventoryRolePermissions(BasePermission):
    method_actions: ClassVar[dict[str, str]] = {
        "GET": "view",
        "HEAD": "view",
        "OPTIONS": "view",
        "POST": "add",
        "PUT": "change",
        "PATCH": "change",
        "DELETE": "delete",
    }
    read_roles: ClassVar[frozenset[str]] = frozenset(
        {"TECHNICIAN", "FACULTY", "ADMINISTRATOR"}
    )
    write_roles: ClassVar[frozenset[str]] = frozenset(
        {"TECHNICIAN", "ADMINISTRATOR"}
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        action = self.method_actions.get(request.method)
        queryset = getattr(view, "queryset", None)
        if queryset is None:
            queryset = view.get_queryset()
        if action is None or queryset is None:
            return False

        model = queryset.model
        if model._meta.app_label != "inventory":
            return False

        role = getattr(user, "role", None)
        if action == "view":
            return role in self.read_roles
        return role in self.write_roles


class StaffRolePermissions(BasePermission):
    """Allow active Technicians and Administrators only."""

    allowed_roles: ClassVar[frozenset[str]] = frozenset(
        {"TECHNICIAN", "ADMINISTRATOR"}
    )

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and getattr(user, "role", None) in self.allowed_roles
        )
