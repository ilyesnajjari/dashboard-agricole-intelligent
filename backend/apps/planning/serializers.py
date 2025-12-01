from rest_framework import serializers
from .models import CropCalendar

class CropCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropCalendar
        fields = '__all__'
