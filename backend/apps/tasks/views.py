from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import DailyTask
from .serializers import DailyTaskSerializer

class DailyTaskViewSet(viewsets.ModelViewSet):
    queryset = DailyTask.objects.all()
    serializer_class = DailyTaskSerializer

    @action(detail=True, methods=['patch'])
    def toggle(self, request, pk=None):
        """Toggle task completion status"""
        task = self.get_object()
        task.completed = not task.completed
        task.completed_at = timezone.now() if task.completed else None
        task.save()
        serializer = self.get_serializer(task)
        return Response(serializer.data)
