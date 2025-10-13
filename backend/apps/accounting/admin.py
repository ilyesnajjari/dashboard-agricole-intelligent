from django.contrib import admin
from .models import AccountingEntry


@admin.register(AccountingEntry)
class AccountingEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "date", "type", "label", "amount")
    list_filter = ("type", "date")
    search_fields = ("label",)
