from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Profile(models.Model):
    # 회원가입 및 회원정보 변경 필드
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    nickname = models.CharField(max_length=50, unique=True)
    birth = models.CharField(max_length=6)
    birth_end = models.CharField(max_length=1)
    email = models.EmailField(unique=True)
    weight = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    preferred_station = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    # 사용자 통계 필드
    current_mileage = models.IntegerField(default=0)  # 현재 보유 마일리지
    average_daily_distance = models.DecimalField(
        max_digits=8, decimal_places=2, default=0.00
    )  # 총 주행 거리 (km)
    average_speed = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00
    )  # 평균 주행 속도 (km/h)
    most_used_station = models.CharField(
        max_length=100, null=True, blank=True
    )  # 가장 자주 이용한 대여소

    def __str__(self):
        return f"{self.user.username}'s profile"
