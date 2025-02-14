from django.contrib import admin
from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "nickname",
        "birth",
        "email",
        "weight",
        "preferred_station",
        "current_mileage",
        "average_daily_distance",
        "average_speed",
        "most_used_station",
    )
    fieldsets = (
        (
            "기본 정보",
            {
                "fields": (
                    "user",
                    "nickname",
                    "birth",
                    "birth_end",
                    "email",
                    "weight",
                    "preferred_station",
                )
            },
        ),
        (
            "통계 정보",
            {
                "fields": (
                    "current_mileage",
                    "average_daily_distance",
                    "average_speed",
                    "most_used_station",
                )
            },
        ),
        ("날짜 정보", {"fields": ("created_at", "updated_at")}),
    )
    readonly_fields = ("created_at", "updated_at")

    def get_readonly_fields(self, request, obj=None):
        if obj:  # 이미 존재하는 객체를 편집할 때
            return self.readonly_fields + ("user",)
        return self.readonly_fields
