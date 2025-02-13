from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    nickname = models.CharField(max_length=50, unique=True)
    birth = models.CharField(max_length=6)
    birth_end = models.CharField(max_length=1)
    email = models.EmailField(unique=True)
    weight = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    preferred_station = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    monthly_distance = models.IntegerField(default=0)
    average_speed = models.IntegerField(default=0)
    mileage = models.IntegerField(default=0)
    def __str__(self):
        return f"{self.user.username}'s profile"
