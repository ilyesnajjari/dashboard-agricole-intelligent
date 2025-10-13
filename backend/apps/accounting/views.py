from rest_framework import viewsets
from .models import AccountingEntry
from .serializers import AccountingEntrySerializer


class AccountingEntryViewSet(viewsets.ModelViewSet):
    queryset = AccountingEntry.objects.all()
    serializer_class = AccountingEntrySerializer
