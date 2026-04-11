from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('master', '마스터'),
        ('viewer', '일반조회자'),
        ('pending', '승인대기'),
    )
    
    name = models.CharField(max_length=150, blank=True)
    organization = models.CharField(max_length=150, blank=True)
    contact = models.CharField(max_length=50, blank=True)
    is_approved = models.BooleanField(default=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='pending')
    
    def __str__(self):
        return self.username
