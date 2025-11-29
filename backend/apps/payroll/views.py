from rest_framework import viewsets
from .models import Employee, WorkLog
from .serializers import EmployeeSerializer, WorkLogSerializer
from django_filters.rest_framework import DjangoFilterBackend

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

class WorkLogViewSet(viewsets.ModelViewSet):
    queryset = WorkLog.objects.all().order_by('-date', '-id')
    serializer_class = WorkLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['employee', 'date']
