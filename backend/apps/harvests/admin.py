from django.contrib import admin
from .models import Harvest


@admin.register(Harvest)
class HarvestAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "date", "quantity_kg", "area_m2", "yield_kg_per_m2")
    list_filter = ("product", "date")
    search_fields = ("parcel", "notes")
