from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from .models import Purchase, PurchaseItem, PurchaseCategory
from .serializers import PurchaseSerializer, PurchaseItemSerializer, PurchaseCategorySerializer


class PurchaseCategoryViewSet(viewsets.ModelViewSet):
    queryset = PurchaseCategory.objects.all()
    serializer_class = PurchaseCategorySerializer


class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.all()
    serializer_class = PurchaseSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'date': ['exact', 'gte', 'lte', 'year'],
        'category': ['exact'],
    }


class PurchaseItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseItem.objects.select_related('purchase', 'product').all()
    serializer_class = PurchaseItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'purchase': ['exact'],
        'product': ['exact'],
    }
