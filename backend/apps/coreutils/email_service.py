from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.db.models import Sum
from apps.sales.models import Sale
from apps.purchases.models import Purchase
from apps.harvests.models import Harvest
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


def generate_weekly_report(user, email_address):
    """
    Generate and send weekly report email to user
    Returns True if successful, False otherwise
    """
    try:
        # Calculate date range (last 7 days)
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=7)
        
        # Fetch data for the week
        sales = Sale.objects.filter(date__gte=start_date, date__lte=end_date)
        purchases = Purchase.objects.filter(date__gte=start_date, date__lte=end_date)
        harvests = Harvest.objects.filter(date__gte=start_date, date__lte=end_date)
        
        # Calculate totals
        total_sales = sales.aggregate(total=Sum('total_amount'))['total'] or 0
        total_purchases = purchases.aggregate(total=Sum('amount'))['total'] or 0
        total_harvest_kg = harvests.aggregate(total=Sum('quantity_kg'))['total'] or 0
        profit = total_sales - total_purchases
        
        # Prepare context for email template
        context = {
            'user': user,
            'start_date': start_date,
            'end_date': end_date,
            'total_sales': float(total_sales),
            'total_purchases': float(total_purchases),
            'profit': float(profit),
            'total_harvest_kg': float(total_harvest_kg),
            'sales_count': sales.count(),
            'purchases_count': purchases.count(),
            'harvests_count': harvests.count(),
        }
        
        # Generate email content
        subject = f'Rapport Hebdomadaire - {start_date.strftime("%d/%m/%Y")} au {end_date.strftime("%d/%m/%Y")}'
        
        # HTML email body
        html_message = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #2e7d32; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f5f5f5; }}
                .metric {{ background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .metric-title {{ font-size: 14px; color: #666; }}
                .metric-value {{ font-size: 24px; font-weight: bold; color: #2e7d32; }}
                .positive {{ color: #2e7d32; }}
                .negative {{ color: #c62828; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Rapport Hebdomadaire</h1>
                    <p>{start_date.strftime("%d/%m/%Y")} - {end_date.strftime("%d/%m/%Y")}</p>
                </div>
                <div class="content">
                    <h2>Bonjour {user.username},</h2>
                    <p>Voici votre récapitulatif hebdomadaire de l'activité agricole :</p>
                    
                    <div class="metric">
                        <div class="metric-title">💰 Ventes Totales</div>
                        <div class="metric-value">{total_sales:.2f} €</div>
                        <div style="font-size: 12px; color: #666;">{sales.count()} vente(s)</div>
                    </div>
                    
                    <div class="metric">
                        <div class="metric-title">🛒 Achats Totaux</div>
                        <div class="metric-value">{total_purchases:.2f} €</div>
                        <div style="font-size: 12px; color: #666;">{purchases.count()} achat(s)</div>
                    </div>
                    
                    <div class="metric">
                        <div class="metric-title">📈 Bénéfice</div>
                        <div class="metric-value {'positive' if profit >= 0 else 'negative'}">{profit:.2f} €</div>
                    </div>
                    
                    <div class="metric">
                        <div class="metric-title">🌾 Récoltes</div>
                        <div class="metric-value">{total_harvest_kg:.2f} kg</div>
                        <div style="font-size: 12px; color: #666;">{harvests.count()} récolte(s)</div>
                    </div>
                    
                    <p style="margin-top: 20px;">
                        <strong>Budget de la semaine :</strong><br>
                        Recettes : {total_sales:.2f} €<br>
                        Dépenses : {total_purchases:.2f} €<br>
                        <span class="{'positive' if profit >= 0 else 'negative'}">
                            Résultat : {profit:.2f} €
                        </span>
                    </p>
                </div>
                <div class="footer">
                    <p>Ce rapport est envoyé automatiquement chaque dimanche.</p>
                    <p>Dashboard Agricole Intelligent - {datetime.now().year}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        plain_message = f"""
Rapport Hebdomadaire - {start_date.strftime("%d/%m/%Y")} au {end_date.strftime("%d/%m/%Y")}

Bonjour {user.username},

Voici votre récapitulatif hebdomadaire :

💰 Ventes Totales : {total_sales:.2f} € ({sales.count()} vente(s))
🛒 Achats Totaux : {total_purchases:.2f} € ({purchases.count()} achat(s))
📈 Bénéfice : {profit:.2f} €
🌾 Récoltes : {total_harvest_kg:.2f} kg ({harvests.count()} récolte(s))

Budget de la semaine :
- Recettes : {total_sales:.2f} €
- Dépenses : {total_purchases:.2f} €
- Résultat : {profit:.2f} €

---
Ce rapport est envoyé automatiquement chaque dimanche.
Dashboard Agricole Intelligent - {datetime.now().year}
        """
        
        # Generate CSVs (Backup)
        attachments = []
        import csv
        import io
        
        # Harvests CSV
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(['ID', 'Date', 'Produit', 'Parcelle', 'Type', 'Quantité (kg)', 'Surface (m2)', 'Notes'])
        for h in Harvest.objects.all().select_related('product'):
            writer.writerow([h.id, h.date, h.product.name, h.parcel, h.cultivation_type, h.quantity_kg, h.area_m2, h.notes])
        attachments.append(('recoltes.csv', buffer.getvalue(), 'text/csv'))

        # Sales CSV
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(['ID', 'Date', 'Produit', 'Marché', 'Quantité (kg)', 'Prix Unitaire', 'Montant Total', 'Notes'])
        for s in Sale.objects.all().select_related('product', 'market'):
            market_name = s.market.name if s.market else ''
            prod_name = s.product.name if s.product else ''
            writer.writerow([s.id, s.date, prod_name, market_name, s.quantity_kg, s.unit_price, s.total_amount, s.notes])
        attachments.append(('ventes.csv', buffer.getvalue(), 'text/csv'))

        # Purchases CSV
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(['ID', 'Date', 'Catégorie', 'Description', 'Montant', 'Quantité', 'Prix Unitaire', 'Notes'])
        for p in Purchase.objects.all().select_related('category'):
            cat_name = p.category.name if p.category else ''
            writer.writerow([p.id, p.date, cat_name, p.description, p.amount, p.quantity_kg, p.unit_price, p.notes])
        attachments.append(('achats.csv', buffer.getvalue(), 'text/csv'))

        # Send email with attachments
        from django.core.mail import EmailMultiAlternatives
        
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=email_address, # Sender is the recipient
            to=[email_address],
        )
        msg.attach_alternative(html_message, "text/html")
        
        for filename, content, mimetype in attachments:
            msg.attach(filename, content, mimetype)
            
        msg.send()
        
        logger.info(f"Weekly report sent successfully to {email_address} for user {user.username}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send weekly report to {email_address}: {str(e)}")
        return False


def send_all_weekly_reports():
    """
    Send weekly reports to all users who have enabled them
    This function is called by the cron job
    """
    from .models import EmailPreference
    
    preferences = EmailPreference.objects.filter(weekly_report_enabled=True)
    success_count = 0
    fail_count = 0
    
    for pref in preferences:
        try:
            if generate_weekly_report(pref.user, pref.email):
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            logger.error(f"Error sending report to {pref.email}: {str(e)}")
            fail_count += 1
    
    logger.info(f"Weekly reports sent: {success_count} successful, {fail_count} failed")
    return success_count, fail_count
