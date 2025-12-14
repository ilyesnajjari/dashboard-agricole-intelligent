from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import EmailPreference
from .serializers import EmailPreferenceSerializer
from .email_service import generate_weekly_report
import csv
import io
from django.core.mail import EmailMessage
from apps.harvests.models import Harvest
from apps.sales.models import Sale
from apps.sales.models import Sale
from apps.purchases.models import Purchase
from .models import FrostSeason
from .models import FrostSeason
from .weather_service import get_current_season_start_year, update_all_cities, calculate_frost_hours
from rest_framework.views import APIView


@method_decorator(csrf_exempt, name='dispatch')
class EmailPreferenceViewSet(viewsets.ModelViewSet):
    serializer_class = EmailPreferenceSerializer
    
    def get_queryset(self):
        # Only return the preference for the current user
        user = self.request.user
        if not user.is_authenticated:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        
        if user:
            return EmailPreference.objects.filter(user=user)
        return EmailPreference.objects.none()
    
    def perform_create(self, serializer):
        # Automatically set the user to the current user
        user = self.request.user
        if not user.is_authenticated:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.filter(is_superuser=True).first() or User.objects.first()
            if not user:
                raise Exception("Aucun utilisateur trouvé pour associer la préférence.")
        serializer.save(user=user)
    
    @action(detail=False, methods=['post'])
    def test_email(self, request):
        """Send a test email to verify configuration"""
        try:
            user = request.user
            if not user.is_authenticated:
                # Fallback for dev: use the first superuser or user
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = User.objects.filter(is_superuser=True).first() or User.objects.first()
                if not user:
                    return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)

            # Get or create email preference for current user
            pref, created = EmailPreference.objects.get_or_create(
                user=user,
                defaults={'email': getattr(user, 'email', '') or request.data.get('email', '')}
            )
            
            # Use email from request if provided, otherwise use stored preference
            email = request.data.get('email', pref.email)
            
            if not email:
                return Response(
                    {'detail': 'Email address is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Send test report
            success = generate_weekly_report(user, email)
            
            if success:
                return Response({'detail': 'Email de test envoyé avec succès'})
            else:
                return Response(
                    {'detail': 'Erreur lors de l\'envoi de l\'email'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            return Response(
                {'detail': f'Erreur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def send_backup(self, request):
        """Send a full backup of data (CSV) via email"""
        try:
            user = request.user
            if not user.is_authenticated:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = User.objects.filter(is_superuser=True).first() or User.objects.first()
            
            email = request.data.get('email')
            if not email and user:
                pref = EmailPreference.objects.filter(user=user).first()
                if pref:
                    email = pref.email
                else:
                    email = getattr(user, 'email', '')

            if not email:
                return Response({'detail': 'Email requis'}, status=status.HTTP_400_BAD_REQUEST)

            # Generate CSVs
            attachments = []

            # 1. Harvests
            buffer = io.StringIO()
            writer = csv.writer(buffer)
            writer.writerow(['ID', 'Date', 'Produit', 'Parcelle', 'Type', 'Quantité (kg)', 'Surface (m2)', 'Notes'])
            for h in Harvest.objects.all().select_related('product'):
                writer.writerow([h.id, h.date, h.product.name, h.parcel, h.cultivation_type, h.quantity_kg, h.area_m2, h.notes])
            attachments.append(('recoltes.csv', buffer.getvalue(), 'text/csv'))

            # 2. Sales
            buffer = io.StringIO()
            writer = csv.writer(buffer)
            writer.writerow(['ID', 'Date', 'Produit', 'Marché', 'Quantité (kg)', 'Prix Unitaire', 'Montant Total', 'Notes'])
            for s in Sale.objects.all().select_related('product', 'market'):
                market_name = s.market.name if s.market else ''
                prod_name = s.product.name if s.product else ''
                writer.writerow([s.id, s.date, prod_name, market_name, s.quantity_kg, s.unit_price, s.total_amount, s.notes])
            attachments.append(('ventes.csv', buffer.getvalue(), 'text/csv'))

            # 3. Purchases
            buffer = io.StringIO()
            writer = csv.writer(buffer)
            writer.writerow(['ID', 'Date', 'Catégorie', 'Description', 'Montant', 'Quantité', 'Prix Unitaire', 'Notes'])
            for p in Purchase.objects.all().select_related('category'):
                cat_name = p.category.name if p.category else ''
                writer.writerow([p.id, p.date, cat_name, p.description, p.amount, p.quantity_kg, p.unit_price, p.notes])
            attachments.append(('achats.csv', buffer.getvalue(), 'text/csv'))

            # Send Email
            email_msg = EmailMessage(
                subject='Sauvegarde complète - Dashboard Agricole',
                body='Veuillez trouver ci-joint la sauvegarde complète de vos données (Récoltes, Ventes, Achats).',
                from_email=None,
                to=[email],
            )
            for filename, content, mimetype in attachments:
                email_msg.attach(filename, content, mimetype)
            
            email_msg.send()

        except Exception as e:
            return Response({'detail': f'Erreur: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def trigger_local_backup(self, request):
        """Trigger an immediate local backup"""
        from .local_backup import perform_local_backup
        success, message = perform_local_backup()
        if success:
            return Response({'detail': message})
        else:
            return Response({'detail': message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FrostHoursView(APIView):
    """
    Returns accumulated frost hours for the current season for all cities.
    """
    def get(self, request):
        season_start = get_current_season_start_year()
        
        # Get data from DB
        data = FrostSeason.objects.filter(season_start_year=season_start)
        
        # If no data or force update requested, trigger an update
        force_update = request.query_params.get('force') == 'true'
        
        if not data.exists() or force_update:
            update_all_cities()
            data = FrostSeason.objects.filter(season_start_year=season_start)
            
        results = {
            item.city: item.frost_hours for item in data
        }
        
        return Response({
            'season': f"{season_start}-{season_start+1}",
            'hours': results
        })

class FrostCalculatorView(APIView):
    """
    Calculates frost hours for a specific city and date range.
    Query params:
    - city: City name (default: Monteux)
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD (optional, defaults to today)
    """
    def get(self, request):
        city = request.query_params.get('city', 'Monteux')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date:
            return Response({'detail': 'start_date is required'}, status=400)
            
        try:
            from datetime import datetime
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = None
            if end_date:
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                
            hours = calculate_frost_hours(city, start, end)
            
            return Response({
                'city': city,
                'start_date': start_date,
                'end_date': end_date or 'today',
                'frost_hours': hours
            })
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)
        except Exception as e:
            return Response({'detail': f'Error: {str(e)}'}, status=500)
