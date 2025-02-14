document.addEventListener("DOMContentLoaded", function () {
    console.log("🌍 지도 및 위치 기능 초기화 시작");

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

    // 🌟 자전거 대여소 마커 추가
    function addBikeMarkers() {
        if (typeof bikeLocations !== "undefined" && Array.isArray(bikeLocations)) {
            bikeLocations.forEach(location => {
                const occupancyRate = parseFloat(location.거치율);
                let markerImage;

                if (occupancyRate >= 130 ) {
                    markerImage = markerImages.max;
                } else if (occupancyRate > 30 && occupancyRate < 130) {
                    markerImage = markerImages.mean;
                } else if (occupancyRate >= 0 && occupancyRate <= 30) {
                    markerImage = markerImages.min;
                }

                new Tmapv2.Marker({
                    position: new Tmapv2.LatLng(location.위도, location.경도),
                    icon: markerImage,
                    map: map,
                    title: location.대여소명
                });
            });
            console.log("🚲 자전거 대여소 마커 추가 완료");
        } else {
            console.error("❌ bikeLocations 데이터가 정의되지 않았거나 배열이 아닙니다.");
        }
    }

    addBikeMarkers();

    // 🌟 현재 위치 마커 (전역 변수)
    let myLocationMarker = null;

    // 🌟 현재 위치 이동 기능
    function updateCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                console.log(`📍 현재 위치: 위도 ${lat}, 경도 ${lng}`);

                // 📌 지도 중심 이동
                map.setCenter(new Tmapv2.LatLng(lat, lng));

                // 📌 기존 마커 제거 후 새 마커 추가
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

    // 🌟 위치 버튼 이벤트 리스너 추가
    let locationButton = document.getElementById("location-button");
    if (locationButton) {
        locationButton.addEventListener("click", function () {
            console.log("📍 위치 버튼 클릭됨!");
            console.log("📍 내 위치 아이콘 경로:", myLocationIcon);
            updateCurrentLocation();
        });
    } else {
        console.error("❌ 'location-button'을 찾을 수 없습니다. HTML을 확인하세요.");
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



/* 시간 드롭업 */
document.addEventListener("DOMContentLoaded", function () {
    const timeDropdown = document.getElementById("time-dropdown"); // 드롭업 컨테이너
    const timeButton = document.getElementById("time-button"); // 시간 선택 버튼
    const timeItems = document.querySelectorAll(".time-selection__item"); // 개별 시간 항목
    const closeBar = document.querySelector(".close-bar"); // 닫기 바

    if (!timeDropdown || !timeButton) {
        console.error("드롭업 또는 버튼 요소를 찾을 수 없습니다.");
        return;
    }

    // ⏰ 드롭업 열기/닫기 토글 함수 (바닥에서 올라옴)
    function toggleTimeDropdown() {
        timeDropdown.classList.toggle("active"); // 드롭업 활성화/비활성화
    }

    // 🖱️ 시간 선택 기능
    function selectTime(event) {
        // 기존 선택된 항목에서 'selected' 클래스 제거
        timeItems.forEach(item => item.classList.remove("selected"));
        // 클릭한 항목에 'selected' 클래스 추가
        event.target.classList.add("selected");

        // 드롭업 닫기
        timeDropdown.classList.remove("active");
    }

    // ❌ 외부 클릭 시 드롭업 닫기
    function closeDropdownOnClickOutside(event) {
        if (!timeDropdown.contains(event.target) && event.target !== timeButton) {
            timeDropdown.classList.remove("active");
        }
    }

    // 📌 이벤트 리스너 등록
    timeButton.addEventListener("click", toggleTimeDropdown); // 버튼 클릭 시 드롭업 열기/닫기
    timeItems.forEach(item => item.addEventListener("click", selectTime)); // 각 시간 항목 클릭 시 선택
    document.addEventListener("click", closeDropdownOnClickOutside); // 외부 클릭 시 드롭업 닫기
    closeBar.addEventListener("click", toggleTimeDropdown); // 닫기 바 클릭 시 드롭업 닫기
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