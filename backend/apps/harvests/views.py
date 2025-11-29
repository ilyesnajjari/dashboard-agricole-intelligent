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
