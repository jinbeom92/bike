document.addEventListener("DOMContentLoaded", function () {
    console.log("🌍 지도 및 위치 기능 초기화 시작");

    // 🌟 지도 초기화
    let map = new Tmapv2.Map("map_div", {
        center: new Tmapv2.LatLng(37.5665, 126.978),
        zoom: 15,
        zoomControl: false,
    });

    map.setOptions({
        scrollwheel: true, // 스크롤 줌 활성화 여부
        draggable: true,   // 지도 드래그 가능 여부
    });

    // 🌟 자전거 대여소 마커 추가
    if (typeof bikeLocations !== "undefined" && Array.isArray(bikeLocations)) {
        bikeLocations.forEach(location => {
            new Tmapv2.Marker({
                position: new Tmapv2.LatLng(location.위도, location.경도),
                map: map,
                title: location["대여소명"]
            });
        });
        console.log("🚲 자전거 대여소 마커 추가 완료");
    } else {
        console.error("❌ bikeLocations 데이터가 정의되지 않았거나 배열이 아닙니다.");
    }

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
                    icon: myLocationIcon, // Django에서 전달된 이미지 경로
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
            console.log("📍 내 위치 아이콘 경로:", myLocationIcon); // 아이콘 경로 확인
            updateCurrentLocation();
        });
    } else {
        console.error("❌ 'location-button'을 찾을 수 없습니다. HTML을 확인하세요.");
    }
});


// 사이드바
document.addEventListener("DOMContentLoaded", function () {
    // 사이드바 관련 요소 선택
    const menuButton = document.getElementById("menu-button");
    const sidebar = document.getElementById("sidebar");

    if (!menuButton || !sidebar) {
        console.error("메뉴 버튼 또는 사이드바 요소를 찾을 수 없습니다.");
        return;
    }

    // 메뉴 버튼 클릭 시 사이드바 열기
    menuButton.addEventListener("click", function (event) {
        event.stopPropagation(); // 부모 요소로의 이벤트 전파 방지
        sidebar.classList.add("active"); // 사이드바 활성화
    });

    // 외부 클릭 시 사이드바 닫기
    document.addEventListener("click", function (event) {
        if (!sidebar.contains(event.target) && !menuButton.contains(event.target)) {
            sidebar.classList.remove("active"); // 사이드바 닫기
        }
    });
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




