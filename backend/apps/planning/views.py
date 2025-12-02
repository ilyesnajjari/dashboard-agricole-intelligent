from rest_framework import viewsets
from .models import CropCalendar, TreatmentCalendar
from .serializers import CropCalendarSerializer, TreatmentCalendarSerializer

class CropCalendarViewSet(viewsets.ModelViewSet):
    queryset = CropCalendar.objects.all()
    serializer_class = CropCalendarSerializer


class TreatmentCalendarViewSet(viewsets.ModelViewSet):
    queryset = TreatmentCalendar.objects.all()
    serializer_class = TreatmentCalendarSerializer
