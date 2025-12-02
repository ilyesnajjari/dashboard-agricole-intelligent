from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.products.views import ProductViewSet
from apps.harvests.views import HarvestViewSet
from apps.sales.views import SaleViewSet, SaleItemViewSet
from apps.purchases.views import PurchaseViewSet, PurchaseItemViewSet, PurchaseCategoryViewSet

from django.http import JsonResponse
from django.db.models import Sum
from apps.sales.models import Sale
from apps.purchases.models import Purchase
from apps.purchases.models import Purchase
from apps.harvests.models import Harvest

from django.contrib.auth import get_user_model
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth import authenticate, login, logout
from django.db.models.functions import TruncMonth
import datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

from apps.coreutils.models import UserSecurity

@csrf_exempt
def signup_view(request):
    try:
        if request.method != 'POST':
            return JsonResponse({'detail': 'method not allowed'}, status=405)
        # Block when already authenticated
        if getattr(request, 'user', None) and request.user.is_authenticated:
            return JsonResponse({'detail': 'already authenticated'}, status=400)
        try:
            data = json.loads(request.body.decode() or '{}')
        except Exception:
            return JsonResponse({'detail': 'invalid json'}, status=400)
        username = (data.get('username') or '').strip()
        password = data.get('password') or ''
        question = (data.get('question') or '').strip()
        answer = (data.get('answer') or '').strip()
        
        if not username or not password or len(password) < 6:
            return JsonResponse({'detail': 'invalid params'}, status=400)
        
        User = get_user_model()
        if User.objects.filter(username=username).exists():
            return JsonResponse({'detail': 'user exists'}, status=400)
        
        u = User(username=username)
        u.set_password(password)
        u.save()
        
        # Save security question if provided
        if question and answer:
            UserSecurity.objects.create(user=u, question=question, answer=answer.lower())
            
        # Explicit backend to avoid ImproperlyConfigured issues
        login(request, u, backend='django.contrib.auth.backends.ModelBackend')
        return JsonResponse({'detail': 'created-and-logged-in'}, status=201)
    except Exception as e:
        # In dev, return error detail to help debugging
        return JsonResponse({'detail': str(e)}, status=500)

@csrf_exempt
def get_security_question(request):
    """Get security question for a username"""
    if request.method != 'POST':
        return JsonResponse({'detail': 'method not allowed'}, status=405)
    try:
        data = json.loads(request.body.decode() or '{}')
        username = data.get('username')
        User = get_user_model()
        try:
            user = User.objects.get(username=username)
            sec = UserSecurity.objects.get(user=user)
            return JsonResponse({'question': sec.question})
        except (User.DoesNotExist, UserSecurity.DoesNotExist):
            # Don't reveal user existence too easily, but for local app it's fine to be explicit or generic
            return JsonResponse({'detail': 'User or security question not found'}, status=404)
    except Exception as e:
        return JsonResponse({'detail': str(e)}, status=500)

@csrf_exempt
def reset_password(request):
    """Verify answer and reset password"""
    if request.method != 'POST':
        return JsonResponse({'detail': 'method not allowed'}, status=405)
    try:
        data = json.loads(request.body.decode() or '{}')
        username = data.get('username')
        answer = (data.get('answer') or '').strip().lower()
        new_password = data.get('new_password')
        
        if not new_password or len(new_password) < 6:
            return JsonResponse({'detail': 'Password too short'}, status=400)

        User = get_user_model()
        user = User.objects.get(username=username)
        sec = UserSecurity.objects.get(user=user)
        
        if sec.answer == answer:
            user.set_password(new_password)
            user.save()
            return JsonResponse({'detail': 'Password reset successful'})
        else:
            return JsonResponse({'detail': 'Incorrect answer'}, status=400)
            
    except (User.DoesNotExist, UserSecurity.DoesNotExist):
        return JsonResponse({'detail': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'detail': str(e)}, status=500)

@csrf_exempt
def login_view(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'method not allowed'}, status=405)
    if getattr(request, 'user', None) and request.user.is_authenticated:
        return JsonResponse({'detail': 'already authenticated'})
    try:
        data = json.loads(request.body.decode() or '{}')
    except Exception:
        return JsonResponse({'detail': 'invalid json'}, status=400)
    username = str(data.get('username') or '').strip()
    password = str(data.get('password') or '')
    if not username or not password:
        return JsonResponse({'detail': 'invalid credentials'}, status=400)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({'detail': 'invalid credentials'}, status=400)
    login(request, user)
    return JsonResponse({'detail': 'ok'})

@csrf_exempt
def logout_view(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'method not allowed'}, status=405)
    logout(request)
    return JsonResponse({'detail': 'ok'})

