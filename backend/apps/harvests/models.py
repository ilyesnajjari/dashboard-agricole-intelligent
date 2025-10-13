from django.db import models
from apps.products.models import Product


class Harvest(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='harvests')
    date = models.DateField()
    parcel = models.CharField(max_length=100, blank=True)
    CULTIVATION_CHOICES = (
        ('serre', 'Serre'),
        ('plein_champ', 'Plein champ'),
    )
    cultivation_type = models.CharField(max_length=20, choices=CULTIVATION_CHOICES, default='plein_champ')
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    area_m2 = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cost_per_m2 = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    @property
    def yield_kg_per_m2(self):
        try:
            area = float(self.area_m2)
            return float(self.quantity_kg) / area if area > 0 else 0
        except Exception:
            return 0
