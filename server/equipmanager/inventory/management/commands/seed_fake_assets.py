from datetime import date

from django.core.management.base import BaseCommand

from equipmanager.text import normalize_text
from inventory.models import Asset, Category, EquipmentType


class Command(BaseCommand):
    help = "Create a small set of fake asset records for local testing."

    def handle(self, *args, **options):
        asset_seed = [
            {
                "asset_identifier": "DEMO-EMS-001",
                "name": "Cordless Drill",
                "category": "Tools",
                "equipment_type": "Power Tools",
                "acquisition_date": date(2024, 3, 15),
                "status": Asset.Status.AVAILABLE,
            },
            {
                "asset_identifier": "DEMO-EMS-002",
                "name": "Precision Screwdriver Set",
                "category": "Tools",
                "equipment_type": "Hand Tools",
                "acquisition_date": date(2024, 5, 20),
                "status": Asset.Status.AVAILABLE,
            },
            {
                "asset_identifier": "DEMO-EMS-003",
                "name": "Digital Multimeter",
                "category": "Lab Gear",
                "equipment_type": "Measurement Equipment",
                "acquisition_date": date(2024, 8, 7),
                "status": Asset.Status.UNDER_MAINTENANCE,
            },
            {
                "asset_identifier": "DEMO-EMS-004",
                "name": "Oscilloscope",
                "category": "Lab Gear",
                "equipment_type": "Measurement Equipment",
                "acquisition_date": date(2024, 10, 12),
                "status": Asset.Status.ON_LOAN,
            },
            {
                "asset_identifier": "DEMO-EMS-005",
                "name": "Arduino Starter Kit",
                "category": "Kits",
                "equipment_type": "Electronics Kits",
                "acquisition_date": date(2025, 1, 9),
                "status": Asset.Status.AVAILABLE,
            },
        ]

        created = 0
        for entry in asset_seed:
            category, _ = Category.objects.get_or_create(
                name=normalize_text(entry["category"])
            )
            asset_type, _ = EquipmentType.objects.get_or_create(
                category=category,
                name=normalize_text(entry["equipment_type"]),
            )
            _, was_created = Asset.objects.get_or_create(
                asset_identifier=normalize_text(entry["asset_identifier"]),
                defaults={
                    "name": normalize_text(entry["name"]),
                    "type": asset_type,
                    "acquisition_date": entry["acquisition_date"],
                    "status": entry["status"],
                },
            )
            created += int(was_created)

        self.stdout.write(self.style.SUCCESS(f"Created {created} fake assets."))
