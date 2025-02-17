import pandas as pd
import json
import os
import re
import requests
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils.timezone import now
from django.shortcuts import render
from django.conf import settings
from users.models import Profile
from riding.models import RideHistory, MileageHistory
from .utils import calculate_path_distance
from users.utils import (
    calculate_monthly_distance,
    calculate_average_speed,
    calculate_total_mileage,
    update_most_used_station,
)

# 서울 공공자전거 API 키
API_KEY = "6263764e466b706837364a78796944"

# 티맵 API 키
TMAP_API_KEY = "1FN7HeoGnT9VmN9c4uYEx2M25YoC53b55jK8gInN"

# CSV 파일 경로 설정
BASE_DIR = settings.BASE_DIR
STATIC_DIR = os.path.join(BASE_DIR, "static", "riding", "map")


# 서울 공공자전거 API에서 부분적으로 데이터를 가져오는 함수
def fetch_partial_bike_data(start, end):
    url = f"http://openapi.seoul.go.kr:8088/{API_KEY}/json/bikeList/{start}/{end}/"
    response = requests.get(url)
    if response.status_code != 200:
        print(f"API 요청 실패: {response.status_code}")
        return []
    data = response.json()
    if "rentBikeStatus" in data and "row" in data["rentBikeStatus"]:
        return data["rentBikeStatus"]["row"]
    else:
        print("데이터 없음 또는 API 오류")
        return []


# 대여소 이름에서 번호를 추출하는 함수
def extract_station_number(station_name):
    if not isinstance(station_name, str):
        return ""
    match = re.match(r"(\d+)\.", station_name)
    return match.group(1) if match else ""


# 메인 지도 뷰 함수: 모든 데이터를 처리하고 지도 페이지를 렌더링
def map_main_view(request):
    # 공공자전거 데이터 가져오기
    chunks = [fetch_partial_bike_data(i, i + 999) for i in range(1, 3001, 1000)]
    all_data = sum(chunks, [])

    # 실시간 자전거 데이터를 데이터프레임으로 변환
    if all_data:
        live_bike_df = pd.DataFrame(all_data)
        live_bike_df = live_bike_df[
            [
                "stationName",
                "rackTotCnt",
                "parkingBikeTotCnt",
                "stationLatitude",
                "stationLongitude",
                "shared",
            ]
        ]
        live_bike_df.columns = [
            "대여소명_원본",
            "거치대_총_개수",
            "현재_자전거_개수",
            "위도",
            "경도",
            "거치율",
        ]
        live_bike_df["대여소번호"] = live_bike_df["대여소명_원본"].apply(
            extract_station_number
        )
    else:
        live_bike_df = pd.DataFrame(
            columns=[
                "대여소명_원본",
                "거치대_총_개수",
                "현재_자전거_개수",
                "위도",
                "경도",
                "거치율",
                "대여소번호",
            ]
        )

    # CSV 파일에서 정적 자전거 대여소 정보 읽기 (UTF-8 인코딩 사용)
    csv_path = os.path.join(STATIC_DIR, "processed_bike_station_info_name_updated.csv")
    static_bike_df = pd.read_csv(csv_path, encoding="utf-8")
    static_bike_df["대여소번호"] = static_bike_df["대여소명"].apply(
        extract_station_number
    )

    # 실시간 데이터와 CSV 데이터 병합 (대여소번호 기준)
    merged_df = pd.merge(live_bike_df, static_bike_df, on="대여소번호", how="inner")
    merged_df = merged_df[
        ["대여소명", "현재_자전거_개수", "거치율", "위도_x", "경도_x", "자치구"]
    ]
    merged_df.rename(columns={"위도_x": "위도", "경도_x": "경도"}, inplace=True)

    # 공원 데이터 읽기 (UTF-8 인코딩 사용)
    park_csv_path = os.path.join(STATIC_DIR, "s-fo-location.csv")
    park_df = pd.read_csv(park_csv_path, encoding="utf-8")

    # 미술관 데이터 읽기 (UTF-8 인코딩 사용)
    museum_csv_path = os.path.join(STATIC_DIR, "s-pic-location.csv")
    museum_df = pd.read_csv(museum_csv_path, encoding="utf-8")

    # 맛집 데이터 읽기 (UTF-8 인코딩 사용)
    restaurant_csv_path = os.path.join(STATIC_DIR, "s-teste-location.csv")
    restaurant_df = pd.read_csv(restaurant_csv_path, encoding="utf-8")

    # 각 데이터프레임을 JSON 형식으로 변환
    bike_locations = merged_df.to_dict(orient="records")
    park_locations = park_df[["공원명", "위도", "경도"]].to_dict(orient="records")
    museum_locations = museum_df[["미술관명", "위도", "경도"]].to_dict(orient="records")
    restaurant_locations = restaurant_df[["맛집명", "위도", "경도"]].to_dict(
        orient="records"
    )

    # 템플릿에 전달할 컨텍스트 데이터 준비
    context = {
        "TMAP_API_KEY": TMAP_API_KEY,
        "bike_locations": json.dumps(bike_locations),
        "park_locations": json.dumps(park_locations),
        "museum_locations": json.dumps(museum_locations),
        "restaurant_locations": json.dumps(restaurant_locations),
    }

    # 지도 페이지 렌더링
    return render(request, "riding/map_main.html", context)


# 경로 거리 뷰
def calculate_route(request):
    if request.method == "POST":
        try:
            # POST 데이터에서 좌표 받기
            data = request.POST
            start_lat = data.get("startLat")
            start_lng = data.get("startLng")
            end_lat = data.get("endLat")
            end_lng = data.get("endLng")

            # T map API 호출
            headers = {"appKey": TMAP_API_KEY}  # 기존에 정의된 API 키 사용

            api_url = "https://apis.openapi.sk.com/tmap/routes/pedestrian"
            params = {
                "version": "1",
                "format": "json",
                "startX": start_lng,
                "startY": start_lat,
                "endX": end_lng,
                "endY": end_lat,
                "startName": "출발지",
                "endName": "도착지",
            }

            response = requests.post(api_url, headers=headers, params=params)
            route_data = response.json()

            if "features" in route_data:
                # utils.py의 거리 계산 함수 사용
                distance = calculate_path_distance(route_data["features"])

                return JsonResponse(
                    {
                        "status": "success",
                        "distance": distance,
                        "path": route_data["features"],
                    }
                )
            else:
                return JsonResponse(
                    {"status": "error", "message": "경로를 찾을 수 없습니다."},
                    status=404,
                )

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse(
        {"status": "error", "message": "잘못된 요청입니다."}, status=400
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
    mileage = int(request.GET.get("mileage", 0))

    MileageHistory.objects.create(
        user=request.user,
        transaction_date=now(),
        transaction_type="적립",
        amount=mileage,
        description="자전거 이용 보상",
    )

    profile.mileage += mileage
    profile.save()

    return JsonResponse(
        {"message": "마일리지가 적립되었습니다.", "total_mileage": profile.mileage}
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
