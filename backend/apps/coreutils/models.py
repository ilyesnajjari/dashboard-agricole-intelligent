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


class FrostSeason(models.Model):
    """Tracks accumulated frost hours (< 7.5°C) for a season (Nov-Mar)"""
    city = models.CharField(max_length=100)
    season_start_year = models.IntegerField(help_text="Year the season started (e.g., 2025 for 2025-2026)")
    frost_hours = models.FloatField(default=0.0, help_text="Accumulated hours < 7.5°C")
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['city', 'season_start_year']
        ordering = ['-season_start_year', 'city']

    def __str__(self):
        return f"{self.city} - Saison {self.season_start_year}-{self.season_start_year+1}: {self.frost_hours}h"
