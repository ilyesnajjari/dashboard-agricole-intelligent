from django.db import models
from django.utils import timezone

class Employee(models.Model):
    name = models.CharField(max_length=100)
    default_hourly_rate = models.DecimalField(max_digits=6, decimal_places=2, default=10.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class WorkLog(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='work_logs')
    date = models.DateField(default=timezone.now)
    hours = models.DecimalField(max_digits=8, decimal_places=2)
    hourly_rate = models.DecimalField(max_digits=6, decimal_places=2)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    notes = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        self.total_cost = float(self.hours) * float(self.hourly_rate)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee.name} - {self.date} ({self.hours}h)"
