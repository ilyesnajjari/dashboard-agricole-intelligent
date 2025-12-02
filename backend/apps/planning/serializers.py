from rest_framework import serializers
from .models import CropCalendar, TreatmentCalendar

class CropCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropCalendar
        fields = '__all__'


class TreatmentCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentCalendar
        fields = '__all__'
