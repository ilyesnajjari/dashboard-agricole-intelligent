# Generated migration to add quantity_kg and unit_price fields to Purchase

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='purchase',
            name='quantity_kg',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Quantité en kg (optionnel)', max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='purchase',
            name='unit_price',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Prix unitaire par kg (optionnel)', max_digits=10, null=True),
        ),
        migrations.AlterField(
            model_name='purchase',
            name='amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
    ]
