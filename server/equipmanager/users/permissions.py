from typing import ClassVar

from rest_framework.permissions import DjangoModelPermissions


class ModelPermissionsWithView(DjangoModelPermissions):
    perms_map: ClassVar[dict[str, list[str]]] = {
        **DjangoModelPermissions.perms_map,
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "HEAD": ["%(app_label)s.view_%(model_name)s"],
    }

    def _queryset(self, view):
        queryset = getattr(view, "queryset", None)
        if queryset is None:
            queryset = view.get_queryset()
        assert queryset is not None, (
            f"{view.__class__.__name__} must define a queryset"
        )
        return queryset
