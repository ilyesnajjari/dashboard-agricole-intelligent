from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Sale
from apps.accounting.models import AccountingEntry


def _label_for_sale(sale: Sale) -> str:
    parts = ["Vente"]
    if sale.market:
        parts.append(str(sale.market))
    return " - ".join(parts)


@receiver(post_save, sender=Sale)
def create_or_update_accounting_for_sale(sender, instance: Sale, created, **kwargs):
    # One accounting entry per sale (income)
    label = _label_for_sale(instance)
    amount = float(instance.total_amount or 0)
    if amount <= 0:
        # Remove any existing entry if amount is zero
        AccountingEntry.objects.filter(type='income', label=label, date=instance.date).delete()
        return
    entry, _ = AccountingEntry.objects.update_or_create(
        type='income',
        label=label,
        date=instance.date,
        defaults={'amount': amount}
    )


@receiver(post_delete, sender=Sale)
def delete_accounting_for_sale(sender, instance: Sale, **kwargs):
    label = _label_for_sale(instance)
    AccountingEntry.objects.filter(type='income', label=label, date=instance.date).delete()
