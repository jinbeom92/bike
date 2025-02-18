// 전역 변수 설정
let groupInfoDropup = null;

// 맵
document.addEventListener("DOMContentLoaded", function () {
    console.log("🌍 지도 및 위치 기능 초기화 시작");

    // groupInfoDropup 초기화
    groupInfoDropup = document.querySelector('.group-info-container');

    // 🌟 지도 초기화
    let map = new Tmapv2.Map("map_div", {
        center: new Tmapv2.LatLng(37.5665, 126.978),
        zoom: 15,
        zoomControl: false,
    });

    map.setOptions({
        scrollwheel: true,
        draggable: true,
    });

    // 🌟 마커 이미지 경로 설정
    const markerImages = {
        max: '/static/riding/images/max-logo.png',
        mean: '/static/riding/images/mean-logo.png',
        min: '/static/riding/images/min-logo.png'
    };

    // 전역 변수 설정
    let startPoint = null;
    let endPoint = null;
    let polyline = null;
    let currentTouchHandler = null;

    // 🌟 자전거 대여소 마커 추가
    function addBikeMarkers() {
        if (typeof bikeLocations !== "undefined" && Array.isArray(bikeLocations)) {
            bikeLocations.forEach(location => {
                const occupancyRate = parseFloat(location.거치율);
                let markerImage;

                if (occupancyRate >= 130) {
                    markerImage = markerImages.max;
                } else if (occupancyRate > 30 && occupancyRate < 130) {
                    markerImage = markerImages.mean;
                } else if (occupancyRate >= 0 && occupancyRate <= 30) {
                    markerImage = markerImages.min;
                }

                const marker = new Tmapv2.Marker({
                    position: new Tmapv2.LatLng(location.위도, location.경도),
                    icon: markerImage,
                    map: map,
                    title: location.대여소명
                });

                marker.addListener("click", function () {
                    handleMarkerClick(location.위도, location.경도);
                });
            });
            console.log("🚲 자전거 대여소 마커 추가 완료");
        }
    }

    // 🌟 출발점/도착점 설정 및 경로 검색 함수
    function handleMarkerClick(latitude, longitude) {
        const locationName = bikeLocations.find(loc => 
            loc.위도 === latitude && loc.경도 === longitude
        ).대여소명;
    
        if (!startPoint) {
            startPoint = {
                lat: latitude,
                lng: longitude,
                name: locationName
            };
            document.getElementById('departure').textContent = locationName;
            console.log("📍 출발점 설정:", startPoint);
            alert("출발점이 설정되었습니다.");
        } else if (!endPoint) {
            endPoint = {
                lat: latitude,
                lng: longitude,
                name: locationName
            };
            document.getElementById('destination').textContent = locationName;
            console.log("📍 도착점 설정:", endPoint);
            alert("도착점이 설정되었습니다.");
    
            findPath(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng);
        }
    }

    // 🌟 경로 검색 함수 (Django 백엔드 호출)
    function findPath(startLat, startLng, endLat, endLng) {
        const data = new FormData();
        data.append('startLat', startLat);
        data.append('startLng', startLng);
        data.append('endLat', endLat);
        data.append('endLng', endLng);
    
        fetch('/riding/calculate-route/', {
            method: 'POST',
            body: data,
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                drawPath(data.path);
                // 거리 값을 표시할 특정 요소 선택
                const distanceElement = document.querySelector('.route-info .route-item:first-child .value');
                const timeElement = document.querySelector('.route-info .route-item:nth-child(2) .value');
                if (distanceElement) {
                    distanceElement.textContent = data.distance;
                    timeElement.textContent = data.estimated_time;
                }
            } else {
                console.error("❌ 경로 데이터를 가져오지 못했습니다.");
                alert(data.message);
            }
        })
        .catch(error => {
            console.error("❌ 경로 검색 중 오류 발생:", error);
            alert("경로 검색 중 오류가 발생했습니다.");
        });
    }

    // 🌟 지도에 경로 그리기
    function drawPath(pathData) {
        if (!pathData || !Array.isArray(pathData)) {
            console.error("경로 데이터가 없습니다");
            return;
        }
    
        // 기존 경로 제거
        if (polyline) {
            polyline.setMap(null);
        }
    
        let linePath = [];
        pathData.forEach(path => {
            if (path.geometry.type === "LineString") {
                path.geometry.coordinates.forEach(coord => {
                    linePath.push(new Tmapv2.LatLng(coord[1], coord[0]));
                });
            }
        });
    
        // 새 경로 그리기
        polyline = new Tmapv2.Polyline({
            path: linePath,
            strokeColor: "#FF7F00",
            strokeWeight: 7,
            map: map
        });
    
        // 드롭업 표시
        showGroupInfoDropup();
    }
    
    // 모임 정보 드롭업 표시 함수
    function showGroupInfoDropup() {
        if (groupInfoDropup) {
            // 기존 이벤트 리스너 제거
            if (currentTouchHandler) {
                document.removeEventListener('touchstart', currentTouchHandler);
                document.removeEventListener('click', currentTouchHandler);
                currentTouchHandler = null;
            }

            // 드롭업 표시
            groupInfoDropup.style.display = 'flex';
            groupInfoDropup.style.bottom = '-100%';
            
            // 강제 리플로우 발생
            groupInfoDropup.offsetHeight;
            
            // 애니메이션 적용
            groupInfoDropup.classList.add("active");
            groupInfoDropup.style.bottom = '0';
            
            console.log('모임 정보 열림');

            // 새로운 이벤트 리스너 추가
            currentTouchHandler = (event) => {
                if (!groupInfoDropup.contains(event.target)) {
                    closeGroupInfoDropup();
                }
            };

            document.addEventListener('touchstart', currentTouchHandler);
            document.addEventListener('click', currentTouchHandler);
        }
    }

    // 모임 정보 드롭업 닫기 함수
    function closeGroupInfoDropup() {
        if (groupInfoDropup) {
            groupInfoDropup.style.bottom = '-100%';
            
            setTimeout(() => {
                groupInfoDropup.classList.remove("active");
                groupInfoDropup.style.display = 'none';
                
                // 경로 초기화
                if (polyline) {
                    polyline.setMap(null);
                    polyline = null;
                }
                
                // 출발점, 도착점 초기화
                startPoint = null;
                endPoint = null;
                
                // 텍스트 초기화
                document.getElementById('departure').textContent = '';
                document.getElementById('destination').textContent = '';
                
                // 이벤트 리스너 제거
                if (currentTouchHandler) {
                    document.removeEventListener('touchstart', currentTouchHandler);
                    document.removeEventListener('click', currentTouchHandler);
                    currentTouchHandler = null;
                }
            }, 300);
        }
    }

    // 초기화 함수 호출
    addBikeMarkers();

    // 현재 위치 관련 코드는 그대로 유지
    let myLocationMarker = null;

    function updateCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                console.log(`📍 현재 위치: 위도 ${lat}, 경도 ${lng}`);

                map.setCenter(new Tmapv2.LatLng(lat, lng));

                if (myLocationMarker) {
                    myLocationMarker.setMap(null);
                }

                myLocationMarker = new Tmapv2.Marker({
                    position: new Tmapv2.LatLng(lat, lng),
                    icon: myLocationIcon,
                    iconSize: new Tmapv2.Size(15, 15),
                    map: map
                });

            }, error => {
                console.error("❌ 현재 위치를 가져올 수 없습니다.", error);
                alert(`위치 정보를 가져올 수 없습니다: ${error.message}`);
            });
        } else {
            console.error("❌ 이 브라우저에서는 Geolocation을 지원하지 않습니다.");
            alert("이 브라우저에서는 위치 서비스를 지원하지 않습니다.");
        }
    }

    let locationButton = document.getElementById("location-button");
    if (locationButton) {
        locationButton.addEventListener("click", function () {
            console.log("📍 위치 버튼 클릭됨!");
            console.log("📍 내 위치 아이콘 경로:", myLocationIcon);
            updateCurrentLocation();
        });
    }
});


