from rest_framework import serializers
from .models import DailyTask

class DailyTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyTask
        fields = '__all__'
