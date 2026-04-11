import os
import django
import sys

# Set up django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jsyouth_backend.settings')
django.setup()

from accounts.models import CustomUser

user, created = CustomUser.objects.get_or_create(username='master')
if created:
    user.set_password('master1234!')
    print("Master password set to 'master1234!'")
user.role = 'master'
user.name = '최고관리자'
user.is_approved = True
user.is_superuser = True
user.is_staff = True
user.save()

print('Master account ready.')
