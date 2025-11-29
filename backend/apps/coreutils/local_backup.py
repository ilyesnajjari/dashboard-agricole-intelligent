import shutil
import os
import datetime
import sqlite3
import csv
from django.conf import settings

def perform_local_backup():
    # Define paths
    # settings.BASE_DIR is usually 'backend'
    BASE_DIR = settings.BASE_DIR
    DB_PATH = os.path.join(BASE_DIR, 'db.sqlite3')
    
    # Save to Desktop
    # We try to find the user's desktop. In a server env this might be tricky, 
    # but for this local user setup (Mac), expanding ~ works.
    BACKUP_ROOT = os.path.expanduser('~/Desktop/Backups_Dashboard_Agricole')
    
    if not os.path.exists(BACKUP_ROOT):
        try:
            os.makedirs(BACKUP_ROOT)
        except OSError as e:
            return False, f"Impossible de créer le dossier de sauvegarde: {e}"

    if not os.path.exists(DB_PATH):
        return False, f"Base de données introuvable: {DB_PATH}"

    # Create session folder
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    session_dir = os.path.join(BACKUP_ROOT, f"Backup_{timestamp}")
    
    try:
        os.makedirs(session_dir, exist_ok=True)
        
        # 1. Copy SQLite DB
        backup_db_name = f"db_backup_{timestamp}.sqlite3"
        shutil.copy2(DB_PATH, os.path.join(session_dir, backup_db_name))
        
        # 2. Export CSVs
        export_csvs(DB_PATH, session_dir)
        
        # 3. Cleanup old
        clean_old_backups(BACKUP_ROOT)
        
        # 4. Update last_backup_at
        try:
            from apps.coreutils.models import EmailPreference
            from django.utils import timezone
            # Update all enabled preferences or just the first one found
            # Since this is a local single-user app mostly, we update all that have enabled it
            # or just the first one to track the system state.
            EmailPreference.objects.update(last_backup_at=timezone.now())
        except Exception:
            pass

        return True, f"Sauvegarde effectuée dans: {session_dir}"
    except Exception as e:
        return False, str(e)

def export_csvs(db_path, export_dir):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    target_tables = {
        'harvests_harvest': 'Recoltes.csv',
        'sales_sale': 'Ventes.csv',
        'purchases_purchase': 'Achats.csv',
        'logbook_logentry': 'Journal.csv',
        'products_product': 'Produits.csv',
        'sales_market': 'Marches_Clients.csv',
        'purchases_purchasecategory': 'Categories_Achats.csv'
    }

    for table_name, filename in target_tables.items():
        try:
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            if not rows:
                continue
            
            column_names = [description[0] for description in cursor.description]
            csv_path = os.path.join(export_dir, filename)
            
            with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(column_names)
                writer.writerows(rows)
        except Exception:
            pass # Skip errors for individual tables
            
    conn.close()

def clean_old_backups(backup_root):
    try:
        items = []
        for name in os.listdir(backup_root):
            full_path = os.path.join(backup_root, name)
            if os.path.isdir(full_path) and name.startswith('Backup_'):
                items.append(full_path)
        
        items.sort(key=os.path.getmtime)
        
        # Keep last 5
        if len(items) > 5:
            for folder in items[:-5]:
                shutil.rmtree(folder)
    except Exception:
        pass
