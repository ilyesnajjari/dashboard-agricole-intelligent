from django.contrib import admin
from .models import Purchase


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('date', 'description', 'category_text', 'amount')
    list_filter = ('category_text', 'date')
    search_fields = ("description", "notes")
