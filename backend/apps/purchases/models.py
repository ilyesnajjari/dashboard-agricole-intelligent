from django.db import models


class Purchase(models.Model):
    CATEGORY_CHOICES = (
        ('tools', 'Outils'),
        ('inputs', 'Intrants'),
        ('other', 'Autre'),
    )

    date = models.DateField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.date} - {self.category}: {self.amount}€"
