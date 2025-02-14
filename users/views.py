# 서버 뷰
import logging
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
import json
from .models import Profile
from .forms import (
    SignUpForm,
    FindPasswordForm,
    FindIdForm,
    ResetPasswordForm,
)
from .utils import (
    generate_otp,
    save_otp_to_cache,
    verify_otp,
    send_verification_email,
    send_verification_for_id_email,
    send_verification_for_password_email,
)
from smtplib import SMTPException


# 로깅 설정
logger = logging.getLogger(__name__)


# 기본 페이지 뷰
def splash_view(request):
    return render(request, "users/splash.html")


# 로그인 리스폰스
@ensure_csrf_cookie
def login_view(request):
    logger.info(f"Request method: {request.method}")
    logger.info(f"CSRF token in cookie: {request.COOKIES.get('csrftoken')}")
    logger.info(f"CSRF token in POST data: {request.POST.get('csrfmiddlewaretoken')}")
    logger.info(f"CSRF token in headers: {request.META.get('HTTP_X_CSRFTOKEN')}")
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({"success": True, "redirect": "/riding/map_main/"})
        else:
            logger.warning(f"Failed login attempt for username: {username}")
            return JsonResponse({"success": False})
    return render(request, "users/login.html")


# 회원가입 폼 확인
@require_http_methods(["GET", "POST"])
def signup_view(request):
    if request.method == "POST":
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            logger.info(f"New user registered: {user.username}")
            return JsonResponse({"success": True})
        else:
            logger.warning(f"Invalid signup form submission: {form.errors}")
            return JsonResponse({"success": False, "errors": form.errors})
    else:
        form = SignUpForm()
    return render(request, "users/signup.html", {"form": form})


# 아이디 확인
@require_http_methods(["POST"])
def check_username(request):
    data = json.loads(request.body)
    username = data.get("username")
    is_taken = User.objects.filter(username=username).exists()
    logger.info(
        f"Username availability check: {username} - {'taken' if is_taken else 'available'}"
    )
    return JsonResponse({"available": not is_taken})


# 닉네임 확인
@require_http_methods(["POST"])
def check_nickname(request):
    data = json.loads(request.body)
    nickname = data.get("nickname")
    is_taken = Profile.objects.filter(nickname=nickname).exists()
    logger.info(
        f"Nickname availability check: {nickname} - {'taken' if is_taken else 'available'}"
    )
    return JsonResponse({"available": not is_taken})


# 이메일 확인
@require_http_methods(["POST"])
def check_email(request):
    data = json.loads(request.body)
    email = data.get("email")
    is_taken = User.objects.filter(email=email).exists()
    logger.info(
        f"Email availability check: {email} - {'taken' if is_taken else 'available'}"
    )
    return JsonResponse({"available": not is_taken})


# 회원가입 인증번호 발송
@require_http_methods(["POST"])
def send_verification(request):
    data = json.loads(request.body)
    email = data.get("email")
    if User.objects.filter(email=email).exists():
        logger.warning(f"Attempt to register with existing email: {email}")
        return JsonResponse({"success": False})

    otp = generate_otp()
    save_otp_to_cache(email, otp)
    try:
        send_verification_email(email, otp)
        logger.info(f"Verification email sent to: {email}")
        return JsonResponse({"success": True})
    except SMTPException as e:
        logger.error(f"Failed to send verification email to {email}: {str(e)}")
        return JsonResponse({"success": False})


# 회원가입 인증번호 확인
@require_http_methods(["POST"])
def verify_code(request):
    data = json.loads(request.body)
    email = data.get("email")
    code = data.get("code")
    if verify_otp(email, code):
        logger.info(f"OTP verification successful for email: {email}")
        return JsonResponse({"valid": True})
    else:
        logger.warning(f"OTP verification failed for email: {email}")
        return JsonResponse({"valid": False})


# 아이디 찾기 페이지 뷰
def find_id_view(request):
    return render(request, "users/find_id.html")


