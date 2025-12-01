from django.db import migrations

def create_default_categories(apps, schema_editor):
    LogCategory = apps.get_model('logbook', 'LogCategory')
    
    default_categories = [
        {'name': 'Observation', 'color': '#2196F3'},
        {'name': 'Intervention', 'color': '#FF9800'},
        {'name': 'Récolte', 'color': '#4CAF50'},
        {'name': 'Problème', 'color': '#F44336'},
        {'name': 'Note', 'color': '#9C27B0'},
    ]
    
    for cat_data in default_categories:
        LogCategory.objects.get_or_create(
            name=cat_data['name'],
            defaults={'color': cat_data['color']}
        )

def reverse_func(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('logbook', '0003_logcategory_alter_logentry_category'),
    ]

    operations = [
        migrations.RunPython(create_default_categories, reverse_func),
    ]
