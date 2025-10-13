from django.db import models
from apps.products.models import Product


class Sale(models.Model):
    MARKET_CHOICES = (
        ('velleron', 'Marché de Velleron'),
        ('direct', 'Vente directe'),
        ('other', 'Autre'),
    )

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sales')
    date = models.DateField()
    market = models.CharField(max_length=20, choices=MARKET_CHOICES, default='velleron')
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def save(self, *args, **kwargs):
        try:
            self.total_amount = (self.quantity_kg or 0) * (self.unit_price or 0)
        except Exception:
            pass
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.date} - {self.product} - {self.quantity_kg}kg @ {self.unit_price}€"
