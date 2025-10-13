from celery import shared_task
from .services import forecast_sales_next_days


@shared_task
def task_forecast_sales(product_id: int, days: int = 7):
    return forecast_sales_next_days(product_id, days)
