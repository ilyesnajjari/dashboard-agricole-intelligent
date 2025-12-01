from django.db import models

class LogCategory(models.Model):
    """Custom categories for log entries"""
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default='#1976d2', help_text="Hex color code")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Log Categories'

    def __str__(self):
        return self.name

class LogEntry(models.Model):
    date = models.DateTimeField()
    category = models.ForeignKey(LogCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='entries')

    content = models.TextField(blank=True)
    photo = models.ImageField(upload_to='logbook/photos/', null=True, blank=True)
    tags = models.CharField(max_length=200, blank=True, help_text="Comma separated tags")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.date.strftime('%Y-%m-%d')} - {self.category}"
