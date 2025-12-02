from django.contrib import admin
from .models import InventoryCategory, InventoryItem

@admin.register(InventoryCategory)
class InventoryCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon')

@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'quantity', 'unit', 'status')
    list_filter = ('category', 'status')
    search_fields = ('name', 'description')
