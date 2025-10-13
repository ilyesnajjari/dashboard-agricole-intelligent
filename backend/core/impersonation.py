from django.contrib.auth import get_user_model

class ImpersonateMiddleware:
    """If an admin has set request.session['impersonate_id'], replace request.user with that user.

    This allows the frontend to act as the impersonated user while keeping the original user
    available on request.original_user for auditing/UI.
    Only works when the current logged-in user is staff (set via the impersonation endpoint).
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # store the original user (may be AnonymousUser)
        original = getattr(request, 'user', None)
        request.original_user = original
        request.impersonated_user = None
        request.is_impersonating = False

        try:
            imp_id = request.session.get('impersonate_id')
            if imp_id and original and getattr(original, 'is_authenticated', False) and getattr(original, 'is_staff', False):
                User = get_user_model()
                target = User.objects.filter(id=imp_id).first()
                if target:
                    request.impersonated_user = target
                    request.user = target
                    request.is_impersonating = True
        except Exception:
            # be defensive; don't break request processing
            pass

        response = self.get_response(request)
        return response