// 🚀 **사이드바 및 사용자 정보 로드**
document.addEventListener("DOMContentLoaded", function () {
    console.log("📡 사이드바 및 사용자 정보 로드 시작");

    // 🌟 사이드바 관련 요소 선택
    const menuButton = document.getElementById("menu-button");
    const sidebar = document.getElementById("sidebar");
    const mileageButton = document.querySelector(".mileage");
    const usageButton = document.querySelector(".usage");
    const editProfileButton = document.querySelector(".edit-profile");
    const homeButton = document.querySelector(".home");

    // 📌 요소가 없을 경우 경고 출력 후 함수 종료
    if (!menuButton || !sidebar) {
        console.error("❌ 메뉴 버튼 또는 사이드바 요소를 찾을 수 없습니다.");
        return;
    }

    // 🚀 **사이드바 열기**
    menuButton.addEventListener("click", function (event) {
        event.stopPropagation(); // 부모 요소로의 이벤트 전파 방지
        sidebar.classList.add("active"); // 사이드바 활성화
        console.log("📍 메뉴 버튼 클릭됨!");
    });

    // 🚪 **외부 클릭 시 사이드바 닫기**
    document.addEventListener("click", function (event) {
        if (!sidebar.contains(event.target) && !menuButton.contains(event.target)) {
            sidebar.classList.remove("active"); // 사이드바 닫기
        }
    });

    // 📌 **클릭 시 페이지 이동 (Django URL 패턴 적용)**
    if (homeButton) {
        homeButton.addEventListener("click", function () {
            window.location.href = "/riding/map_main/";
        });
    }

    if (mileageButton) {
        mileageButton.addEventListener("click", function () {
            window.location.href = "/riding/mileage_history/";
        });
    }

    if (usageButton) {
        usageButton.addEventListener("click", function () {
            window.location.href = "/riding/usage_history/";
        });
    }

    if (editProfileButton) {
        editProfileButton.addEventListener("click", function () {
            window.location.href = "/riding/users_info_edit/";
        });
    }

    // 🚀 **사용자 정보 불러오기 (사이드바 데이터)**
    loadUserSidebarInfo();
});

