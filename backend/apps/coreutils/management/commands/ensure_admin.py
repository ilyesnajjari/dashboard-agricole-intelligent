from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os
import secrets

class Command(BaseCommand):
    help = "Create or update a superuser. Username/password read from env; if no password, generate a strong one."

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get('ADMIN_USERNAME', 'admin')
        password = os.environ.get('ADMIN_PASSWORD')  # may be None
        email = os.environ.get('ADMIN_EMAIL', 'admin@example.com')
        user, created = User.objects.get_or_create(username=username, defaults={
            'email': email,
            'is_staff': True,
            'is_superuser': True,
        })
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created superuser '{username}'"))
        else:
            self.stdout.write("User exists; ensuring privileges and password...")
        # Ensure flags
        user.is_staff = True
        user.is_superuser = True
        user.email = user.email or email
        # Determine password: use env if provided; otherwise generate a strong one on create or when no usable password
        generated = False
        if not password:
            if created or not user.has_usable_password():
                password = secrets.token_urlsafe(16)
                generated = True
        if password:
            user.set_password(password)
        user.save()
        if generated:
            self.stdout.write(self.style.WARNING(f"No ADMIN_PASSWORD provided; generated temporary password for '{username}': {password}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Superuser ready (username: {username})"))
