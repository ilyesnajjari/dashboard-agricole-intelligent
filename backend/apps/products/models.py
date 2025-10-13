from django.db import models


class Product(models.Model):
    CATEGORY_CHOICES = (
        ('fruit', 'Fruit'),
        ('vegetable', 'Vegetable'),
        ('other', 'Other'),
    )
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    default_unit = models.CharField(max_length=20, default='kg')
    default_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
