from django.contrib import admin
from .models import CropCalendar, TreatmentCalendar

@admin.register(CropCalendar)
class CropCalendarAdmin(admin.ModelAdmin):
    list_display = ('crop_name', 'month', 'action_type', 'note')
    list_filter = ('month', 'action_type')
    search_fields = ('crop_name', 'note')


@admin.register(TreatmentCalendar)
class TreatmentCalendarAdmin(admin.ModelAdmin):
    list_display = ('crop_name', 'month', 'treatment_type', 'product_name', 'dosage')
    list_filter = ('month', 'treatment_type')
    search_fields = ('crop_name', 'product_name', 'note')
