# Generated migration to create EmailPreference model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(help_text='Email address for weekly reports', max_length=254)),
                ('weekly_report_enabled', models.BooleanField(default=False, help_text='Enable weekly email reports')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='email_preference', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Email Preference',
                'verbose_name_plural': 'Email Preferences',
            },
        ),
    ]