from apps.payroll.models import WorkLog

@csrf_exempt
def annual_kpi_view(request):
    try:
        year = int(request.GET.get('year') or datetime.date.today().year)
    except Exception:
        year = datetime.date.today().year
    # Prebuild months scaffold
    months_list = [datetime.date(year, i, 1) for i in range(1, 13)]
    months_keys = [m.strftime('%Y-%m') for m in months_list]
    try:
        sales_qs = list(
            Sale.objects.filter(date__year=year)
            .annotate(m=TruncMonth('date'))
            .values('m')
            .annotate(sum_total=Sum('total_amount'))
            .order_by('m')
        )
        purchases_qs = list(
            Purchase.objects.filter(date__year=year)
            .annotate(m=TruncMonth('date'))
            .values('m')
            .annotate(sum_total=Sum('amount'))
            .order_by('m')
        )
        payroll_qs = list(
            WorkLog.objects.filter(date__year=year)
            .annotate(m=TruncMonth('date'))
            .values('m')
            .annotate(sum_total=Sum('total_cost'))
            .order_by('m')
        )
        
        sales_by_month = {}
        for row in sales_qs:
            d = row['m']
            if hasattr(d, 'date'):
                d = d.date()
            sales_by_month[d.strftime('%Y-%m')] = (row['sum_total'] or 0)

        purchases_by_month = {}
        for row in purchases_qs:
            d = row['m']
            if hasattr(d, 'date'):
                d = d.date()
            purchases_by_month[d.strftime('%Y-%m')] = (row['sum_total'] or 0)

        payroll_by_month = {}
        for row in payroll_qs:
            d = row['m']
            if hasattr(d, 'date'):
                d = d.date()
            payroll_by_month[d.strftime('%Y-%m')] = (row['sum_total'] or 0)
            
        monthly_rows = [
            {
                'month': key,
                'revenue': float(sales_by_month.get(key, 0)),
                'expenses': float(purchases_by_month.get(key, 0)) + float(payroll_by_month.get(key, 0)),
                'profit': float(sales_by_month.get(key, 0) - (purchases_by_month.get(key, 0) + payroll_by_month.get(key, 0))),
            }
            for key in months_keys
        ]
        totals_revenue = sum(r['revenue'] for r in monthly_rows)
        totals_expenses = sum(r['expenses'] for r in monthly_rows)
        return JsonResponse({
            'year': year,
            'revenue_total': totals_revenue,
            'expenses_total': totals_expenses,
            'profit_total': totals_revenue - totals_expenses,
            'months': monthly_rows,
        })
    except Exception as e:
        # Return zeros instead of 500 (e.g., tables not yet migrated)
        zero_rows = [
            {'month': key, 'revenue': 0.0, 'expenses': 0.0, 'profit': 0.0}
            for key in months_keys
        ]
        return JsonResponse({
            'year': year,
            'revenue_total': 0.0,
            'expenses_total': 0.0,
            'profit_total': 0.0,
            'months': zero_rows,
            'detail': str(e),
        })

