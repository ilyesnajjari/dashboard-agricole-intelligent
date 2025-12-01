from django.db import models

class CropCalendar(models.Model):
    ACTION_CHOICES = (
        ('plant', 'Plantation (Vert)'),
        ('harvest', 'Récolte (Rouge)'),
        ('care', 'Entretien (Jaune)'),
    )

    MONTH_CHOICES = (
        (1, 'Janvier'), (2, 'Février'), (3, 'Mars'), (4, 'Avril'),
        (5, 'Mai'), (6, 'Juin'), (7, 'Juillet'), (8, 'Août'),
        (9, 'Septembre'), (10, 'Octobre'), (11, 'Novembre'), (12, 'Décembre'),
    )

    crop_name = models.CharField(max_length=100)
    month = models.IntegerField(choices=MONTH_CHOICES)
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES)
    note = models.TextField(blank=True, help_text="Détails spécifiques (ex: Taille, Palissage)")

    class Meta:
        unique_together = ('crop_name', 'month', 'action_type')
        ordering = ['crop_name', 'month']

    def __str__(self):
        return f"{self.crop_name} - {self.get_month_display()} - {self.action_type}"
