import pandas as pd
import json
import os
import re
import requests
from django.utils import timezone
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from django.utils.timezone import now
from django.shortcuts import render
from django.conf import settings
from typing import Dict, Any, Tuple
from functools import wraps
from functools import lru_cache
from django.core.cache import cache
import logging
from .cache_manager import RidingCacheManager
from .forms import UserInfoEditForm
from .models import RideHistory, MileageHistory
from .utils import (
    calculate_path_distance,
    calculate_mileage_for_station,
    update_daily_mileage,
    calculate_estimated_time,
)
from users.models import Profile
from users.utils import (
    calculate_monthly_distance,
    calculate_average_speed,
    calculate_total_mileage,
    update_most_used_station,
)
from users.utils import (
    generate_otp,
    save_otp_to_cache,
    verify_otp,
    send_user_info_edit_email,
)

logger = logging.getLogger(__name__)

# CSV 파일 경로 설정
BASE_DIR = settings.BASE_DIR
STATIC_DIR = os.path.join(BASE_DIR, "static", "riding", "map")


# 상수 분리
class APIConfig:
    SEOUL_BIKE_API_KEY = "6263764e466b706837364a78796944"
    TMAP_API_KEY = "1FN7HeoGnT9VmN9c4uYEx2M25YoC53b55jK8gInN"
    BASE_URL = "http://openapi.seoul.go.kr:8088"
    CACHE_TIMEOUT = 60


# 맵 대여소
class DataManager:
    CACHE_TIMEOUT = 3600  # 1시간

    @staticmethod
    @lru_cache(maxsize=1)
    def load_static_data(file_name):
        """정적 CSV 파일 로드 (메모리 캐싱)"""
        try:
            file_path = os.path.join(STATIC_DIR, file_name)
            return pd.read_csv(file_path, encoding="utf-8")
        except Exception as e:
            logger.error(f"CSV 파일 로드 실패 ({file_name}): {str(e)}")
            return pd.DataFrame()

    @staticmethod
    def get_bike_data():
        """자전거 데이터 Redis 캐싱"""
        cache_key = "bike_data"
        cached_data = cache.get(cache_key)

        if cached_data:
            return pd.DataFrame(cached_data)

        chunks = [fetch_partial_bike_data(i, i + 999) for i in range(1, 3001, 1000)]
        all_data = sum(chunks, [])

        if all_data:
            df = pd.DataFrame(all_data)
            df = df[
                [
                    "stationName",
                    "rackTotCnt",
                    "parkingBikeTotCnt",
                    "stationLatitude",
                    "stationLongitude",
                    "shared",
                ]
            ]
            df.columns = [
                "대여소명_원본",
                "거치대_총_개수",
                "현재_자전거_개수",
                "위도",
                "경도",
                "거치율",
            ]
            df["대여소번호"] = df["대여소명_원본"].apply(extract_station_number)

            cache.set(cache_key, df.to_dict(), DataManager.CACHE_TIMEOUT)
            return df
        return pd.DataFrame()


