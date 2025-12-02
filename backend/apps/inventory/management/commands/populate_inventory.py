from django.core.management.base import BaseCommand
from apps.inventory.models import InventoryCategory, InventoryItem

class Command(BaseCommand):
    help = 'Populate inventory with initial data'

    def handle(self, *args, **options):
        data = {
            'Tracteurs & Machines': {
                'icon': 'Tracteur',
                'items': [
                    ('Tracteur', 'Unité principale', 1, 'pcs', ''),
                    ('Plastiqueuse', 'Pour paillage', 1, 'pcs', ''),
                    ('Charrue bisoc', 'Labour', 1, 'pcs', ''),
                    ('Griffon', 'Travail du sol', 1, 'pcs', ''),
                    ('Motoculteur Staub', 'Motoculteur', 1, 'pcs', ''),
                    ('Sous-soleuse', 'Travail du sol profond', 1, 'pcs', ''),
                ]
            },
            'Serres & Structures': {
                'icon': 'Serre',
                'items': [
                    ('Serre Multi-Chapelle', 'Grand tunnel', 3, 'pcs', '5m x 80m'),
                    ('Bâche de serre', 'Pour serre', 66, 'pcs', '8m x 4.5m'),
                    ('Arceau pour chenille', 'Petit tunnel', 0, 'pcs', ''),
                    ('Plastique de serre', 'Rouleaux', 0, 'm', ''),
                    ('Corde en bobine', 'Pour palissage', 0, 'm', ''),
                    ('Piquets', 'Support', 0, 'pcs', ''),
                ]
            },
            'Irrigation': {
                'icon': 'Irrigation',
                'items': [
                    ('Pompe à eau', 'Principal', 0, 'pcs', ''),
                    ('Tuyau principal', 'Distribution', 0, 'm', ''),
                    ('Tuyau asperseur (Serre)', 'Micro-aspersion', 0, 'm', ''),
                    ('Asperseur plein champ', 'Canon ou impact', 0, 'pcs', ''),
                    ('Tête de goutte à goutte', 'Goutteurs', 0, 'pcs', ''),
                    ('Gaine goutte à goutte', 'Rouleaux', 0, 'm', ''),
                    ('Bonbonne d\'eau', 'Réservoir tampon', 0, 'pcs', ''),
                    ('Filtre à sable', 'Filtration', 0, 'pcs', ''),
                ]
            },
            'Outils à main': {
                'icon': 'Materiel',
                'items': [
                    ('Pelle', '', 0, 'pcs', ''),
                    ('Râteau', '', 0, 'pcs', ''),
                    ('Traceur', 'Pour alignement', 0, 'pcs', ''),
                    ('Sécateur', 'Taille', 0, 'pcs', ''),
                    ('Brouette', 'Transport', 0, 'pcs', ''),
                ]
            },
            'Semis & Plants': {
                'icon': 'Culture',
                'items': [
                    ('Plateau de semis', 'Alvéolé', 0, 'pcs', ''),
                    ('Plants de Fraise', '', 0, 'pcs', ''),
                    ('Plants de Melon', '', 0, 'pcs', ''),
                    ('Plants d\'Asperge', '', 0, 'pcs', ''),
                    ('Plants de Tomate', '', 0, 'pcs', ''),
                    ('Plants de Courgette', '', 0, 'pcs', ''),
                    ('Plants de Poivron', '', 0, 'pcs', ''),
                    ('Plants d\'Aubergine', '', 0, 'pcs', ''),
                ]
            }
        }

        for cat_name, content in data.items():
            cat, created = InventoryCategory.objects.get_or_create(
                name=cat_name,
                defaults={'icon': content['icon']}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {cat_name}'))
            
            for item_data in content['items']:
                item_name, desc, qty, unit, dims = item_data
                item, created = InventoryItem.objects.get_or_create(
                    name=item_name,
                    category=cat,
                    defaults={
                        'description': desc,
                        'quantity': qty,
                        'unit': unit,
                        'dimensions': dims,
                        'status': 'available'
                    }
                )
                if created:
                    self.stdout.write(f'  - Created item: {item_name}')
                else:
                    # Update existing items with new quantities
                    item.quantity = qty
                    item.dimensions = dims
                    item.save()
                    self.stdout.write(f'  - Updated item: {item_name}')
        
        self.stdout.write(self.style.SUCCESS('Inventory populated successfully'))

