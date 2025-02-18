from django.utils import timezone
from django.db import models
from riding.models import MileageHistory


# 마일리지 계산
def calculate_mileage_for_station(rental_occupancy, return_occupancy):
    rental_mileage = 0
    return_mileage = 0

    # 대여 시 마일리지
    if rental_occupancy >= 130:
        rental_mileage = 200  # 혼잡 지역 대여
    elif 30 < rental_occupancy < 130:
        rental_mileage = 100  # 적정 지역 대여

    # 반납 시 마일리지
    if return_occupancy >= 130:
        return_mileage = 0  # 혼잡 지역 반납
    elif 30 < return_occupancy < 130:
        return_mileage = 100  # 적정 지역 반납
    elif 0 <= return_occupancy <= 30:
        return_mileage = 200  # 거치율 낮은 지역 반납

    return rental_mileage + return_mileage


# 마일리지 한도 체크 업데이트
def update_daily_mileage(user, mileage_amount):
    today = timezone.now().date()
    daily_mileage = (
        MileageHistory.objects.filter(
            user=user, transaction_date__date=today, transaction_type="적립"
        ).aggregate(total=models.Sum("amount"))["total"]
        or 0
    )

    # 일일 한도 400 체크
    if daily_mileage + mileage_amount > 400:
        mileage_amount = max(0, 400 - daily_mileage)

    return mileage_amount


# 경로 거리 계산
def calculate_path_distance(path_data):
    if not path_data:
        return 0.0

    total_distance = 0
    for path in path_data:
        if path.get("geometry", {}).get("type") == "LineString":
            if "properties" in path and "distance" in path["properties"]:
                total_distance += path["properties"]["distance"]

    # 미터를 킬로미터로 변환하고 소수점 첫째 자리까지 표시
    return round(total_distance / 1000, 1)


# 경로 소요 시간 계산
def calculate_estimated_time(distance, average_speed):
    try:
        # 거리(km) / 속도(km/h) * 60분
        estimated_time = (float(distance) / float(average_speed)) * 60
        return round(estimated_time)
    except (ValueError, ZeroDivisionError):
        # 계산 불가능한 경우 기본값 반환
        return 0
