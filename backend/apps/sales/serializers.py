from rest_framework import serializers
from .models import Sale, SaleItem, Market


class MarketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Market
        fields = ['id', 'name', 'created_at']
        read_only_fields = ['created_at']


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'quantity_kg', 'unit_price']


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, required=False)
    market_name = serializers.CharField(source='market.name', read_only=True, allow_null=True)
    product_name = serializers.CharField(source='product.name', read_only=True, allow_null=True)

    class Meta:
        model = Sale
        fields = ['id', 'product', 'product_name', 'date', 'market', 'market_name', 'quantity_kg', 'unit_price', 'total_amount', 'notes', 'created_at', 'items']
        read_only_fields = ['created_at', 'market_name', 'product_name']

    def create(self, validated_data):
        # Preserve any provided total_amount when there are no itemized lines.
        items_data = validated_data.pop('items', [])
        provided_total = validated_data.get('total_amount', None)
        
        # Fallback: if total_amount was not in validated_data (e.g. if somehow considered read-only or filtered),
        # try to get it from initial_data to ensure we respect the user's input for simple sales.
        if provided_total is None and 'total_amount' in self.initial_data:
            try:
                provided_total = float(self.initial_data['total_amount'])
                validated_data['total_amount'] = provided_total
            except (ValueError, TypeError):
                pass

        sale = Sale.objects.create(**validated_data)
        for item in items_data:
            SaleItem.objects.create(sale=sale, **item)
        
        # Recalculate totals from items if present; otherwise keep provided total if any.
        if items_data:
            sale.recalculate_total()
        elif provided_total is not None:
            # ensure provided_total is stored (avoid accidental overwrite)
            try:
                sale.total_amount = provided_total
            except Exception:
                pass
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
