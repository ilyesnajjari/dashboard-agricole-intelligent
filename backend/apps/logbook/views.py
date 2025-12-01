from rest_framework import viewsets, parsers
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import LogEntry, LogCategory
from .serializers import LogEntrySerializer, LogCategorySerializer

@method_decorator(csrf_exempt, name='dispatch')
class LogCategoryViewSet(viewsets.ModelViewSet):
    queryset = LogCategory.objects.all()
    serializer_class = LogCategorySerializer

@method_decorator(csrf_exempt, name='dispatch')
class LogEntryViewSet(viewsets.ModelViewSet):
    queryset = LogEntry.objects.all()
    serializer_class = LogEntrySerializer
    parser_classes = (parsers.MultiPartParser, parsers.FormParser)
