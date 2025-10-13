from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .services import forecast_sales_next_days, demand_plan_for_date


@api_view(['GET'])
def forecast_sales(request):
    try:
        product_id = int(request.query_params.get('product_id'))
    except (TypeError, ValueError):
        return Response({'detail': 'product_id is required as integer'}, status=status.HTTP_400_BAD_REQUEST)
    days = int(request.query_params.get('days', 7))
    result = forecast_sales_next_days(product_id, days)
    return Response({'product_id': product_id, 'days': days, 'forecast': result})


@api_view(['GET'])
def demand_plan(request):
    date_str = request.query_params.get('date')
    if not date_str:
        return Response({'detail': 'date (YYYY-MM-DD) is required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        import datetime as dt
        target = dt.datetime.strptime(date_str, '%Y-%m-%d').date()
    except Exception:
        return Response({'detail': 'Invalid date format, expected YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
    top_n = request.query_params.get('top_n')
    top_n_i = int(top_n) if top_n else None
    result = demand_plan_for_date(target, top_n=top_n_i)
    return Response({'date': date_str, 'items': result})
