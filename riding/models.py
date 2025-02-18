from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal


# 이용 내역 통계 필드
class RideHistory(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE
    )  # 1:N 관계 (사용자 1명 : 여러 이용 기록)
    ride_date = models.DateField(default=timezone.now)  # 이용 날짜
    ride_start_time = models.DateTimeField(null=True, blank=True)  # 이용 시작 시간
    ride_end_time = models.DateTimeField(null=True, blank=True)  # 이용 종료 시간
    usage_time = models.IntegerField(default=0)  # 이용 시간 (분)
    distance = models.DecimalField(
        max_digits=7, decimal_places=2, default=0.00
    )  # 이동 거리 (KM)
    calories = models.DecimalField(
        max_digits=6, decimal_places=2, default=0.00
    )  # 소모 칼로리 (KCAL)
    frequent_route = models.CharField(max_length=255, null=True, blank=True)  # 경유지

    def save(self, *args, **kwargs):
        """
        저장하기 전에 칼로리를 계산하여 calories 필드에 저장합니다.
        """
        profile = self.user.profile  # Profile 모델에서 사용자 체중 가져오기
        if profile.weight and self.usage_time > 0:
            METs = Decimal("5.8")  # Decimal로 변환된 METs 값
            time_in_hours = Decimal(self.usage_time) / Decimal(
                "60"
            )  # 분을 시간으로 변환
            weight = Decimal(profile.weight)  # 체중을 Decimal로 변환
            self.calories = weight * METs * time_in_hours * Decimal("1.05")
        else:
            self.calories = Decimal(
                "0.00"
            )  # 체중 또는 주행 시간이 없으면 칼로리 0으로 설정

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - {self.ride_date}"


# 마일리지 내역 통계 필드
class MileageHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # 사용자와 1:N 관계
    transaction_date = models.DateTimeField(
        default=timezone.now
    )  # 마일리지 사용 또는 적립 날짜
    transaction_type = models.CharField(
        max_length=10, choices=[("적립", "적립"), ("사용", "사용")]
    )  # 적립 또는 사용 구분
    amount = models.IntegerField()  # 사용한 또는 적립한 마일리지 수량
    description = models.TextField(null=True, blank=True)  # 마일리지 사용 내역 설명

    def __str__(self):
        return f"{self.user.username} - {self.transaction_type} {self.amount} 마일리지"
