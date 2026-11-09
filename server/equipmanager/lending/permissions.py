from rest_framework.permissions import BasePermission


class BorrowerListPermissions(BasePermission):
    allowed_roles = frozenset({"TECHNICIAN", "ADMINISTRATOR"})

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) in self.allowed_roles
        )
