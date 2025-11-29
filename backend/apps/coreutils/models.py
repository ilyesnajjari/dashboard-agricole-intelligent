from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailPreference(models.Model):
    """Store user email preferences for weekly reports"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='email_preference')
    email = models.EmailField(help_text="Email address for weekly reports", blank=True, null=True)
    weekly_report_enabled = models.BooleanField(default=False, help_text="Enable weekly email reports")
    last_backup_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp of the last successful backup")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Email Preference"
        verbose_name_plural = "Email Preferences"

    def __str__(self):
        return f"{self.user.username} - {self.email} (Enabled: {self.weekly_report_enabled})"


class UserSecurity(models.Model):
    """Store security question and answer for password recovery"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='security')
    question = models.CharField(max_length=255, help_text="Security question (e.g. 'First pet name?')")
    answer = models.CharField(max_length=255, help_text="Security answer (hashed or plain text)")

    def __str__(self):
        return f"Security for {self.user.username}"
