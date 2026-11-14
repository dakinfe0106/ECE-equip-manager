from django.db import IntegrityError, transaction
from django.db.models import CharField, Q, Value
from django.db.models.functions import Concat
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import Borrower
from .permissions import BorrowerListPermissions
from .serializers import BorrowerCreateSerializer, BorrowerListSerializer


class BorrowerPagination(PageNumberPagination):
    page_size = 20


@method_decorator(ensure_csrf_cookie, name="dispatch")
class BorrowerList(generics.ListCreateAPIView):
    serializer_class = BorrowerListSerializer
    pagination_class = BorrowerPagination
    permission_classes = (BorrowerListPermissions,)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return BorrowerCreateSerializer
        return BorrowerListSerializer

    def get_queryset(self):
        borrowers = Borrower.objects.filter(is_deleted=False)
        search = self.request.query_params.get("search", "").strip()
        if search:
            borrowers = borrowers.annotate(
                full_name=Concat(
                    "first_name",
                    Value(" "),
                    "last_name",
                    output_field=CharField(),
                )
            ).filter(
                Q(unb_id__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(full_name__icontains=search)
            )
        return borrowers.order_by("borrower_id")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                borrower = serializer.save()
        except IntegrityError as exc:
            constraint_name = getattr(
                getattr(exc.__cause__, "diag", None), "constraint_name", None
            )
            if constraint_name != "lending_borrower_unb_id_unique":
                raise
            raise ValidationError(
                {"unb_id": ["A borrower with this UNB ID already exists."]}
            ) from exc

        return Response(
            BorrowerListSerializer(borrower).data,
            status=status.HTTP_201_CREATED,
        )