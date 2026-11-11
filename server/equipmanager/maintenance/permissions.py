from rest_framework.permissions import BasePermission


class MaintenanceRolePermissions(BasePermission):
    read_roles = frozenset({"TECHNICIAN", "ADMINISTRATOR"})
    write_roles = frozenset({"TECHNICIAN", "ADMINISTRATOR"})

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        role = getattr(user, "role", None)
        if request.method in {"GET", "HEAD", "OPTIONS"}:
            return role in self.read_roles
        if request.method in {"POST", "PUT", "PATCH"}:
            return role in self.write_roles
        return False
