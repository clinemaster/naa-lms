#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from userauths.models import User

# Create superuser
user = User.objects.create_superuser(
    email='admin@example.com',
    username='admin',
    password='admin1234'
)

print("✓ Superuser created successfully!")
print(f"  Email: {user.email}")
print(f"  Username: {user.username}")
print(f"  Is Staff: {user.is_staff}")
print(f"  Is Superuser: {user.is_superuser}")
