
from django.db.models import CharField, Q, Value
from django.db.models.functions import Concat
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination

from .models import Borrower
from .permissions import BorrowerListPermissions
from .serializers import BorrowerDetailSerializer, BorrowerListSerializer


class BorrowerPagination(PageNumberPagination):
    page_size = 20


class BorrowerList(generics.ListAPIView):
    serializer_class = BorrowerListSerializer
    pagination_class = BorrowerPagination
    permission_classes = (BorrowerListPermissions,)

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


class BorrowerDetail(generics.RetrieveUpdateAPIView):
    queryset = Borrower.objects.filter(is_deleted=False)
    serializer_class = BorrowerDetailSerializer
    permission_classes = (BorrowerListPermissions,)
    http_method_names = ("get", "patch", "head", "options")