// 🚀 **사용자 사이드바 정보 로드 함수**
function updateSidebarInfo() {
    fetch('/riding/api/sidebar-info/')
    .then(response => {
        console.log("📡 API 응답 상태:", response.status);
        return response.json();
    })
    .then(data => {
        console.log("📡 API 응답 데이터:", data);

        // 이번 달 주행 거리 업데이트
        const monthlyDistanceElement = document.querySelector('.stat-item:nth-child(1) .value');
        if (monthlyDistanceElement) {
            monthlyDistanceElement.textContent = data.monthly_distance > 0 ? data.monthly_distance : '0.00';
        } else {
            console.error("❌ monthlyDistanceElement를 찾을 수 없습니다.");
        }

        // 평균 주행 속도 업데이트
        const averageSpeedElement = document.querySelector('.stat-item:nth-child(2) .value');
        if (averageSpeedElement) {
            averageSpeedElement.textContent = data.average_speed > 0 ? data.average_speed : '0.00';
        } else {
            console.error("❌ averageSpeedElement를 찾을 수 없습니다.");
        }

        // 마일리지 업데이트
        const totalMileageElement = document.querySelector('.stat-item:nth-child(3) .value');
        if (totalMileageElement) {
            totalMileageElement.textContent = data.total_mileage > 0 ? data.total_mileage : '0';
        } else {
            console.error("❌ totalMileageElement를 찾을 수 없습니다.");
        }

        // 주 이용 대여소 업데이트
        const mostUsedStationElement = document.querySelector('.rental-location');
        if (mostUsedStationElement) {
            mostUsedStationElement.textContent = data.most_used_station || '미등록';
        } else {
            console.error("❌ mostUsedStationElement를 찾을 수 없습니다.");
        }
    })
    .catch(error => console.error('❌ API 요청 중 오류 발생:', error));
}

// 문서가 로드되면 사이드바 정보 업데이트
document.addEventListener('DOMContentLoaded', function() {
    updateSidebarInfo();
    // 5분마다 정보 업데이트 (선택사항)
    setInterval(updateSidebarInfo, 300000);
});


// 🚴‍♂️ 라이딩 시작 (start_ride API 호출)
function startRide() {
    fetch("/start_ride/", { method: "POST" })
        .then(response => response.json())
        .then(data => {
            alert("🚲 라이딩 시작! 시간: " + data.ride_start_time);
        })
        .catch(error => console.error("Error starting ride:", error));
}

// 🚲 라이딩 종료 (end_ride API 호출)
function endRide(distance, calories, route) {
    fetch(`/end_ride/?distance=${distance}&calories=${calories}&route=${route}`, { method: "POST" })
        .then(response => response.json())
        .then(data => {
            alert("✅ 라이딩 종료! 이동 거리: " + data.total_distance + "KM, 소모 칼로리: " + data.total_calories + "KCAL");
            loadUserSidebarInfo(); // 📊 UI 업데이트
        })
        .catch(error => console.error("Error ending ride:", error));
}

// 💰 마일리지 적립 (add_mileage API 호출)
function addMileage(mileage) {
    fetch(`/add_mileage/?mileage=${mileage}`, { method: "POST" })
        .then(response => response.json())
        .then(data => {
            alert("✅ 마일리지 적립 완료! 총 마일리지: " + data.total_mileage);
            loadUserSidebarInfo(); // 📊 UI 업데이트
        })
        .catch(error => console.error("Error adding mileage:", error));
}

// 🔻 마일리지 사용 (use_mileage API 호출)
function useMileage(mileage) {
    fetch(`/use_mileage/?mileage=${mileage}`, { method: "POST" })
        .then(response => response.json())
        .then(data => {
            alert("✅ 마일리지 사용 완료! 남은 마일리지: " + data.total_mileage);
            loadUserSidebarInfo(); // 📊 UI 업데이트
        })
        .catch(error => {
            console.error("Error using mileage:", error);
            alert("🚨 마일리지가 부족합니다.");
        });
}