@csrf_exempt
def recent_activity_view(request):
    try:
        # Fetch last 5 of each to ensure we have a good mix
        harvests = Harvest.objects.select_related('product').order_by('-date', '-id')[:5]
        sales = Sale.objects.select_related('market').order_by('-date', '-id')[:5]
        purchases = Purchase.objects.order_by('-date', '-id')[:5]
        worklogs = WorkLog.objects.select_related('employee').order_by('-date', '-id')[:5]

        activity = []

        for h in harvests:
            activity.append({
                'type': 'harvest',
                'date': h.date,
                'datetime': datetime.datetime.combine(h.date, datetime.time.min), # For sorting
                'action': 'Récolte',
                'detail': f"{h.product.name} - {h.cultivation_type.replace('_', ' ').capitalize()}",
                'amount': f"{float(h.quantity_kg):.0f} kg",
                'color': 'info.main'
            })
        
        for s in sales:
            market_name = s.market.name if s.market else 'Vente directe'
            qty_info = f" ({s.quantity_kg:.1f} kg)" if s.quantity_kg and s.quantity_kg > 0 else ""
            activity.append({
                'type': 'sale',
                'date': s.date,
                'datetime': datetime.datetime.combine(s.date, datetime.time.min),
                'action': 'Vente',
                'detail': f"{market_name}{qty_info}",
                'amount': f"+ {float(s.total_amount):.2f} €",
                'color': 'success.main'
            })

        for p in purchases:
            # Use category name if available, else description
            cat_name = p.category.name if hasattr(p, 'category') and hasattr(p.category, 'name') else str(p.category)
            # If category is just an ID (int), try to use description
            if isinstance(p.category, int):
                cat_name = p.description or 'Achat'
            
            prod_name = p.description or cat_name or 'Achat'
            
            amount_value = float(p.amount) if p.amount is not None else 0.0
            activity.append({
                'type': 'purchase',
                'date': p.date,
                'datetime': datetime.datetime.combine(p.date, datetime.time.min),
                'action': 'Achat',
                'detail': prod_name,
                'amount': f"- {amount_value:.2f} €",
                'color': 'error.main'
            })

        for w in worklogs:
            activity.append({
                'type': 'worklog',
                'date': w.date,
                'datetime': datetime.datetime.combine(w.date, datetime.time.min),
                'action': 'Salaire',
                'detail': f"{w.employee.name} ({w.hours}h)",
                'amount': f"- {float(w.total_cost):.2f} €",
                'color': 'warning.main'
            })

        # Sort by date desc
        activity.sort(key=lambda x: x['datetime'], reverse=True)
        
        # Take top 10
        final_activity = activity[:10]
        
        # Clean up datetime object before JSON response
        for item in final_activity:
            del item['datetime']

        return JsonResponse({'activity': final_activity})
    except Exception as e:
        return JsonResponse({'detail': str(e)}, status=500)

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
    qs = User.objects.all().order_by('username')[:500]
    users = [
        {
            'id': u.id,
            'username': u.username,
            'email': getattr(u, 'email', ''),
            'is_active': u.is_active,
            'is_staff': u.is_staff,
            'is_superuser': u.is_superuser,
            'last_login': u.last_login.isoformat() if getattr(u, 'last_login', None) else None,
            'date_joined': u.date_joined.isoformat() if getattr(u, 'date_joined', None) else None,
        }
        for u in qs
    ]
    return JsonResponse({'users': users})

from apps.logbook.views import LogEntryViewSet, LogCategoryViewSet
from apps.sales.views import MarketViewSet
from apps.coreutils.views import EmailPreferenceViewSet
from apps.payroll.views import EmployeeViewSet, WorkLogViewSet
from apps.planning.views import CropCalendarViewSet, TreatmentCalendarViewSet
from apps.inventory.views import InventoryCategoryViewSet, InventoryItemViewSet
from apps.tasks.views import DailyTaskViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'harvests', HarvestViewSet, basename='harvest')
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'sale-items', SaleItemViewSet, basename='sale-item')
router.register(r'markets', MarketViewSet, basename='market')
router.register(r'purchase-items', PurchaseItemViewSet, basename='purchase-item')
router.register(r'purchases', PurchaseViewSet, basename='purchase')
router.register(r'purchase-categories', PurchaseCategoryViewSet, basename='purchase-category')
router.register(r'logbook', LogEntryViewSet, basename='logbook')
router.register(r'log-categories', LogCategoryViewSet, basename='log-category')
router.register(r'email-preferences', EmailPreferenceViewSet, basename='email-preference')
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'work-logs', WorkLogViewSet, basename='work-log')
router.register(r'crop-calendars', CropCalendarViewSet, basename='crop-calendar')
router.register(r'treatment-calendars', TreatmentCalendarViewSet, basename='treatment-calendar')
router.register(r'inventory-categories', InventoryCategoryViewSet, basename='inventory-category')
router.register(r'inventory-items', InventoryItemViewSet, basename='inventory-item')
router.register(r'daily-tasks', DailyTaskViewSet, basename='daily-task')

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
    path('login/', login_view),
    path('logout/', logout_view),
    # Public signup (dev/demo)
    path('signup/', signup_view),
    path('auth/get-question/', get_security_question),
    path('auth/reset-password/', reset_password),
    path('impersonate/start/', impersonate_start),
    path('impersonate/stop/', impersonate_stop),
    path('impersonate/users/', impersonate_users),
    path('', include(router.urls)),
    path('', include(router.urls)),
    path('kpi/summary/', lambda request: JsonResponse({
        'revenue': float(Sale.objects.aggregate(s=Sum('total_amount'))['s'] or 0),
        'expenses': float(Purchase.objects.aggregate(s=Sum('amount'))['s'] or 0),
        'profit': float(Sale.objects.aggregate(s=Sum('total_amount'))['s'] or 0) - float(Purchase.objects.aggregate(s=Sum('amount'))['s'] or 0)
    })),

    # Annual KPI for a given year (defaults to current year) with monthly breakdown (robust)
    path('kpi/annual/', annual_kpi_view),
    path('dashboard/recent-activity/', recent_activity_view),
]
