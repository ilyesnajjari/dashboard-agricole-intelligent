from django.core.management.base import BaseCommand
from apps.planning.models import CropCalendar

class Command(BaseCommand):
    help = 'Add strawberry field care tasks for September and October'

    def handle(self, *args, **options):
        # September: Cut flowers and add fertilizer
        CropCalendar.objects.get_or_create(
            crop_name='Fraise Plein Champ',
            month=9,
            action_type='care',
            defaults={'note': 'Couper les fleurs + Engrais'}
        )
        
        # October: Cut runners (stolons) and add fertilizer
        CropCalendar.objects.get_or_create(
            crop_name='Fraise Plein Champ',
            month=10,
            action_type='care',
            defaults={'note': 'Couper les stolons + Engrais'}
        )
        
        self.stdout.write(self.style.SUCCESS('Successfully added strawberry field care tasks'))
