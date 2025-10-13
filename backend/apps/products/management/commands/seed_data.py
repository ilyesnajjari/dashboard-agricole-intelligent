from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.products.models import Product
from apps.harvests.models import Harvest
from apps.sales.models import Sale
from apps.purchases.models import Purchase


class Command(BaseCommand):
    help = 'Seed demo data for development'

    def handle(self, *args, **options):
        fraise, _ = Product.objects.get_or_create(name='Fraise', defaults={'category': 'fruit', 'default_unit': 'kg', 'default_price': 3.5})
        tomate, _ = Product.objects.get_or_create(name='Tomate', defaults={'category': 'vegetable', 'default_unit': 'kg', 'default_price': 2.2})

        today = timezone.now().date()
        for i in range(7):
            d = today - timedelta(days=i)
            Harvest.objects.get_or_create(product=fraise, date=d, defaults={'parcel': 'P1', 'quantity_kg': 20+i, 'area_m2': 50, 'cost_per_m2': 0.5})
            Harvest.objects.get_or_create(product=tomate, date=d, defaults={'parcel': 'P2', 'quantity_kg': 15+i, 'area_m2': 40, 'cost_per_m2': 0.4})
            Sale.objects.get_or_create(product=fraise, date=d, defaults={'market': 'velleron', 'quantity_kg': 10+i, 'unit_price': 3.8})
            Sale.objects.get_or_create(product=tomate, date=d, defaults={'market': 'velleron', 'quantity_kg': 8+i, 'unit_price': 2.4})

        Purchase.objects.get_or_create(date=today, category='tools', description='Bacs de récolte', amount=120)
        Purchase.objects.get_or_create(date=today - timedelta(days=2), category='inputs', description='Engrais', amount=80)

        self.stdout.write(self.style.SUCCESS('Seed data created.'))
