from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Sum, Avg
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from django_filters.rest_framework import DjangoFilterBackend
import csv
from .models import Sale, SaleItem, Market
from .serializers import SaleSerializer, SaleItemSerializer, MarketSerializer


class MarketViewSet(viewsets.ModelViewSet):
    queryset = Market.objects.all()
    serializer_class = MarketSerializer

    def perform_create(self, serializer):
        # Associate market with current user if authenticated
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related('product', 'market').all()
    serializer_class = SaleSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'product': ['exact'],
        'date': ['exact', 'gte', 'lte'],
        'market': ['exact'],
    }


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


class SaleItemViewSet(viewsets.ModelViewSet):
    queryset = SaleItem.objects.select_related('sale', 'product').all()
    serializer_class = SaleItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'sale': ['exact'],
        'product': ['exact'],
    }
