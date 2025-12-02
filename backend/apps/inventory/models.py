from django.db import models

class InventoryCategory(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, help_text="MUI Icon name", default="Inventory")

    class Meta:
        verbose_name = "Catégorie d'inventaire"
        verbose_name_plural = "Catégories d'inventaire"

    def __str__(self):
        return self.name

class InventoryItem(models.Model):
    STATUS_CHOICES = [
        ('available', 'Disponible'),
        ('in_use', 'En utilisation'),
        ('maintenance', 'En maintenance'),
        ('broken', 'Hors service'),
    ]

    name = models.CharField(max_length=200)
    category = models.ForeignKey(InventoryCategory, on_delete=models.CASCADE, related_name='items')
    quantity = models.FloatField(default=0)
    unit = models.CharField(max_length=50, blank=True, null=True) # e.g., "mètres", "pièces", "kg"
    description = models.TextField(blank=True, null=True)
    dimensions = models.CharField(max_length=100, blank=True, null=True) # e.g., "10x20m"
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    
    # Specific fields for tracking
    purchase_date = models.DateField(null=True, blank=True)
    value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Article d'inventaire"
        verbose_name_plural = "Articles d'inventaire"
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"
