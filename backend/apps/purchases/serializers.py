from rest_framework import serializers
from .models import Purchase, PurchaseItem, PurchaseCategory


class PurchaseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseCategory
        fields = '__all__'


class PurchaseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseItem
        fields = ['id', 'product', 'quantity_kg', 'unit_price']


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True, required=False)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Purchase
        fields = ['id', 'date', 'category', 'category_name', 'description', 'amount', 'quantity_kg', 'unit_price', 'notes', 'created_at', 'items']
        read_only_fields = ['created_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        purchase = Purchase.objects.create(**validated_data)
        for item in items_data:
            PurchaseItem.objects.create(purchase=purchase, **item)
        purchase.recalculate_amount()
        purchase.save()
        return purchase

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                PurchaseItem.objects.create(purchase=instance, **item)
            instance.recalculate_amount()
            instance.save()
        return instance
