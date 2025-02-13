from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
import pandas as pd
import json
import os
from django.shortcuts import render
from django.conf import settings
from users.models import Profile

# Tmap API Key 설정
TMAP_API_KEY = "1FN7HeoGnT9VmN9c4uYEx2M25YoC53b55jK8gInN"

# 데이터 파일 경로 설정
BASE_DIR = settings.BASE_DIR
STATIC_DIR = os.path.join(BASE_DIR, "static", "riding", "map")

# CSV 파일 경로
RESTAURANT_CSV_PATH = os.path.join(STATIC_DIR, "s-teste-location.csv")
MUSEUM_CSV_PATH = os.path.join(STATIC_DIR, "s-pic-location.csv")
PARK_CSV_PATH = os.path.join(STATIC_DIR, "s-fo-location.csv")


# 맵 렌더링
@login_required
def map_main_view(request):
    # CSV 파일 읽기
    restaurant_df = pd.read_csv(RESTAURANT_CSV_PATH)
    museum_df = pd.read_csv(MUSEUM_CSV_PATH)
    park_df = pd.read_csv(PARK_CSV_PATH)

    # JSON 변환
    restaurant_locations = restaurant_df[["맛집명", "위도", "경도"]].to_dict(
        orient="records"
    )
    museum_locations = museum_df[["미술관명", "위도", "경도"]].to_dict(orient="records")
    park_locations = park_df[["공원명", "위도", "경도"]].to_dict(orient="records")

    context = {
        "TMAP_API_KEY": TMAP_API_KEY,
        "restaurant_locations": json.dumps(restaurant_locations, ensure_ascii=False),
        "museum_locations": json.dumps(museum_locations, ensure_ascii=False),
        "park_locations": json.dumps(park_locations, ensure_ascii=False),
    }

    return render(request, "riding/map_main.html", context)


@login_required
def user_sidebar_info(request):
    user = request.user

    try:
        profile = Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        return JsonResponse({"error": "Profile not found"}, status=404)

    sidebar_data = {
        "user_name": profile.nickname if profile.nickname else user.username,
        "monthly_distance": 14.50,  # TODO: 실제 데이터로 대체
        "average_speed": 8.00,  # TODO: 실제 데이터로 대체
        "mileage": 800,  # TODO: 실제 데이터로 대체
        "rental_location": (
            profile.preferred_station if profile.preferred_station else "미등록"
        ),
    }

    return JsonResponse(sidebar_data, safe=False)

@login_required  # 로그인된 사용자만 접근 가능
def test_view(request):
    return render(request, "riding/usage_history.html", {"user": request.user})
