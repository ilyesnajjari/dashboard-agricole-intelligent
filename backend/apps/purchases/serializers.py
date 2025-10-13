from rest_framework import serializers
from .models import Purchase


class PurchaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Purchase
        fields = ['id', 'date', 'category', 'description', 'amount', 'notes', 'created_at']
        read_only_fields = ['created_at']
