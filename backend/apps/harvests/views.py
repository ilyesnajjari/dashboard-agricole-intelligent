from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Sum
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from django.db.models import F
import csv
from django_filters.rest_framework import DjangoFilterBackend
from .models import Harvest
from .serializers import HarvestSerializer


class HarvestViewSet(viewsets.ModelViewSet):
    queryset = Harvest.objects.select_related('product').all()
    serializer_class = HarvestSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'product': ['exact'],
        'date': ['exact', 'gte', 'lte'],
        'cultivation_type': ['exact'],
    }

    @action(detail=False, methods=['get'])
    def export(self, request):
        product = request.query_params.get('product')
        date_gte = request.query_params.get('date__gte')
        date_lte = request.query_params.get('date__lte')
        period = request.query_params.get('period', 'day')  # day|week|month
        cultivation = request.query_params.get('cultivation_type')

        qs = self.get_queryset()
        if product:
            qs = qs.filter(product_id=product)
        if date_gte:
            qs = qs.filter(date__gte=date_gte)
        if date_lte:
            qs = qs.filter(date__lte=date_lte)
        if cultivation:
            qs = qs.filter(cultivation_type=cultivation)

        if period == 'week':
            trunc = TruncWeek('date')
        elif period == 'month':
            trunc = TruncMonth('date')
        else:
            trunc = TruncDay('date')

        grouped = (
            qs.annotate(period_date=trunc)
              .values('period_date')
              .annotate(total_qty=Sum('quantity_kg'), total_area=Sum('area_m2'))
              .order_by('period_date')
        )

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="harvests_{period}.csv"'
        writer = csv.writer(response)
        writer.writerow(['date', 'sum_quantity_kg', 'sum_area_m2', 'yield_kg_per_m2'])
        for row in grouped:
            qty = float(row['total_qty'] or 0)
            area = float(row['total_area'] or 0)
            yld = (qty / area) if area > 0 else 0.0
            writer.writerow([
                row['period_date'].date().isoformat() if hasattr(row['period_date'], 'date') else str(row['period_date']),
                f"{qty:.2f}", f"{area:.2f}", f"{yld:.4f}"
            ])
        return response

    @action(detail=False, methods=['get'])
    def export_xlsx(self, request):
        """Excel export agrégé pour récoltes (date, sum_quantity_kg, sum_area_m2, yield)."""
        try:
            from openpyxl import Workbook  # type: ignore
        except Exception:
            return Response({'detail': "openpyxl n'est pas installé. Installez-le pour l'export Excel."}, status=400)

        product = request.query_params.get('product')
        date_gte = request.query_params.get('date__gte')
        date_lte = request.query_params.get('date__lte')
        period = request.query_params.get('period', 'day')
        cultivation = request.query_params.get('cultivation_type')

        qs = self.get_queryset()
        if product:
            qs = qs.filter(product_id=product)
        if date_gte:
            qs = qs.filter(date__gte=date_gte)
        if date_lte:
            qs = qs.filter(date__lte=date_lte)
        if cultivation:
            qs = qs.filter(cultivation_type=cultivation)

        if period == 'week':
            trunc = TruncWeek('date')
        elif period == 'month':
            trunc = TruncMonth('date')
        else:
            trunc = TruncDay('date')

        grouped = (
            qs.annotate(period_date=trunc)
              .values('period_date')
              .annotate(total_qty=Sum('quantity_kg'), total_area=Sum('area_m2'))
              .order_by('period_date')
        )

        wb = Workbook()
        ws = wb.active
        ws.title = f"harvests_{period}"
        ws.append(['date', 'sum_quantity_kg', 'sum_area_m2', 'yield_kg_per_m2'])
        for row in grouped:
            qty = float(row['total_qty'] or 0)
            area = float(row['total_area'] or 0)
            yld = (qty / area) if area > 0 else 0.0
            date_val = row['period_date'].date().isoformat() if hasattr(row['period_date'], 'date') else str(row['period_date'])
            ws.append([date_val, qty, area, yld])

        from io import BytesIO
        bio = BytesIO()
        wb.save(bio)
        bio.seek(0)

        response = HttpResponse(
            bio.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="harvests_{period}.xlsx"'
        return response

    @action(detail=False, methods=['get'])
    def aggregate(self, request):
        """Retourne un JSON agrégé: volume total (kg) et rendement moyen (kg/m2) par période.
        Params: product, date__gte, date__lte, period=day|week|month, cultivation_type (optional)
        """
        product = request.query_params.get('product')
        date_gte = request.query_params.get('date__gte')
        date_lte = request.query_params.get('date__lte')
        period = request.query_params.get('period', 'day')
        cultivation = request.query_params.get('cultivation_type')

        qs = self.get_queryset()
        if product:
            qs = qs.filter(product_id=product)
        if date_gte:
            qs = qs.filter(date__gte=date_gte)
        if date_lte:
            qs = qs.filter(date__lte=date_lte)
        if cultivation:
            qs = qs.filter(cultivation_type=cultivation)

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
                  sum_quantity_kg=Sum('quantity_kg'),
                  sum_area_m2=Sum('area_m2'),
              )
              .order_by('period_date')
        )
        data = []
        for row in grouped:
            qty = float(row['sum_quantity_kg'] or 0)
            area = float(row['sum_area_m2'] or 0)
            avg_yield = (qty / area) if area > 0 else 0.0
            d = row['period_date']
            data.append({
                'date': d.date().isoformat() if hasattr(d, 'date') else str(d),
                'sum_quantity_kg': qty,
                'avg_yield_kg_per_m2': avg_yield,
            })
        return Response(data)
