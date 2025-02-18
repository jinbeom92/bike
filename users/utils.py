# 캐쉬 관리 및 메일 관리
import random
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Avg, Count, Sum, F
from django.utils import timezone
from riding.models import RideHistory, MileageHistory
from users.models import Profile
from decimal import Decimal


# 인증번호 생성
def generate_otp():
    return str(random.randint(100000, 999999))


# 캐쉬 저장
def save_otp_to_cache(email, otp):
    cache.set(f"otp_{email}", otp, timeout=300)
    print(f"OTP saved for {email}: {otp}")  # 로그 추가
    return otp


# 캐쉬 검증
def verify_otp(email, otp):
    if not email or not otp:
        print(f"이메일 또는 OTP가 없음: 이메일 - {email}, OTP - {otp}")
        return False
    cached_otp = cache.get(f"otp_{email}")
    print(f"캐시된 OTP: {cached_otp}, 입력된 OTP: {otp}")
    if cached_otp and str(cached_otp) == str(otp):
        cache.delete(f"otp_{email}")
        print(f"OTP 검증 성공: 이메일 - {email}")
        return True
    print(f"OTP 검증 실패: 이메일 - {email}")
    return False


# 회원가입 메일
def send_verification_email(email, otp):
    """인증 이메일 발송"""
    subject = "[같이 따릉] 회원가입 인증번호 입니다."
    message = f"회원가입 인증 코드는 {otp} 입니다."
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [email]
    send_mail(subject, message, from_email, recipient_list)


# 아이디 찾기 메일
def send_verification_for_id_email(email, otp):
    subject = "[같이 따릉] 아이디 찾기 인증번호 입니다."
    message = f"찾아 주셔서 감사합니다.\n인증 코드는 {otp} 입니다."
    from_email = "enf3194@naver.com"
    recipient_list = [email]
    send_mail(subject, message, from_email, recipient_list)


# 비밀번호 찾기 메일
def send_verification_for_password_email(email, otp):
    subject = "[같이 따릉] 비밀번호 찾기 인증번호"
    message = f"찾아 주셔서 감사합니다.\n인증 코드는 {otp} 입니다."
    from_email = "enf3194@naver.com"
    recipient_list = [email]
    send_mail(subject, message, from_email, recipient_list)


# 회원정보 변경 메일
def send_user_info_edit_email(email, otp):
    subject = "[같이 따릉] 회원정보 변경"
    message = f"찾아 주셔서 감사합니다.\n인증 코드는 {otp} 입니다."
    from_email = "enf3194@naver.com"
    recipient_list = [email]
    send_mail(subject, message, from_email, recipient_list)


# 이번 달 총 주행 거리 계산
def calculate_monthly_distance(user):
    current_date = timezone.now().date()
    first_day_of_month = current_date.replace(day=1)

    monthly_distance = (
        RideHistory.objects.filter(
            user=user, ride_date__gte=first_day_of_month
        ).aggregate(total_distance=Sum("distance"))["total_distance"]
        or 0
    )

    return round(monthly_distance, 2)

# 평균 주행 속도
def calculate_average_speed(user):
    # 총 이동 거리와 총 이용 시간 가져오기
    total_distance = (
        RideHistory.objects.filter(user=user).aggregate(total_distance=Sum("distance"))[
            "total_distance"
        ]
        or 0
    )

    total_usage_time = (
        RideHistory.objects.filter(user=user).aggregate(total_time=Sum("usage_time"))[
            "total_time"
        ]
        or 0
    )

    # 이용 시간이 0이면 평균 속도는 0으로 설정
    if total_usage_time == 0:
        return 0.00

    # 분 단위를 시간 단위로 변환
    total_time_in_hours = Decimal(total_usage_time) / Decimal(60)

    # 평균 속도 계산
    average_speed = Decimal(total_distance) / total_time_in_hours

    return round(average_speed, 2)  # 소수점 둘째 자리까지 반올림


# 총 마일리지
def calculate_total_mileage(user):
    total_mileage = (
        MileageHistory.objects.filter(user=user).aggregate(total=Sum("amount"))["total"]
        or 0
    )
    return total_mileage


# 주 이용 대여소
def update_most_used_station(user):
    most_used_station = (
        RideHistory.objects.filter(user=user)
        .values("frequent_route")
        .annotate(count=Count("frequent_route"))
        .order_by("-count")
        .first()
    )

    if most_used_station:
        user.profile.most_used_station = most_used_station["frequent_route"]
        user.profile.save()

    return user.profile.most_used_station


# 칼로리 계산
def calculate_calories(user):
    try:
        # 사용자의 프로필 정보에서 체중 가져오기
        profile = Profile.objects.get(user=user)
        weight = profile.weight  # kg 단위
        if not weight:
            return 0  # 체중 정보가 없으면 0 반환

        # METs 값 (평균 시속 12-19km/h 기준)
        METs = 5.8

        # 최근 주행 기록 가져오기
        recent_ride = (
            RideHistory.objects.filter(user=user).order_by("-ride_date").first()
        )
        if not recent_ride or not recent_ride.usage_time:
            return 0  # 주행 기록이 없거나 이용 시간이 없으면 0 반환

        # 시간 계산 (분 단위를 시간 단위로 변환)
        time_in_hours = recent_ride.usage_time / 60

        # 칼로리 계산식: 체중(kg) × METs × 시간 × 1.05
        calories = weight * METs * time_in_hours * 1.05

        return round(calories, 2)  # 소수점 둘째 자리까지 반올림하여 반환
    except Profile.DoesNotExist:
        return 0  # 프로필이 없을 경우 0 반환


# 평균 주행 속도
# def calculate_average_speed(user):
#     avg_speed = (
#         RideHistory.objects.filter(user=user).aggregate(
#             avg_speed=Avg(F("distance") / (F("usage_time") / 60))  # km/h
#         )["avg_speed"]
#         or 0
#     )
#     return round(avg_speed, 2)