# 아이디 찾기 인증번호 발송
@require_http_methods(["POST"])
def send_verification_for_id(request):
    try:
        data = json.loads(request.body)
        email = data.get("email")

        if not email:
            logger.warning("Attempt to find ID without providing email")
            return JsonResponse({"exists": False})

        if not User.objects.filter(email=email).exists():
            logger.info(f"Attempt to find ID for non-existent email: {email}")
            return JsonResponse({"exists": False})

        otp = generate_otp()
        saved_otp = save_otp_to_cache(email, otp)
        send_verification_for_id_email(email, saved_otp)
        logger.info(f"ID recovery verification email sent to: {email}")

        return JsonResponse({"exists": True})

    except Exception as e:
        logger.error(f"Error in send_verification_for_id: {str(e)}")
        return JsonResponse({"exists": False})


# 아이디 찾기 인증번호 확인
@require_http_methods(["POST"])
def verify_code_find_id(request):
    try:
        data = json.loads(request.body)
        logger.debug(f"Received data for ID verification: {data}")
        form = FindIdForm(data)
        if form.is_valid():
            email = form.cleaned_data["email"]
            user = User.objects.get(email=email)
            logger.info(f"ID found for email: {email}")
            return JsonResponse({"valid": True})
        else:
            logger.warning(
                f"Invalid form submission for ID verification: {form.errors}"
            )
            return JsonResponse({"valid": False, "message": form.errors.as_text()})
    except Exception as e:
        logger.error(f"Error in verify_code_find_id: {str(e)}")
        return JsonResponse({"valid": False})


# 비밀번호 찾기 페이지 뷰
@require_http_methods(["GET", "POST"])
def find_password_view(request):
    if request.method == "POST":
        form = FindPasswordForm(request.POST)
        if form.is_valid():
            user = User.objects.get(
                username=form.cleaned_data["username"], email=form.cleaned_data["email"]
            )
            logger.info(f"Password reset initiated for user: {user.username}")
            return redirect("password_reset_done")
    else:
        form = FindPasswordForm()
    return render(request, "users/find_password.html", {"form": form})


# 비밀번호 찾기 이메일 발송
@require_http_methods(["POST"])
def send_verification_for_password(request):
    data = json.loads(request.body)
    form = FindPasswordForm(data)

    if form.is_valid():
        email = form.cleaned_data["email"]
        code = generate_otp()
        save_otp_to_cache(email, code)
        try:
            send_verification_for_password_email(email, code)
            logger.info(f"Password reset verification email sent to: {email}")
            return JsonResponse({"valid": True})
        except SMTPException as e:
            logger.error(f"Failed to send password reset email to {email}: {str(e)}")
            return JsonResponse({"valid": False})
    else:
        logger.warning(f"Invalid form submission for password reset: {form.errors}")
        return JsonResponse({"valid": False})


# 비밀번호 찾기 인증번호 확인
@require_http_methods(["POST"])
def verify_code_for_password(request):
    data = json.loads(request.body)
    email = data.get("email")
    code = data.get("code")

    if not email or not code:
        logger.warning("Attempt to verify password reset code without email or code")
        return JsonResponse({"valid": False})

    if verify_otp(email, code):
        logger.info(f"Password reset OTP verification successful for email: {email}")
        request.session["reset_password_email"] = email  # 세션에 이메일 저장
        return JsonResponse({"valid": True})
    else:
        logger.warning(f"Password reset OTP verification failed for email: {email}")
        return JsonResponse({"valid": False})


# 비밀번호 변경 뷰
def reset_password_view(request):
    if request.method == "POST":
        form = ResetPasswordForm(request.POST)
        if form.is_valid():
            new_password = form.cleaned_data["new_password"]
            email = request.session.get("reset_password_email")
            if not email:
                return JsonResponse({"success": False})

            try:
                user = User.objects.get(email=email)
                user.set_password(new_password)
                user.save()

                del request.session["reset_password_email"]
                return JsonResponse({"success": True})
            except User.DoesNotExist:
                return JsonResponse({"success": False})
        else:
            errors = form.errors.as_json()
            return JsonResponse({"success": False, "errors": errors})
    else:
        form = ResetPasswordForm()
        return render(request, "users/reset_password.html", {"form": form})

