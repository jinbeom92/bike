# 캐쉬 관리 및 메일 관리
import random
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings


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
