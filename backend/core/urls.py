from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health(_request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health),
    path('api/', include('api.urls')),
]
