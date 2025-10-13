from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category", "default_unit", "default_price", "is_active")
    search_fields = ("name",)
    list_filter = ("category", "is_active")
