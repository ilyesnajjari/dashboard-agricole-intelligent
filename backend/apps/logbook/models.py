from django.db import models

class LogEntry(models.Model):
    CATEGORY_CHOICES = (
        ('observation', 'Observation'),
        ('intervention', 'Intervention'),
        ('harvest', 'Récolte'),
        ('problem', 'Problème'),
        ('note', 'Note'),
    )

    date = models.DateTimeField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='note')
    content = models.TextField(blank=True)
    photo = models.ImageField(upload_to='logbook/photos/', null=True, blank=True)
    tags = models.CharField(max_length=200, blank=True, help_text="Comma separated tags")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.date.strftime('%Y-%m-%d')} - {self.category}"
