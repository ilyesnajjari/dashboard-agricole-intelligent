from rest_framework import viewsets, parsers
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import LogEntry, LogCategory
from .serializers import LogEntrySerializer, LogCategorySerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.coreutils.weather_service import calculate_frost_hours

@method_decorator(csrf_exempt, name='dispatch')
class LogCategoryViewSet(viewsets.ModelViewSet):
    queryset = LogCategory.objects.all()
    serializer_class = LogCategorySerializer

@method_decorator(csrf_exempt, name='dispatch')
class LogEntryViewSet(viewsets.ModelViewSet):
    queryset = LogEntry.objects.all()
    serializer_class = LogEntrySerializer
    parser_classes = (parsers.MultiPartParser, parsers.FormParser)

    @action(detail=True, methods=['get'], url_path='frost-hours')
    def get_frost_hours(self, request, pk=None):
        """
        Calculate frost hours since the date of this log entry.
        Useful for 'Plantation' entries.
        """
        entry = self.get_object()
        city = request.query_params.get('city', 'Monteux')
        
        try:
            hours = calculate_frost_hours(city, entry.date)
            return Response({
                'city': city,
                'start_date': entry.date,
                'frost_hours': hours
            })
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)
