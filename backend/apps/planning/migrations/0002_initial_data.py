from django.db import migrations

def create_initial_data(apps, schema_editor):
    CropCalendar = apps.get_model('planning', 'CropCalendar')
    
    # Data structure: (Crop Name, Month, Action Type, Note)
    # Month: 1=Jan, 2=Feb, ...
    # Action: 'plant', 'harvest', 'care'
    
    data = [
        # Tomate Côtelée
        ('Tomate Côtelée', 2, 'plant', ''), ('Tomate Côtelée', 3, 'plant', ''), ('Tomate Côtelée', 4, 'plant', ''),
        ('Tomate Côtelée', 5, 'care', 'Ébourgeonnage/Pincement'), ('Tomate Côtelée', 6, 'care', 'Palissage continu'),
        ('Tomate Côtelée', 7, 'harvest', ''), ('Tomate Côtelée', 8, 'harvest', ''), ('Tomate Côtelée', 9, 'harvest', ''), ('Tomate Côtelée', 10, 'harvest', ''),
        ('Tomate Côtelée', 4, 'care', 'Ébourgeonnage et Palissage'), # Specific note from legend

        # Poivron & Aubergine
        ('Poivron & Aubergine', 2, 'plant', ''), ('Poivron & Aubergine', 3, 'plant', ''),
        ('Poivron & Aubergine', 5, 'care', 'Pincement fleur royale'), ('Poivron & Aubergine', 6, 'care', 'Palissage, taille feuilles basses'),
        ('Poivron & Aubergine', 7, 'harvest', ''), ('Poivron & Aubergine', 8, 'harvest', ''), ('Poivron & Aubergine', 9, 'harvest', ''), ('Poivron & Aubergine', 10, 'harvest', ''),

        # Pois
        ('Pois (Gourmand/Petit)', 2, 'plant', ''), ('Pois (Gourmand/Petit)', 3, 'plant', ''),
        ('Pois (Gourmand/Petit)', 4, 'care', 'Tuteurage (rames/filets)'),
        ('Pois (Gourmand/Petit)', 5, 'harvest', ''), ('Pois (Gourmand/Petit)', 6, 'harvest', ''), ('Pois (Gourmand/Petit)', 7, 'harvest', ''),

        # Courgette
        ('Courgette', 3, 'plant', ''), ('Courgette', 4, 'plant', ''),
        ('Courgette', 6, 'care', 'Suppression feuilles malades/grandes'),
        ('Courgette', 7, 'harvest', ''), ('Courgette', 8, 'harvest', ''), ('Courgette', 9, 'harvest', ''),

        # Melon
        ('Melon', 3, 'plant', ''), ('Melon', 4, 'plant', ''),
        ('Melon', 5, 'care', 'Taille/Pincement (après 2ème feuille)'), ('Melon', 6, 'care', 'Pincement bras secondaires'),
        ('Melon', 7, 'harvest', ''), ('Melon', 8, 'harvest', ''),

        # Framboisier
        ('Framboisier', 3, 'plant', ''), ('Framboisier', 4, 'plant', ''),
        ('Framboisier', 6, 'harvest', ''), ('Framboisier', 8, 'harvest', ''), ('Framboisier', 9, 'harvest', ''),
        ('Framboisier', 10, 'care', "Taille d'automne (ras du sol)"),

        # Fraise (Serre)
        ('Fraise (Sous Serre Forcée)', 2, 'care', 'Raser fleurs + Chenilles'), ('Fraise (Sous Serre Forcée)', 3, 'care', 'Coupe fils et fleurs'),
        ('Fraise (Sous Serre Forcée)', 4, 'harvest', ''), ('Fraise (Sous Serre Forcée)', 5, 'harvest', ''),
        ('Fraise (Sous Serre Forcée)', 12, 'plant', ''),

        # Fraise (Plein Champ)
        ('Fraise (Plein Champ)', 8, 'plant', ''),
        ('Fraise (Plein Champ)', 12, 'care', 'Nettoyage feuilles âgées'),

        # Haricot Vert
        ('Haricot Vert/Coco', 3, 'plant', ''), ('Haricot Vert/Coco', 5, 'plant', ''), ('Haricot Vert/Coco', 6, 'plant', ''),
        ('Haricot Vert/Coco', 7, 'care', 'Buttage léger'),
        ('Haricot Vert/Coco', 8, 'harvest', ''), ('Haricot Vert/Coco', 9, 'harvest', ''), ('Haricot Vert/Coco', 10, 'harvest', ''),
    ]

    for crop, month, action, note in data:
        # Use update_or_create to avoid duplicates if run multiple times
        CropCalendar.objects.update_or_create(
            crop_name=crop,
            month=month,
            action_type=action,
            defaults={'note': note}
        )

def reverse_func(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('planning', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_initial_data, reverse_func),
    ]
