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
        
        # 3. Generate all payslips for current year
        generate_all_payslips()
        
        # 4. Cleanup old
        clean_old_backups(BACKUP_ROOT)
        
        # 5. Update last_backup_at
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

def generate_all_payslips():
    """Generate payslips for all employees for all months of current year"""
    try:
        from apps.payroll.models import Employee, WorkLog
        from django.db.models import Sum
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from reportlab.lib import colors
        from reportlab.platypus import Table, TableStyle
        
        current_year = datetime.datetime.now().year
        desktop_path = os.path.join(os.path.expanduser('~'), 'Desktop')
        
        # Get all employees
        employees = Employee.objects.all()
        
        for employee in employees:
            employee_folder = employee.name.replace(' ', '_')
            
            # Generate payslip for each month (1-12)
            for month in range(1, 13):
                # Check if there are any work logs for this month
                logs = WorkLog.objects.filter(
                    employee=employee,
                    date__year=current_year,
                    date__month=month
                ).order_by('date')
                
                if not logs.exists():
                    continue  # Skip months with no work logs
                
                # Calculate totals
                total_hours = logs.aggregate(Sum('hours'))['hours__sum'] or 0
                total_cost = logs.aggregate(Sum('total_cost'))['total_cost__sum'] or 0
                
                # Create directory
                payslips_dir = os.path.join(desktop_path, 'Backups_Dashboard_Agricole', 'Fiches_de_Paie', str(current_year), employee_folder)
                os.makedirs(payslips_dir, exist_ok=True)
                
                # Create PDF filename
                filename = f"Fiche_Paie_{month:02d}_{current_year}.pdf"
                filepath = os.path.join(payslips_dir, filename)
                
                # Create PDF
                p = canvas.Canvas(filepath, pagesize=A4)
                width, height = A4
                
                # Header
                p.setFont("Helvetica-Bold", 20)
                p.drawString(50, height - 50, "Fiche Récapitulative / Facture")
                
                p.setFont("Helvetica", 12)
                p.drawString(50, height - 80, f"Employé: {employee.name}")
                p.drawString(50, height - 100, f"Période: {month:02d}/{current_year}")
                p.drawString(50, height - 120, f"Date d'émission: {datetime.datetime.now().strftime('%d/%m/%Y')}")
                
                # Table Data
                data = [['Date', 'Heures', 'Taux', 'Total (€)', 'Payé']]
                for log in logs:
                    data.append([
                        log.date.strftime('%d/%m/%Y'),
                        f"{log.hours}h",
                        f"{log.hourly_rate} €/h",
                        f"{log.total_cost} €",
                        "Oui" if log.paid else "Non"
                    ])
                    
                # Add Total Row
                data.append(['', 'Total Heures', 'Total Coût', '', ''])
                data.append(['', f"{total_hours}h", f"{total_cost} €", '', ''])
                
                # Table Style
                table = Table(data, colWidths=[100, 80, 100, 100, 80])
                style = TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ])
                table.setStyle(style)
                
                # Draw Table
                table.wrapOn(p, width, height)
                table.drawOn(p, 50, height - 160 - table._height)
                
                # Footer
                p.setFont("Helvetica-Oblique", 10)
                p.drawString(50, 50, "Ce document est un récapitulatif généré automatiquement.")
                
                p.showPage()
                p.save()
    except Exception as e:
        # Don't fail the whole backup if payslip generation fails
        print(f"Error generating payslips: {e}")
        pass


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
        
        # Keep only the last 1 backup
        if len(items) > 1:
            for folder in items[:-1]:
                shutil.rmtree(folder)
    except Exception:
        pass
