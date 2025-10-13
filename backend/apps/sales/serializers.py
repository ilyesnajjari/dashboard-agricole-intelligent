from rest_framework import serializers
from .models import Sale


class SaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = ['id', 'product', 'date', 'market', 'quantity_kg', 'unit_price', 'total_amount', 'notes', 'created_at']
        read_only_fields = ['total_amount', 'created_at']
