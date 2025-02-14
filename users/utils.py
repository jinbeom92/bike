# 캐쉬 관리 및 메일 관리
import random
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Avg, Count, Sum, F, Q
from django.utils import timezone
from datetime import timedelta
from riding.models import RideHistory, MileageHistory


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


# 평균 값 계산 함수
def calculate_user_statistics(user):
    # 현재 마일리지 계산
    current_mileage = (
        MileageHistory.objects.filter(user=user).aggregate(
            total=Sum("amount", filter=Q(transaction_type="적립"))
            - Sum("amount", filter=Q(transaction_type="사용"))
        )["total"]
        or 0
    )

    # 평균 일일 주행 거리 계산
    thirty_days_ago = timezone.now().date() - timedelta(days=30)
    avg_daily_distance = (
        RideHistory.objects.filter(user=user, ride_date__gte=thirty_days_ago)
        .values("ride_date")
        .annotate(daily_distance=Sum("distance"))
        .aggregate(avg_distance=Avg("daily_distance"))["avg_distance"]
        or 0
    )

    # 평균 주행 속도 계산
    avg_speed = (
        RideHistory.objects.filter(user=user).aggregate(
            avg_speed=Avg(F("distance") / (F("usage_time") / 60))  # km/h
        )["avg_speed"]
        or 0
    )

    # 가장 자주 이용한 대여소
    most_used_station = (
        RideHistory.objects.filter(user=user)
        .values("frequent_route")
        .annotate(count=Count("frequent_route"))
        .order_by("-count")
        .first()
    )

    return {
        "current_mileage": current_mileage,
        "avg_daily_distance": round(avg_daily_distance, 2),
        "avg_speed": round(avg_speed, 2),
        "most_used_station": (
            most_used_station["frequent_route"] if most_used_station else None
        ),
    }
