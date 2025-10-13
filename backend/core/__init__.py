try:
	from .celery_app import app as celery_app  # noqa: F401
except Exception:  # Celery may be missing in minimal dev setup
	celery_app = None  # type: ignore
