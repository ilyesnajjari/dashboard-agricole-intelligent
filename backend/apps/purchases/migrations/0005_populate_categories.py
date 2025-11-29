from django.db import migrations

def populate_categories(apps, schema_editor):
    PurchaseCategory = apps.get_model('purchases', 'PurchaseCategory')
    Purchase = apps.get_model('purchases', 'Purchase')
    
    # Mapping old codes to new names
    mapping = {
        'tools': 'Outils',
        'inputs': 'Intrants',
        'other': 'Autre'
    }
    
    # Create categories
    cat_objs = {}
    for code, name in mapping.items():
        cat, _ = PurchaseCategory.objects.get_or_create(name=name)
        cat_objs[code] = cat
        
    # Update purchases
    for purchase in Purchase.objects.all():
        if purchase.category_text in cat_objs:
            purchase.category = cat_objs[purchase.category_text]
            purchase.save()
        # Handle cases where category_text might be different or empty
        elif purchase.category_text:
             # Create a new category for unknown codes
             cat, _ = PurchaseCategory.objects.get_or_create(name=purchase.category_text)
             purchase.category = cat
             purchase.save()

class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0004_purchasecategory_alter_purchase_category_text_and_more'),
    ]

    operations = [
        migrations.RunPython(populate_categories),
    ]
