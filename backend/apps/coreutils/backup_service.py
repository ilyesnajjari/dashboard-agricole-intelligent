import os
import shutil
import csv
from datetime import datetime
from django.conf import settings
from apps.harvests.models import Harvest
from apps.sales.models import Sale
from apps.purchases.models import Purchase
import logging

logger = logging.getLogger(__name__)


def create_weekly_backup():
    """
    Create a weekly backup of the database and export CSV files
    Saves everything in the backups/ folder
    """
    try:
        # Create backups directory if it doesn't exist
        backup_dir = os.path.join(settings.BASE_DIR.parent, 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        # Create a timestamped folder for this backup
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        backup_folder = os.path.join(backup_dir, f'backup_{timestamp}')
        os.makedirs(backup_folder, exist_ok=True)
        
        # 1. Copy the SQLite database
        db_path = os.path.join(settings.BASE_DIR, 'db.sqlite3')
        if os.path.exists(db_path):
            db_backup_path = os.path.join(backup_folder, 'db.sqlite3')
            shutil.copy2(db_path, db_backup_path)
            logger.info(f"Database backed up to {db_backup_path}")

        # 2. Full JSON Dump
        try:
            from django.core.management import call_command
            json_dump_path = os.path.join(backup_folder, f"full_dump_{timestamp}.json")
            with open(json_dump_path, 'w', encoding='utf-8') as f:
                call_command('dumpdata', stdout=f)
            logger.info(f"Full JSON dump created at {json_dump_path}")
        except Exception as e:
            logger.error(f"JSON dump failed: {e}")
        
        # 3. Export Harvests to CSV
        harvests_csv = os.path.join(backup_folder, 'recoltes.csv')
        with open(harvests_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['ID', 'Date', 'Produit', 'Parcelle', 'Type', 'Quantité (kg)', 'Surface (m2)', 'Notes'])
            for h in Harvest.objects.all().select_related('product'):
                writer.writerow([
                    h.id, 
                    h.date, 
                    h.product.name, 
                    h.parcel, 
                    h.cultivation_type, 
                    h.quantity_kg, 
                    h.area_m2, 
                    h.notes
                ])
        logger.info(f"Harvests exported to {harvests_csv}")
        
        # 4. Export Sales to CSV
        sales_csv = os.path.join(backup_folder, 'ventes.csv')
        with open(sales_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['ID', 'Date', 'Produit', 'Marché', 'Quantité (kg)', 'Prix Unitaire', 'Montant Total', 'Notes'])
            for s in Sale.objects.all().select_related('product', 'market'):
                market_name = s.market.name if s.market else ''
                prod_name = s.product.name if s.product else ''
                writer.writerow([
                    s.id, 
                    s.date, 
                    prod_name, 
                    market_name, 
                    s.quantity_kg, 
                    s.unit_price, 
                    s.total_amount, 
                    s.notes
                ])
        logger.info(f"Sales exported to {sales_csv}")
        
        # 5. Export Purchases to CSV
        purchases_csv = os.path.join(backup_folder, 'achats.csv')
        with open(purchases_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['ID', 'Date', 'Catégorie', 'Description', 'Montant', 'Quantité', 'Prix Unitaire', 'Notes'])
            for p in Purchase.objects.all().select_related('category'):
                cat_name = p.category.name if p.category else ''
                writer.writerow([
                    p.id, 
                    p.date, 
                    cat_name, 
                    p.description, 
                    p.amount, 
                    p.quantity_kg, 
                    p.unit_price, 
                    p.notes
                ])
        logger.info(f"Purchases exported to {purchases_csv}")

        # 6. Export Tasks to CSV
        try:
            from apps.tasks.models import DailyTask
            tasks_csv = os.path.join(backup_folder, 'taches_quotidiennes.csv')
            with open(tasks_csv, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['ID', 'Titre', 'Statut', 'Créé le', 'Terminé le'])
                for t in DailyTask.objects.all():
                    writer.writerow([
                        t.id,
                        t.title,
                        'Terminé' if t.completed else 'À faire',
                        t.created_at,
                        t.completed_at
                    ])
        except Exception as e:
            logger.error(f"Tasks export failed: {e}")

        # 7. Export Planning to CSV
        try:
            from apps.planning.models import CropCalendar, TreatmentCalendar
            
            # Crop Calendar
            crop_csv = os.path.join(backup_folder, 'planning_cultural.csv')
            with open(crop_csv, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['ID', 'Culture', 'Mois', 'Action', 'Note'])
                for c in CropCalendar.objects.all():
                    writer.writerow([c.id, c.crop_name, c.month, c.action_type, c.note])
            
            # Treatment Calendar
            treat_csv = os.path.join(backup_folder, 'planning_phyto.csv')
            with open(treat_csv, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['ID', 'Culture', 'Mois', 'Type', 'Produit', 'Dosage', 'Note'])
                for t in TreatmentCalendar.objects.all():
                    writer.writerow([t.id, t.crop_name, t.month, t.treatment_type, t.product_name, t.dosage, t.note])
        except Exception as e:
            logger.error(f"Planning export failed: {e}")
        
        # 8. Create a summary file
        summary_file = os.path.join(backup_folder, 'README.txt')
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write(f"Sauvegarde automatique - Dashboard Agricole\n")
            f.write(f"Date: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n\n")
            f.write(f"Contenu de cette sauvegarde:\n")
            f.write(f"- db.sqlite3: Base de données binaire (SQLite)\n")
            f.write(f"- full_dump.json: Export complet de la base (JSON)\n")
            f.write(f"- *.csv: Exports lisibles (Excel)\n\n")
            f.write(f"Pour restaurer:\n")
            f.write(f"Option 1 (Simple): Remplacer backend/db.sqlite3 par le fichier de ce dossier\n")
            f.write(f"Option 2 (Avancée): Utiliser 'python manage.py loaddata full_dump.json'\n")
        
        logger.info(f"Backup completed successfully in {backup_folder}")
        
        # Clean old backups (keep only last 10)
        cleanup_old_backups(backup_dir, keep=10)
        
        return True, backup_folder
        
    except Exception as e:
        logger.error(f"Backup failed: {str(e)}")
        return False, str(e)


def cleanup_old_backups(backup_dir, keep=10):
    """
    Keep only the most recent backups
    """
    try:
        # Get all backup folders
        backups = []
        for item in os.listdir(backup_dir):
            item_path = os.path.join(backup_dir, item)
            if os.path.isdir(item_path) and item.startswith('backup_'):
                backups.append((item_path, os.path.getctime(item_path)))
        
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x[1], reverse=True)
        
        # Remove old backups
        for backup_path, _ in backups[keep:]:
            shutil.rmtree(backup_path)
            logger.info(f"Removed old backup: {backup_path}")
            
    except Exception as e:
        logger.error(f"Failed to cleanup old backups: {str(e)}")
