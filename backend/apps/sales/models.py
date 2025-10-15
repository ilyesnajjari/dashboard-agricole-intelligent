from django.db import models
from apps.products.models import Product


class Sale(models.Model):
    MARKET_CHOICES = (
        ('velleron', 'Marché de Velleron'),
        ('direct', 'Vente directe'),
        ('other', 'Autre'),
    )

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sales', null=True, blank=True)
    date = models.DateField()
    market = models.CharField(max_length=20, choices=MARKET_CHOICES, default='velleron')
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def recalculate_total(self):
        # If there are itemized lines, prefer their sum
        items = getattr(self, 'items', None)
        if items is not None and items.exists():
            total = 0
            for it in items.all():
                try:
                    total += (it.quantity_kg or 0) * (it.unit_price or 0)
                except Exception:
                    continue
            self.total_amount = total
        else:
            # Fallback: compute from sale-level qty/price if present; otherwise keep existing
            if self.quantity_kg is not None and self.unit_price is not None:
                try:
                    self.total_amount = (self.quantity_kg or 0) * (self.unit_price or 0)
                except Exception:
                    pass

    def save(self, *args, **kwargs):
        # Do not override a manually provided total unless we can compute from items or qty/price
        self.recalculate_total()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.date} - {self.product} - {self.quantity_kg}kg @ {self.unit_price}€"


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sale_items')
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update parent sale total
        try:
            s = self.sale
            s.recalculate_total()
            super(Sale, s).save()
        except Exception:
            pass

    def delete(self, *args, **kwargs):
        sale = self.sale
        super().delete(*args, **kwargs)
        try:
            sale.recalculate_total()
            super(Sale, sale).save()
        except Exception:
            pass
