from django import forms
from users.models import Profile
import re


class UserInfoEditForm(forms.ModelForm):
    nickname = forms.CharField(
        min_length=2,
        max_length=50,
        required=False,  # 선택적 변경 가능하도록 설정
        error_messages={
            "min_length": "닉네임은 2자 이상이어야 합니다.",
            "max_length": "닉네임은 50자 이하여야 합니다.",
        },
    )

    password = forms.CharField(
        widget=forms.PasswordInput,
        required=False,
    )

    password_confirm = forms.CharField(
        widget=forms.PasswordInput,
        required=False,
    )

    email = forms.EmailField(
        required=False,  # 선택적 변경 가능하도록 설정
        error_messages={"invalid": "유효한 이메일 주소를 입력해주세요."},
    )

    class Meta:
        model = Profile
        fields = ["nickname", "email"]

    def clean_nickname(self):
        nickname = self.cleaned_data.get("nickname")
        if not nickname:  # 닉네임이 제공되지 않은 경우
            return self.instance.nickname  # 기존 닉네임 유지

        if not re.match(r"^[가-힣a-zA-Z0-9]{2,50}$", nickname):
            raise forms.ValidationError("닉네임은 한글, 영문, 숫자만 가능합니다.")

        if (
            Profile.objects.exclude(user=self.instance.user)
            .filter(nickname=nickname)
            .exists()
        ):
            raise forms.ValidationError("이미 사용 중인 닉네임입니다.")

        return nickname

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if not email:  # 이메일이 제공되지 않은 경우
            return self.instance.email  # 기존 이메일 유지

        if (
            Profile.objects.exclude(user=self.instance.user)
            .filter(email=email)
            .exists()
        ):
            raise forms.ValidationError("이미 사용 중인 이메일입니다.")
        return email

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        password_confirm = cleaned_data.get("password_confirm")

        if password:  # 비밀번호가 제공된 경우에만 검증
            if not re.match(
                r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$",
                password,
            ):
                raise forms.ValidationError(
                    "비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다."
                )
            if password != password_confirm:
                raise forms.ValidationError(
                    {"password_confirm": "비밀번호가 일치하지 않습니다."}
                )

        return cleaned_data

    def save(self, commit=True):
        profile = super().save(commit=False)

        # 비밀번호가 제공된 경우에만 변경
        if self.cleaned_data.get("password"):
            profile.user.set_password(self.cleaned_data["password"])
            profile.user.save()

        if commit:
            profile.save()

        return profile
