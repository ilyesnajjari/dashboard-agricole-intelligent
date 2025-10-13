from django.contrib import admin
from .models import Purchase


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ("id", "date", "category", "description", "amount")
    list_filter = ("category", "date")
    search_fields = ("description", "notes")
