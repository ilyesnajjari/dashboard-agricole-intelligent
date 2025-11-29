# Generated manually for data migration

from django.db import migrations


def create_default_markets_and_link(apps, schema_editor):
    """Create default markets and link existing sales"""
    Market = apps.get_model('sales', 'Market')
    Sale = apps.get_model('sales', 'Sale')
    
    # Create default markets
    market_mapping = {
        'velleron': 'Marché de Velleron',
        'direct': 'Vente directe',
        'other': 'Autre',
    }
    
    created_markets = {}
    for key, name in market_mapping.items():
        market, _ = Market.objects.get_or_create(name=name)
        created_markets[key] = market
    
    # Link existing sales to markets based on market_old values
    for sale in Sale.objects.all():
        if sale.market_old and sale.market_old in created_markets:
            sale.market = created_markets[sale.market_old]
            sale.save(update_fields=['market'])


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0003_sale_market_old_market_alter_sale_market'),
    ]

    operations = [
        migrations.RunPython(create_default_markets_and_link, migrations.RunPython.noop),
    ]
