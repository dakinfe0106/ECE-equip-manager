
from django.db.models import CharField, Count, Q, Value
from django.db.models.functions import Concat
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Borrower, DamageFlag
from .permissions import BorrowerListPermissions
from .serializers import (
    BorrowerDetailSerializer,
    BorrowerListSerializer,
    DamageFlagResolutionSerializer,
    DamageFlagSerializer,
    DamageFlagUpdateSerializer,
    DamageFlagWriteSerializer,
)
from .services import (
    DamageFlagRuleError,
    damage_flag_summary,
    record_damage_flag,
    resolve_damage_flag,
    update_damage_flag,
)


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


class BorrowerDetail(generics.RetrieveAPIView):
    serializer_class = BorrowerDetailSerializer
    permission_classes = (BorrowerListPermissions,)
    queryset = Borrower.objects.filter(is_deleted=False).annotate(
        unresolved_damage_flag_count=Count(
            "damage_flags",
            filter=Q(
                damage_flags__status=DamageFlag.Status.UNRESOLVED,
                damage_flags__reviewed_at__isnull=False,
            ),
        )
    )


class BorrowerDamageFlagListCreate(APIView):
    permission_classes = (BorrowerListPermissions,)

    def get(self, request, pk):
        borrower = get_object_or_404(Borrower, borrower_id=pk, is_deleted=False)
        flags = list(
            DamageFlag.objects.filter(borrower=borrower)
            .select_related("borrower", "asset", "reviewed_by", "resolved_by")
            .order_by("-incident_date", "-created_at", "-damage_flag_id")
        )
        return Response({
            "count": len(flags),
            "results": DamageFlagSerializer(flags, many=True).data,
            "summary": damage_flag_summary(borrower=borrower),
        })

    def post(self, request, pk):
        get_object_or_404(Borrower, borrower_id=pk, is_deleted=False)
        serializer = DamageFlagWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            flag, summary = record_damage_flag(
                borrower_id=pk,
                technician=request.user,
                data=dict(serializer.validated_data),
            )
        except Borrower.DoesNotExist as error:
            raise NotFound("Borrower not found.") from error
        except DamageFlagRuleError as error:
            raise ValidationError(error.errors) from error

        flag = DamageFlag.objects.select_related(
            "borrower", "asset", "reviewed_by", "resolved_by"
        ).get(pk=flag.pk)
        return Response(
            {
                "damage_flag": DamageFlagSerializer(flag).data,
                "summary": summary,
            },
            status=status.HTTP_201_CREATED,
        )


class BorrowerDamageFlagDetail(APIView):
    permission_classes = (BorrowerListPermissions,)

    def patch(self, request, pk, damage_flag_id):
        borrower = get_object_or_404(Borrower, borrower_id=pk, is_deleted=False)
        existing_flag = get_object_or_404(
            DamageFlag.objects.filter(borrower=borrower),
            damage_flag_id=damage_flag_id,
        )
        serializer = DamageFlagUpdateSerializer(
            data=request.data,
            partial=True,
            context={"current_asset_id": existing_flag.asset_id},
        )
        serializer.is_valid(raise_exception=True)
        try:
            flag, summary = update_damage_flag(
                borrower_id=pk,
                damage_flag_id=damage_flag_id,
                technician=request.user,
                data=serializer.validated_data,
            )
        except (Borrower.DoesNotExist, DamageFlag.DoesNotExist) as error:
            raise NotFound("Damage flag not found for this borrower.") from error
        except DamageFlagRuleError as error:
            raise ValidationError(error.errors) from error

        return Response({
            "damage_flag": DamageFlagSerializer(flag).data,
            "summary": summary,
        })

    def post(self, request, pk, damage_flag_id):
        borrower = get_object_or_404(Borrower, borrower_id=pk, is_deleted=False)
        get_object_or_404(
            DamageFlag.objects.filter(borrower=borrower),
            damage_flag_id=damage_flag_id,
        )
        serializer = DamageFlagResolutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            flag, summary = resolve_damage_flag(
                borrower_id=pk,
                damage_flag_id=damage_flag_id,
                technician=request.user,
                resolution_reason=serializer.validated_data["resolution_reason"],
            )
        except (Borrower.DoesNotExist, DamageFlag.DoesNotExist) as error:
            raise NotFound("Damage flag not found for this borrower.") from error
        except DamageFlagRuleError as error:
            raise ValidationError(error.errors) from error

        return Response({
            "damage_flag": DamageFlagSerializer(flag).data,
            "summary": summary,
        })
