from django.contrib import admin
from .models import DailyTask

@admin.register(DailyTask)
class DailyTaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'completed', 'created_at', 'completed_at')
    list_filter = ('completed', 'created_at')
    search_fields = ('title',)
    readonly_fields = ('created_at', 'completed_at')
