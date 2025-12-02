from django.db import models

class DailyTask(models.Model):
    title = models.CharField(max_length=200, help_text="Description de la tâche")
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['completed', '-created_at']
        verbose_name = "Tâche quotidienne"
        verbose_name_plural = "Tâches quotidiennes"

    def __str__(self):
        status = "✓" if self.completed else "○"
        return f"{status} {self.title}"
