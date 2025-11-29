# Generated migration to remove audio field from LogEntry

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('logbook', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='logentry',
            name='audio',
        ),
    ]
