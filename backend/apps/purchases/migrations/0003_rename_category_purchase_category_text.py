from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0002_add_quantity_price'),
    ]

    operations = [
        migrations.RenameField(
            model_name='purchase',
            old_name='category',
            new_name='category_text',
        ),
    ]
