import shutil
import os
import datetime
import sys
import sqlite3
import csv

# Configuration
# This script is located in backend/scripts/
# We want to backup backend/db.sqlite3 to root/backups/

CURRENT_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_SCRIPT_DIR) # backend/
PROJECT_ROOT = os.path.dirname(BACKEND_DIR) # root/

DB_PATH = os.path.join(BACKEND_DIR, 'db.sqlite3')
# Save to Desktop for easy local access
BACKUP_DIR = os.path.expanduser('~/Desktop/Backups_Dashboard_Agricole')

def export_to_csv(db_path, export_dir):
    """Exports key tables to CSV files for human readability."""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Define tables to export (Business data)
        # Using standard Django naming convention: appname_modelname
        target_tables = {
            'harvests_harvest': 'Recoltes.csv',
            'sales_sale': 'Ventes.csv',
            'purchases_purchase': 'Achats.csv',
            'logbook_logentry': 'Journal.csv',
            'products_product': 'Produits.csv',
            'sales_market': 'Marches_Clients.csv',
            'purchases_purchasecategory': 'Categories_Achats.csv'
        }

        print("Exporting data to CSV...")
        for table_name, filename in target_tables.items():
            try:
                cursor.execute(f"SELECT * FROM {table_name}")
                rows = cursor.fetchall()
                
                if not rows:
                    continue

                # Get column names
                column_names = [description[0] for description in cursor.description]
                
                csv_path = os.path.join(export_dir, filename)
                with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerow(column_names)
                    writer.writerows(rows)
                print(f"  -> Exported {filename}")
            except sqlite3.OperationalError:
                print(f"  -> Table {table_name} not found (skipping)")
                
        conn.close()
    except Exception as e:
        print(f"Error exporting CSVs: {e}")

def backup():
    # Ensure backup directory exists
    if not os.path.exists(BACKUP_DIR):
        try:
            os.makedirs(BACKUP_DIR)
            print(f"Created backup directory: {BACKUP_DIR}")
        except OSError as e:
            print(f"Error creating backup directory {BACKUP_DIR}: {e}")
            return

    # Check if DB exists
    if not os.path.exists(DB_PATH):
        print(f"Database not found at: {DB_PATH}")
        return

    # Create a specific folder for this backup session
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    session_backup_dir = os.path.join(BACKUP_DIR, f"Backup_{timestamp}")
    
    try:
        os.makedirs(session_backup_dir, exist_ok=True)
        
        # 1. Copy SQLite DB (System Backup)
        backup_filename = f"db_backup_{timestamp}.sqlite3"
        backup_path = os.path.join(session_backup_dir, backup_filename)
        shutil.copy2(DB_PATH, backup_path)
        print(f"Database backup successful: {backup_path}")
        
        # 2. Export CSVs (Human Readable)
        export_to_csv(DB_PATH, session_backup_dir)
        
        print(f"Backup session completed in: {session_backup_dir}")
        
        # Clean up old backups (keep last 5 folders)
        clean_old_backups()
    except Exception as e:
        print(f"Error during backup: {e}")

def clean_old_backups():
    try:
        items = []
        for name in os.listdir(BACKUP_DIR):
            full_path = os.path.join(BACKUP_DIR, name)
            # We look for directories starting with Backup_
            if os.path.isdir(full_path) and name.startswith('Backup_'):
                items.append(full_path)
        
        # Sort by modification time (oldest first)
        items.sort(key=os.path.getmtime)
        
        # Keep last 5
        max_backups = 5
        if len(items) > max_backups:
            items_to_delete = items[:-max_backups]
            for folder in items_to_delete:
                shutil.rmtree(folder)
                print(f"Removed old backup folder: {folder}")
    except Exception as e:
        print(f"Error cleaning old backups: {e}")

if __name__ == "__main__":
    print(f"Starting backup process...")
    print(f"Source: {DB_PATH}")
    print(f"Destination Root: {BACKUP_DIR}")
    backup()
