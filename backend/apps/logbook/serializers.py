from rest_framework import serializers
from .models import LogEntry, LogCategory

class LogCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LogCategory
        fields = ['id', 'name', 'color', 'created_at']

class LogEntrySerializer(serializers.ModelSerializer):
    category_details = LogCategorySerializer(source='category', read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=LogCategory.objects.all(),
        source='category',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = LogEntry
        fields = ['id', 'date', 'category', 'category_id', 'category_details', 'content', 'photo', 'tags', 'created_at']
