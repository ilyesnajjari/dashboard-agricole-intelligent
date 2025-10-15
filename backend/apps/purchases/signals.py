from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Purchase
from apps.accounting.models import AccountingEntry


def _label_for_purchase(purchase: Purchase) -> str:
    parts = ["Achat"]
    if purchase.category:
        parts.append(str(purchase.category))
    if purchase.description:
        parts.append(str(purchase.description))
    return " - ".join(parts)


@receiver(post_save, sender=Purchase)
def create_or_update_accounting_for_purchase(sender, instance: Purchase, created, **kwargs):
    amount = float(instance.amount or 0)
    label = _label_for_purchase(instance)
    if amount <= 0:
        AccountingEntry.objects.filter(type='expense', label=label, date=instance.date).delete()
        return
    entry, _ = AccountingEntry.objects.update_or_create(
        type='expense',
        label=label,
        date=instance.date,
        defaults={'amount': amount}
    )


@receiver(post_delete, sender=Purchase)
def delete_accounting_for_purchase(sender, instance: Purchase, **kwargs):
    label = _label_for_purchase(instance)
    AccountingEntry.objects.filter(type='expense', label=label, date=instance.date).delete()
