from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Create or update a default superuser 'admin' with password 'admin123' if not exists."

    def handle(self, *args, **options):
        User = get_user_model()
        username = 'admin'
        password = 'admin123'
        email = 'admin@example.com'
        user, created = User.objects.get_or_create(username=username, defaults={
            'email': email,
            'is_staff': True,
            'is_superuser': True,
        })
        if created:
            self.stdout.write(self.style.SUCCESS("Created admin user 'admin'"))
        else:
            self.stdout.write("Admin user exists; ensuring privileges and password...")
        # Ensure flags and password
        user.is_staff = True
        user.is_superuser = True
        user.email = user.email or email
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS("Admin user ready (username: admin, password: admin123)"))
