from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.products.views import ProductViewSet
from apps.harvests.views import HarvestViewSet
from apps.sales.views import SaleViewSet
from apps.purchases.views import PurchaseViewSet
from django.http import JsonResponse
from django.db.models import Sum
from apps.sales.models import Sale
from apps.purchases.models import Purchase
from apps.accounting.views import AccountingEntryViewSet
from apps.ai_module.views import forecast_sales
from apps.ai_module.views import demand_plan
from django.contrib.auth import get_user_model
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth import authenticate, login, logout

@csrf_exempt
@require_POST
@user_passes_test(lambda u: u.is_authenticated and u.is_staff)
def impersonate_start(request):
    """Start impersonation: staff posts JSON {"user_id": <id>} and we set session['impersonate_id']"""
    import json
    try:
        body = json.loads(request.body.decode() or '{}')
        uid = body.get('user_id')
        User = get_user_model()
        if not uid:
            return JsonResponse({'detail': 'user_id required'}, status=400)
        if not User.objects.filter(id=uid).exists():
            return JsonResponse({'detail': 'user not found'}, status=404)
        request.session['impersonate_id'] = int(uid)
        return JsonResponse({'detail': 'impersonation started', 'impersonate_id': uid})
    except Exception as e:
        return JsonResponse({'detail': str(e)}, status=500)


@csrf_exempt
@require_POST
@user_passes_test(lambda u: u.is_authenticated and u.is_staff)
def impersonate_stop(request):
    try:
        request.session.pop('impersonate_id', None)
        return JsonResponse({'detail': 'impersonation stopped'})
    except Exception as e:
        return JsonResponse({'detail': str(e)}, status=500)


@user_passes_test(lambda u: u.is_authenticated and u.is_staff)
def impersonate_users(request):
    """Return a small list of users for staff to choose from."""
    User = get_user_model()
    qs = User.objects.all().order_by('username')[:200]
    users = [{'id': u.id, 'username': u.username, 'is_active': u.is_active} for u in qs]
    return JsonResponse({'users': users})

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'harvests', HarvestViewSet, basename='harvest')
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'accounting', AccountingEntryViewSet, basename='accounting')

urlpatterns = [
    # expose current user info for frontend (session-based auth)
    path('me/', lambda request: JsonResponse({
        'is_authenticated': request.user.is_authenticated,
        'username': request.original_user.username if getattr(request, 'original_user', None) and getattr(request.original_user, 'is_authenticated', False) else (request.user.username if request.user.is_authenticated else None),
        'is_staff': request.original_user.is_staff if getattr(request, 'original_user', None) and getattr(request.original_user, 'is_authenticated', False) else (request.user.is_staff if request.user.is_authenticated else False),
        'is_superuser': request.original_user.is_superuser if getattr(request, 'original_user', None) and getattr(request.original_user, 'is_authenticated', False) else (request.user.is_superuser if request.user.is_authenticated else False),
        'is_impersonating': getattr(request, 'is_impersonating', False),
        'impersonated_username': request.impersonated_user.username if getattr(request, 'impersonated_user', None) else None,
    })),
    path('login/', csrf_exempt(lambda request: (
        (lambda:
            (lambda data: (
                (lambda user: (
                    JsonResponse({'detail': 'ok'}) if (user and (login(request, user) or True)) else JsonResponse({'detail': 'invalid credentials'}, status=400)
                ))(authenticate(request, username=data.get('username'), password=data.get('password')))
            ))(__import__('json').loads(request.body.decode() or '{}'))
        )() if request.method == 'POST' else JsonResponse({'detail': 'method not allowed'}, status=405)
    ))),
    path('logout/', csrf_exempt(lambda request: (
        (lambda: (logout(request), JsonResponse({'detail': 'ok'})[1]) if request.method == 'POST' else JsonResponse({'detail': 'method not allowed'}, status=405))
    )() )),
    path('impersonate/start/', impersonate_start),
    path('impersonate/stop/', impersonate_stop),
    path('impersonate/users/', impersonate_users),
    path('', include(router.urls)),
    path('kpi/summary/', lambda request: JsonResponse({
        'revenue': float(Sale.objects.aggregate(s=Sum('total_amount'))['s'] or 0),
        'expenses': float(Purchase.objects.aggregate(s=Sum('amount'))['s'] or 0),
        'profit': float(Sale.objects.aggregate(s=Sum('total_amount'))['s'] or 0) - float(Purchase.objects.aggregate(s=Sum('amount'))['s'] or 0)
    })),
    path('ai/forecast/', forecast_sales, name='ai-forecast'),
    path('ai/demand-plan/', demand_plan, name='ai-demand-plan'),
]

router.register(r'purchases', PurchaseViewSet, basename='purchase')
