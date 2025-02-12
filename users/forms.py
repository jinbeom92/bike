# 서버 검증
import re
from django import forms
from .models import Profile
from .utils import verify_otp
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError


# 회원가입 검증
class SignUpForm(forms.ModelForm):
    username = forms.CharField(min_length=4, max_length=20)
    password = forms.CharField(min_length=8, widget=forms.PasswordInput)
    password_confirm = forms.CharField(widget=forms.PasswordInput)
    nickname = forms.CharField(min_length=2, max_length=50)
    birth = forms.CharField(max_length=6)
    birth_end = forms.CharField(max_length=1)
    email = forms.EmailField()

    class Meta:
        model = User
        fields = ("username", "password", "email")

    def clean_username(self):
        username = self.cleaned_data.get("username")
        if not re.match(r"^[a-zA-Z0-9]{4,20}$", username):
            raise forms.ValidationError("아이디는 4~20자의 영문자 또는 숫자여야 합니다")
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError("이미 사용 중인 아이디입니다")
        return username

    def clean_password(self):
        password = self.cleaned_data.get("password")
        if not re.match(
            r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$", password
        ):
            raise forms.ValidationError(
                "비밀번호는 8자 이상이며, 영문, 숫자, 특수문자를 포함해야 합니다"
            )
        return password

    def clean_password_confirm(self):
        password = self.cleaned_data.get("password")
        password_confirm = self.cleaned_data.get("password_confirm")
        if password and password_confirm and password != password_confirm:
            raise forms.ValidationError("비밀번호가 일치하지 않습니다")
        return password_confirm

    def clean_nickname(self):
        nickname = self.cleaned_data.get("nickname")
        if Profile.objects.filter(nickname=nickname).exists():
            raise forms.ValidationError("이미 사용 중인 닉네임입니다")
        return nickname

    def clean_birth(self):
        birth = self.cleaned_data.get("birth")
        if not re.match(r"^\d{6}$", birth):
            raise forms.ValidationError("생년월일은 6자리 숫자여야 합니다")
        return birth

    def clean_birth_end(self):
        birth_end = self.cleaned_data.get("birth_end")
        if not re.match(r"^[1-4]$", birth_end):
            raise forms.ValidationError(
                "주민등록번호 뒷자리 첫 번째 숫자는 1-4 사이여야 합니다"
            )
        return birth_end

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("이미 사용 중인 이메일입니다")
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
            Profile.objects.create(
                user=user,
                nickname=self.cleaned_data.get("nickname"),
                birth=self.cleaned_data.get("birth"),
                birth_end=self.cleaned_data.get("birth_end"),
                email=self.cleaned_data.get("email"),
            )
        return user


# 아이디 찾기 검증
class FindIdForm(forms.Form):
    email = forms.EmailField()
    code = forms.CharField(max_length=6)

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if not User.objects.filter(email=email).exists():
            raise forms.ValidationError("등록되지 않은 이메일입니다")
        return email

    def clean_code(self):
        code = self.cleaned_data.get("code")
        if not code.isdigit() or len(code) != 6:
            raise forms.ValidationError("6자리 숫자로 된 인증번호를 입력해주세요")
        return code

    def clean(self):
        cleaned_data = super().clean()
        email = cleaned_data.get("email")
        code = cleaned_data.get("code")

        if email and code:
            if not verify_otp(email, code):
                raise forms.ValidationError("인증번호가 일치하지 않습니다")

        return cleaned_data


# 비밀번호 찾기 검증
class FindPasswordForm(forms.Form):
    username = forms.CharField(max_length=150)
    email = forms.EmailField()
    verification_code = forms.CharField(required=False)

    def clean(self):
        cleaned_data = super().clean()
        username = cleaned_data.get("username")
        email = cleaned_data.get("email")

        if username and email:
            try:
                user = User.objects.get(username=username, email=email)
            except User.DoesNotExist:
                raise forms.ValidationError("입력한 정보와 일치하는 사용자가 없습니다")

        return cleaned_data


# 비밀번호 재설정 검증
class ResetPasswordForm(forms.Form):
    new_password = forms.CharField(widget=forms.PasswordInput)
    confirm_password = forms.CharField(widget=forms.PasswordInput)

    def clean_new_password(self):
        password = self.cleaned_data.get("new_password")
        try:
            validate_password(password)
        except ValidationError as error:
            raise forms.ValidationError(list(error.messages))
        return password

    def clean(self):
        cleaned_data = super().clean()
        new_password = cleaned_data.get("new_password")
        confirm_password = cleaned_data.get("confirm_password")

        if new_password and confirm_password:
            if new_password != confirm_password:
                raise forms.ValidationError("비밀번호가 일치하지 않습니다.")

        return cleaned_data
