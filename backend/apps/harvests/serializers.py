from rest_framework import serializers
from .models import Harvest


class HarvestSerializer(serializers.ModelSerializer):
    yield_kg_per_m2 = serializers.FloatField(read_only=True)

    class Meta:
        model = Harvest
        fields = [
            'id', 'product', 'date', 'parcel', 'cultivation_type', 'quantity_kg', 'area_m2', 'cost_per_m2', 'yield_kg_per_m2', 'notes', 'created_at'
        ]
