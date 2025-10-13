from django.contrib import admin
from .models import Sale


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "date", "market", "quantity_kg", "unit_price", "total_amount")
    list_filter = ("market", "date", "product")
    search_fields = ("notes",)
