from rest_framework import serializers
from .models import EmailPreference


class EmailPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailPreference
        fields = ['id', 'email', 'weekly_report_enabled', 'last_backup_at', 'created_at', 'updated_at']
        read_only_fields = ['last_backup_at', 'created_at', 'updated_at']
