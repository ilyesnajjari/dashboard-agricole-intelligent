from rest_framework import serializers
from .models import AccountingEntry


class AccountingEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountingEntry
        fields = ['id', 'date', 'type', 'label', 'amount', 'created_at']
        read_only_fields = ['created_at']
