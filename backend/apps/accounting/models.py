from django.db import models


class AccountingEntry(models.Model):
    TYPE_CHOICES = (
        ('income', 'Income'),
        ('expense', 'Expense'),
    )
    date = models.DateField()
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    label = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.date} - {self.type} - {self.label}: {self.amount}€"
