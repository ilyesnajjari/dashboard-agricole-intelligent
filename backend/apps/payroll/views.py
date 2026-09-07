from rest_framework import viewsets
from rest_framework.decorators import action
from django.http import HttpResponse
from django.db.models import Sum
from .models import Employee, WorkLog
from .serializers import EmployeeSerializer, WorkLogSerializer
from django_filters.rest_framework import DjangoFilterBackend
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
import datetime
import os
from django.conf import settings

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

    @action(detail=True, methods=['get'])
    def payslip(self, request, pk=None):
        employee = self.get_object()
        
        # Get date range from query params
        today = datetime.date.today()
        try:
            year = int(request.query_params.get('year', today.year))
        except ValueError:
            year = today.year
            
        months_param = request.query_params.get('months')
        if months_param:
            try:
                months = [int(m.strip()) for m in months_param.split(',') if m.strip()]
            except ValueError:
                months = [today.month]
        else:
            try:
                months = [int(request.query_params.get('month', today.month))]
            except ValueError:
                months = [today.month]

        months = sorted(list(set([m for m in months if 1 <= m <= 12])))
        if not months:
            months = [today.month]
            
        # Create payslips directory in project root
        project_root = os.path.dirname(settings.BASE_DIR)
        employee_folder = employee.name.replace(' ', '_')
        payslips_dir = os.path.join(project_root, 'Backups_Dashboard_Agricole', 'Fiches_de_Paie', str(year), employee_folder)
        os.makedirs(payslips_dir, exist_ok=True)
        
        generated_files = []

        for month in months:
            # Filter work logs
            logs = WorkLog.objects.filter(
                employee=employee,
                date__year=year,
                date__month=month
            ).order_by('date')
            
            # Calculate totals
            total_hours = logs.aggregate(Sum('hours'))['hours__sum'] or 0
            total_cost = logs.aggregate(Sum('total_cost'))['total_cost__sum'] or 0
            
            filename = f"Fiche_Paie_{month:02d}_{year}.pdf"
            filepath = os.path.join(payslips_dir, filename)
            
            # Create PDF
            p = canvas.Canvas(filepath, pagesize=A4)
            width, height = A4
            
            # Header
            p.setFont("Helvetica-Bold", 20)
            p.drawString(50, height - 50, "Fiche Récapitulative / Facture")
            
            p.setFont("Helvetica", 12)
            p.drawString(50, height - 80, f"Employé: {employee.name}")
            p.drawString(50, height - 100, f"Période: {month:02d}/{year}")
            p.drawString(50, height - 120, f"Date d'émission: {today.strftime('%d/%m/%Y')}")
            
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
            generated_files.append((filename, filepath))
            
        if len(generated_files) == 1:
            filename, filepath = generated_files[0]
            with open(filepath, 'rb') as pdf:
                response = HttpResponse(pdf.read(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
        else:
            import io
            import zipfile
            buffer = io.BytesIO()
            with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for filename, filepath in generated_files:
                    zip_file.write(filepath, arcname=filename)
            
            zip_filename = f"Fiches_de_Paie_{employee_folder}_{year}.zip"
            response = HttpResponse(buffer.getvalue(), content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
            return response


class WorkLogViewSet(viewsets.ModelViewSet):
    queryset = WorkLog.objects.all().order_by('-date', '-id')
    serializer_class = WorkLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['employee', 'date']
