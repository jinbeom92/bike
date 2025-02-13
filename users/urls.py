from django.urls import path
from . import views

app_name = "users"

urlpatterns = [
    # 기본 페이지
    path("", views.splash_view, name="splash"),
    # 로그인 페이지
    path("login/", views.login_view, name="login"),
    # 회원가입 페이지
    path("signup/", views.signup_view, name="signup"),
    # 아이디 찾기 페이지
    path("find_id/", views.find_id_view, name="find_id"),
    # 비밀번호 찾기 페이지
    path("find_password/", views.find_password_view, name="find_password"),
    # 비밀번호 변경 페이지
    path("reset_password/", views.reset_password_view, name="reset_password"),
    # 유효성 검사 URL
    path("check_username/", views.check_username, name="check_username"),
    path("check_nickname/", views.check_nickname, name="check_nickname"),
    path("check_email/", views.check_email, name="check_email"),
    # 이메일 발송 URL
    path("send_verification/", views.send_verification, name="send_verification"),
    path(
        "send_verification_for_id/",
        views.send_verification_for_id,
        name="send_verification_for_id",
    ),
    path(
        "send_verification_for_password/",
        views.send_verification_for_password,
        name="send_verification_for_password",
    ),
    # 인증번호 확인 URL
    path("verify_code_find_id/", views.verify_code_find_id, name="verify_code_find_id"),
    path("verify_code/", views.verify_code, name="verify_code"),
    path(
        "verify_code_for_password/",
        views.verify_code_for_password,
        name="verify_code_for_password",
    ),
]
