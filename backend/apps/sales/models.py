from django.db import models
from django.contrib.auth.models import User
from apps.products.models import Product


class Market(models.Model):
    """Market or sales channel (e.g., 'Marché de Velleron', 'Vente directe', custom customers)"""
    name = models.CharField(max_length=100, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='markets', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Sale(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sales', null=True, blank=True)
    date = models.DateField()
    # Temporarily keep as CharField for migration
    market_old = models.CharField(max_length=20, null=True, blank=True)
    market = models.ForeignKey(Market, on_delete=models.SET_NULL, related_name='sales', null=True, blank=True)
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def recalculate_total(self):
        # If the instance isn't saved yet, we cannot access the reverse relation
        # (related managers require a primary key). In that case compute a
        # sensible fallback from the sale-level quantity/unit_price if present
        # and return early. This avoids ValueError during create() where Django
        # calls save(force_insert=True) before related items exist.
        if getattr(self, 'pk', None) is None:
            # Only recalculate if we have meaningful quantity/price
            if self.quantity_kg and self.unit_price:
                try:
                    self.total_amount = (self.quantity_kg or 0) * (self.unit_price or 0)
                except Exception:
                    pass
            return

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
            # Fallback: compute from sale-level qty/price if present AND non-zero; otherwise keep existing
            if self.quantity_kg and self.unit_price:
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
