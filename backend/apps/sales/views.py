from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Sum, Avg
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from django_filters.rest_framework import DjangoFilterBackend
import csv
from .models import Sale
from .serializers import SaleSerializer


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related('product').all()
    serializer_class = SaleSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'product': ['exact'],
        'date': ['exact', 'gte', 'lte'],
        'market': ['exact'],
    }

    @action(detail=False, methods=['get'])
    def export(self, request):
        """CSV export agrégé par période (day|week|month)."""
        product = request.query_params.get('product')
        date_gte = request.query_params.get('date__gte')
        date_lte = request.query_params.get('date__lte')
        period = request.query_params.get('period', 'day')  # day|week|month

        qs = self.get_queryset()
        if product:
            qs = qs.filter(product_id=product)
        if date_gte:
            qs = qs.filter(date__gte=date_gte)
        if date_lte:
            qs = qs.filter(date__lte=date_lte)

        if period == 'week':
            trunc = TruncWeek('date')
        elif period == 'month':
            trunc = TruncMonth('date')
        else:
            trunc = TruncDay('date')

        grouped = (
            qs.annotate(period_date=trunc)
              .values('period_date')
              .annotate(
                  sum_qty=Sum('quantity_kg'),
                  avg_price=Avg('unit_price'),
                  sum_total=Sum('total_amount'),
              )
              .order_by('period_date')
        )

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="sales_{period}.csv"'
        writer = csv.writer(response)
        writer.writerow(['date', 'sum_quantity_kg', 'avg_unit_price', 'sum_total_amount'])
        for row in grouped:
            qty = float(row['sum_qty'] or 0)
            avg_price = float(row['avg_price'] or 0)
            total = float(row['sum_total'] or 0)
            writer.writerow([
                row['period_date'].date().isoformat() if hasattr(row['period_date'], 'date') else str(row['period_date']),
                f"{qty:.2f}", f"{avg_price:.3f}", f"{total:.2f}"
            ])
        return response

    @action(detail=False, methods=['get'])
    def export_xlsx(self, request):
        """Excel export agrégé par période. Nécessite openpyxl; sinon 400."""
        try:
            from openpyxl import Workbook  # type: ignore
        except Exception:
            return Response({'detail': 'openpyxl n\'est pas installé. Installez-le pour l\'export Excel.'}, status=400)

        product = request.query_params.get('product')
        date_gte = request.query_params.get('date__gte')
        date_lte = request.query_params.get('date__lte')
        period = request.query_params.get('period', 'day')

        qs = self.get_queryset()
        if product:
            qs = qs.filter(product_id=product)
        if date_gte:
            qs = qs.filter(date__gte=date_gte)
        if date_lte:
            qs = qs.filter(date__lte=date_lte)

        if period == 'week':
            trunc = TruncWeek('date')
        elif period == 'month':
            trunc = TruncMonth('date')
        else:
            trunc = TruncDay('date')

        grouped = (
            qs.annotate(period_date=trunc)
              .values('period_date')
              .annotate(
                  sum_qty=Sum('quantity_kg'),
                  avg_price=Avg('unit_price'),
                  sum_total=Sum('total_amount'),
              )
              .order_by('period_date')
        )

        wb = Workbook()
        ws = wb.active
        ws.title = f"sales_{period}"
        ws.append(['date', 'sum_quantity_kg', 'avg_unit_price', 'sum_total_amount'])
        for row in grouped:
            qty = float(row['sum_qty'] or 0)
            avg_price = float(row['avg_price'] or 0)
            total = float(row['sum_total'] or 0)
            date_val = row['period_date'].date().isoformat() if hasattr(row['period_date'], 'date') else str(row['period_date'])
            ws.append([date_val, qty, avg_price, total])

        from io import BytesIO
        bio = BytesIO()
        wb.save(bio)
        bio.seek(0)

        response = HttpResponse(
            bio.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="sales_{period}.xlsx"'
        return response

    @action(detail=False, methods=['get'])
    def aggregate(self, request):
        """Retourne un JSON agrégé par période: [{date,sum_quantity_kg,avg_unit_price,sum_total_amount}]"""
        product = request.query_params.get('product')
        date_gte = request.query_params.get('date__gte')
        date_lte = request.query_params.get('date__lte')
        period = request.query_params.get('period', 'day')

        qs = self.get_queryset()
        if product:
            qs = qs.filter(product_id=product)
        if date_gte:
            qs = qs.filter(date__gte=date_gte)
        if date_lte:
            qs = qs.filter(date__lte=date_lte)

        if period == 'week':
            trunc = TruncWeek('date')
        elif period == 'month':
            trunc = TruncMonth('date')
        else:
            trunc = TruncDay('date')

        grouped = (
            qs.annotate(period_date=trunc)
              .values('period_date')
              .annotate(
                  sum_qty=Sum('quantity_kg'),
                  avg_price=Avg('unit_price'),
                  sum_total=Sum('total_amount'),
              )
              .order_by('period_date')
        )
        data = []
        for row in grouped:
            d = row['period_date']
            data.append({
                'date': d.date().isoformat() if hasattr(d, 'date') else str(d),
                'sum_quantity_kg': float(row['sum_qty'] or 0),
                'avg_unit_price': float(row['avg_price'] or 0),
                'sum_total_amount': float(row['sum_total'] or 0),
            })
        return Response(data)