def api_error_handler(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except requests.RequestException as e:
            logger.error(f"API 요청 실패: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"예상치 못한 오류: {str(e)}")
            return []

    return wrapper


@api_error_handler
def fetch_partial_bike_data(start, end):
    # 캐시 키 생성
    cache_key = f"bike_data_{start}_{end}"

    # 캐시된 데이터 확인
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data

    # API 요청
    url = f"{APIConfig.BASE_URL}/{APIConfig.SEOUL_BIKE_API_KEY}/json/bikeList/{start}/{end}/"
    response = requests.get(url, timeout=5)
    response.raise_for_status()

    data = response.json()
    result = data.get("rentBikeStatus", {}).get("row", [])

    # 결과 캐싱
    if result:
        cache.set(cache_key, result, APIConfig.CACHE_TIMEOUT)

    return result


# 대여소 이름에서 번호를 추출하는 함수
@lru_cache(maxsize=1000)
def extract_station_number(station_name):
    if not isinstance(station_name, str):
        return ""
    # 컴파일된 정규식 패턴 재사용
    pattern = re.compile(r"(\d+)\.")
    match = pattern.match(station_name)
    return match.group(1) if match else ""


# 맵 뷰
def map_main_view(request):
    try:
        # 데이터 매니저 초기화
        data_mgr = DataManager()

        # 실시간 자전거 데이터 가져오기
        live_bike_df = data_mgr.get_bike_data()

        # 정적 데이터 로드 (메모리 캐싱)
        static_bike_df = data_mgr.load_static_data(
            "processed_bike_station_info_name_updated.csv"
        )
        static_bike_df["대여소번호"] = static_bike_df["대여소명"].apply(
            extract_station_number
        )

        # 데이터 병합
        merged_df = pd.merge(live_bike_df, static_bike_df, on="대여소번호", how="inner")
        merged_df = merged_df[
            ["대여소명", "현재_자전거_개수", "거치율", "위도_x", "경도_x", "자치구"]
        ]
        merged_df.rename(columns={"위도_x": "위도", "경도_x": "경도"}, inplace=True)

        # 부가 데이터 로드 (메모리 캐싱)
        park_df = data_mgr.load_static_data("s-fo-location.csv")
        museum_df = data_mgr.load_static_data("s-pic-location.csv")
        restaurant_df = data_mgr.load_static_data("s-teste-location.csv")

        # JSON 변환
        context = {
            "TMAP_API_KEY": APIConfig.TMAP_API_KEY,
            "bike_locations": merged_df.to_dict(orient="records"),
            "park_locations": park_df[["공원명", "위도", "경도"]].to_dict(
                orient="records"
            ),
            "museum_locations": museum_df[["미술관명", "위도", "경도"]].to_dict(
                orient="records"
            ),
            "restaurant_locations": restaurant_df[["맛집명", "위도", "경도"]].to_dict(
                orient="records"
            ),
        }

        # JSON 인코딩
        for key in context:
            if key != "TMAP_API_KEY":
                context[key] = json.dumps(context[key])

        return render(request, "riding/map_main.html", context)

    except Exception as e:
        logger.error(f"지도 뷰 렌더링 실패: {str(e)}")
        return render(
            request, "error.html", {"message": "데이터 로드 중 오류가 발생했습니다."}
        )


# 경로 클레스
class RouteCalculator:
    CACHE_TIMEOUT = 1800  # 30분
    DEFAULT_SPEED = 12
    API_URL = "https://apis.openapi.sk.com/tmap/routes/pedestrian"

    def __init__(self):
        self.headers = {"appKey": APIConfig.TMAP_API_KEY}

    def get_cache_key(
        self, start_lat: str, start_lng: str, end_lat: str, end_lng: str
    ) -> str:
        return f"route_{start_lat}_{start_lng}_{end_lat}_{end_lng}"

    def get_params(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "version": "1",
            "format": "json",
            "startX": data.get("startLng"),
            "startY": data.get("startLat"),
            "endX": data.get("endLng"),
            "endY": data.get("endLat"),
            "startName": "출발지",
            "endName": "도착지",
        }

    def validate_coordinates(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        required_fields = ["startLat", "startLng", "endLat", "endLng"]

        if not all(data.get(field) for field in required_fields):
            return False, "필수 좌표가 누락되었습니다."

        try:
            for field in required_fields:
                float(data.get(field))
            return True, ""
        except ValueError:
            return False, "잘못된 좌표 형식입니다."

    def calculate_route_from_api(self, params: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(
            self.API_URL, headers=self.headers, params=params, timeout=10
        )
        response.raise_for_status()
        return response.json()


# 경로 함수
@require_http_methods(["POST"])
def calculate_route(request):
    try:
        calculator = RouteCalculator()
        data = request.POST

        # 입력값 검증
        is_valid, error_message = calculator.validate_coordinates(data)
        if not is_valid:
            return JsonResponse(
                {"status": "error", "message": error_message}, status=400
            )

        # 캐시 확인
        cache_key = calculator.get_cache_key(
            data.get("startLat"),
            data.get("startLng"),
            data.get("endLat"),
            data.get("endLng"),
        )
        cached_result = cache.get(cache_key)
        if cached_result:
            return JsonResponse(cached_result)

        # API 요청 및 경로 계산
        params = calculator.get_params(data)
        route_data = calculator.calculate_route_from_api(params)

        if "features" not in route_data:
            return JsonResponse(
                {"status": "error", "message": "경로를 찾을 수 없습니다."}, status=404
            )

        # 거리 및 시간 계산
        distance = calculate_path_distance(route_data["features"])
        user_speed = (
            calculate_average_speed(request.user) or RouteCalculator.DEFAULT_SPEED
        )
        estimated_time = calculate_estimated_time(distance, user_speed)

        # 결과 생성
        result = {
            "status": "success",
            "distance": distance,
            "path": route_data["features"],
            "estimated_time": estimated_time,
        }

        # 결과 캐싱
        cache.set(cache_key, result, RouteCalculator.CACHE_TIMEOUT)

        return JsonResponse(result)

    except requests.RequestException as e:
        logger.error(f"API 요청 실패: {str(e)}")
        return JsonResponse(
            {
                "status": "error",
                "message": "경로 계산 서비스에 일시적인 문제가 있습니다.",
            },
            status=503,
        )
    except Exception as e:
        logger.error(f"경로 계산 중 오류 발생: {str(e)}")
        return JsonResponse(
            {"status": "error", "message": "서버 내부 오류가 발생했습니다."}, status=500
        )


# 사이드바 뷰
@login_required
def user_sidebar_info(request):
    try:
        profile = Profile.objects.get(user=request.user)
    except Profile.DoesNotExist:
        return JsonResponse({"error": "Profile not found"}, status=404)

    monthly_distance = calculate_monthly_distance(request.user)
    average_speed = calculate_average_speed(request.user)
    total_mileage = calculate_total_mileage(request.user)
    most_used_station = update_most_used_station(request.user)

    sidebar_data = {
        "user_name": profile.nickname if profile.nickname else request.user.username,
        "monthly_distance": str(monthly_distance),
        "average_speed": str(average_speed),
        "total_mileage": total_mileage,
        "most_used_station": most_used_station if most_used_station else "미등록",
    }

    print("✅ 사용자 정보 API 응답:", sidebar_data)  # 터미널에서 데이터 출력
    return JsonResponse(sidebar_data)


# 이용 내역 관련 함수
@login_required
def start_ride(request):
    """사용자가 자전거를 이용할 때 호출되는 API (이용 시작 기록)"""
    profile = request.user.profile
    ride = RideHistory.objects.create(
        user=request.user, ride_date=now().date(), ride_start_time=now()
    )
    return JsonResponse(
        {
            "message": "이용 시작 시간이 저장되었습니다.",
            "ride_start_time": ride.ride_start_time,
        }
    )


# 사용자가 자전거 반납할 때 호출되는 API (이용 종료 기록 및 거리, 칼로리 업데이트)
@login_required
def end_ride(request):
    ride = RideHistory.objects.filter(
        user=request.user, ride_end_time__isnull=True
    ).last()  # 마지막 기록 가져오기
    if ride:
        ride.ride_end_time = now()
        ride.usage_time = (
            ride.ride_end_time - ride.ride_start_time
        ).seconds // 60  # 분 단위로 변환
        ride.distance = request.GET.get("distance", 0)  # GET 요청으로 받은 거리 값 (KM)
        ride.calories = request.GET.get("calories", 0)  # GET 요청으로 받은 칼로리 값
        ride.frequent_route = request.GET.get(
            "route", ""
        )  # GET 요청으로 받은 경유지 정보
        ride.save()

        # 프로필 데이터 업데이트 (총 거리, 칼로리, 이용 시간)
        profile = request.user.profile
        profile.total_usage_time += ride.usage_time
        profile.total_distance += float(ride.distance)
        profile.total_calories += int(ride.calories)
        profile.save()

        return JsonResponse(
            {
                "message": "이용 종료 시간이 저장되었습니다.",
                "ride_end_time": ride.ride_end_time,
                "total_usage_time": profile.total_usage_time,
                "total_distance": profile.total_distance,
                "total_calories": profile.total_calories,
            }
        )
    return JsonResponse({"error": "이용 시작 기록이 없습니다."}, status=400)


# 사용자의 이용 내역을 최신순으로 정렬하여 가져오는 API
@login_required
def usage_history(request):
    ride_history = RideHistory.objects.filter(user=request.user).order_by("-ride_date")
    return render(request, "riding/usage_history.html", {"ride_history": ride_history})


# 마일리지 관련 함수
@login_required
def add_mileage(request):
    """사용자의 마일리지 적립 API"""
    profile = request.user.profile

    # GET 파라미터에서 거치율 정보 가져오기
    rental_occupancy = float(request.GET.get("rental_occupancy", 0))
    return_occupancy = float(request.GET.get("return_occupancy", 0))

    # utils의 함수를 사용하여 마일리지 계산
    mileage = calculate_mileage_for_station(rental_occupancy, return_occupancy)

    # 일일 한도 체크
    actual_mileage = update_daily_mileage(request.user, mileage)

    if actual_mileage > 0:
        MileageHistory.objects.create(
            user=request.user,
            transaction_date=timezone.now(),
            transaction_type="적립",
            amount=actual_mileage,
            description="자전거 이용 보상",
        )

        profile.current_mileage += actual_mileage
        profile.save()

    return JsonResponse(
        {
            "message": "마일리지가 적립되었습니다.",
            "mileage_earned": actual_mileage,
            "total_mileage": profile.current_mileage,
        }
    )


# 사용자의 마일리지 사용 API
@login_required
def use_mileage(request):
    profile = request.user.profile
    mileage = int(request.GET.get("mileage", 0))

    if profile.mileage >= mileage:
        MileageHistory.objects.create(
            user=request.user,
            transaction_date=now(),
            transaction_type="사용",
            amount=mileage,
            description="자전거 할인쿠폰 구매",
        )

        profile.mileage -= mileage
        profile.save()

        return JsonResponse(
            {"message": "마일리지가 사용되었습니다.", "total_mileage": profile.mileage}
        )
    return JsonResponse({"error": "마일리지가 부족합니다."}, status=400)


# 사용자의 마일리지 내역을 최신순으로 정렬하여 가져오는 API
@login_required
def mileage_history(request):
    mileage_history = MileageHistory.objects.filter(user=request.user).order_by(
        "-transaction_date"
    )
    return render(
        request, "riding/mileage_history.html", {"mileage_history": mileage_history}
    )


# 모임 생성 저장
@require_http_methods(["POST"])
def save_marker(request):
    try:
        data = json.loads(request.body)
        cache_manager = RidingCacheManager()

        # 시작점 저장
        start_point = data.get("start_point")
        if start_point:
            cache_manager.save_start_point(request.user.id, start_point)

        # 반납소 위치 저장
        end_point = data.get("end_point")
        if end_point:
            cache_manager.save_return_point(request.user.id, end_point)

        return JsonResponse(
            {"status": "success", "message": "위치가 성공적으로 저장되었습니다."}
        )

    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)


# 회원정보 변경 뷰
@login_required
def users_info_edit(request):
    return render(request, "riding/users_info_edit.html")


# 닉네임 중복 확인 뷰
@login_required
def check_nickname(request):
    nickname = request.GET.get("nickname")
    is_available = (
        not Profile.objects.exclude(user=request.user)
        .filter(nickname=nickname)
        .exists()
    )
    return JsonResponse({"available": is_available})


# 이메일 중복 확인 뷰
@login_required
def check_email(request):
    email = request.POST.get("email")
    is_available = (
        not Profile.objects.exclude(user=request.user).filter(email=email).exists()
    )
    return JsonResponse({"available": is_available})


# 인증번호 발송 뷰
@login_required
def send_verification(request):
    email = request.POST.get("email")
    if not email:
        return JsonResponse(
            {"success": False, "message": "이메일이 제공되지 않았습니다."}
        )

    try:
        # OTP 생성 및 캐시 저장
        otp = generate_otp()
        save_otp_to_cache(email, otp)

        # 이메일 발송
        send_user_info_edit_email(email, otp)
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)})


# 인증번호 확인 뷰
@login_required
def verify_code(request):
    email = request.POST.get("email")
    code = request.POST.get("code")

    if verify_otp(email, code):
        return JsonResponse({"success": True})
    return JsonResponse({"success": False})


# 회원정보 변경 완료 뷰
@login_required
def update_profile(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "잘못된 요청 방식입니다."})

    form = UserInfoEditForm(request.POST, instance=request.user.profile)
    if form.is_valid():
        form.save()
        return JsonResponse({"success": True})
    else:
        errors = {field: errors[0] for field, errors in form.errors.items()}
        return JsonResponse({"success": False, "errors": errors})
