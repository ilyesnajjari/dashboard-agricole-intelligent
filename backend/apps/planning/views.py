from rest_framework import viewsets
from .models import CropCalendar
from .serializers import CropCalendarSerializer

class CropCalendarViewSet(viewsets.ModelViewSet):
    queryset = CropCalendar.objects.all()
    serializer_class = CropCalendarSerializer
