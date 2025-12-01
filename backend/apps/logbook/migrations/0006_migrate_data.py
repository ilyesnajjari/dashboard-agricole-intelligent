from django.db import migrations

def migrate_categories(apps, schema_editor):
    LogEntry = apps.get_model('logbook', 'LogEntry')
    LogCategory = apps.get_model('logbook', 'LogCategory')
    
    mapping = {
        'observation': 'Observation',
        'intervention': 'Intervention',
        'harvest': 'Récolte',
        'problem': 'Problème',
        'note': 'Note'
    }
    
    for entry in LogEntry.objects.all():
        cat_name = mapping.get(entry.category, 'Note')
        try:
            category_obj = LogCategory.objects.get(name=cat_name)
            entry.category_fk = category_obj
            entry.save()
        except LogCategory.DoesNotExist:
            pass

class Migration(migrations.Migration):
    dependencies = [
        ('logbook', '0005_logentry_category_fk'),
    ]

    operations = [
        migrations.RunPython(migrate_categories),
    ]
