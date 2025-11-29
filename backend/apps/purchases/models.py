from django.db import models
from apps.products.models import Product


class PurchaseCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = "Purchase Categories"

    def __str__(self):
        return self.name


class Purchase(models.Model):
    CATEGORY_CHOICES = (
        ('tools', 'Outils'),
        ('inputs', 'Intrants'),
        ('other', 'Autre'),
    )

    date = models.DateField()
    category_text = models.CharField(max_length=20, choices=CATEGORY_CHOICES, null=True, blank=True)
    category = models.ForeignKey(PurchaseCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchases')
    description = models.CharField(max_length=200)
    # Optional: either provide amount directly OR quantity_kg + unit_price
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Quantité en kg (optionnel)")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Prix unitaire par kg (optionnel)")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.date} - {self.category}: {self.amount}€"

    def recalculate_amount(self):
        items = getattr(self, 'items', None)
        if items is not None and items.exists():
            total = 0
            for it in items.all():
                try:
                    total += (it.quantity_kg or 0) * (it.unit_price or 0)
                except Exception:
                    continue
            self.amount = total

    def save(self, *args, **kwargs):
        # Auto-calculate amount from quantity_kg × unit_price if both provided
        if self.quantity_kg is not None and self.unit_price is not None:
            self.amount = self.quantity_kg * self.unit_price
        # If there are items, recompute amount from them (for PurchaseItem-based purchases)
        try:
            if hasattr(self, 'items') and self.items.exists():
                self.recalculate_amount()
        except Exception:
            pass
        super().save(*args, **kwargs)


class PurchaseItem(models.Model):
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='purchase_items')
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        try:
            p = self.purchase
            p.recalculate_amount()
            super(Purchase, p).save()
        except Exception:
            pass

    def delete(self, *args, **kwargs):
        purchase = self.purchase
        super().delete(*args, **kwargs)
        try:
            purchase.recalculate_amount()
            super(Purchase, purchase).save()
        except Exception:
            pass
