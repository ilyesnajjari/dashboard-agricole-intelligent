from rest_framework import serializers
from .models import Sale, SaleItem


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'quantity_kg', 'unit_price']


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, required=False)

    class Meta:
        model = Sale
        fields = ['id', 'product', 'date', 'market', 'quantity_kg', 'unit_price', 'total_amount', 'notes', 'created_at', 'items']
        read_only_fields = ['created_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        sale = Sale.objects.create(**validated_data)
        for item in items_data:
            SaleItem.objects.create(sale=sale, **item)
        sale.recalculate_total()
        sale.save()
        return sale

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            # Simple replace strategy: delete existing and recreate
            instance.items.all().delete()
            for item in items_data:
                SaleItem.objects.create(sale=instance, **item)
            instance.recalculate_total()
            instance.save()
        return instance
