// BikeMapApplication.js
class BikeMapApplication {
    constructor(config) {
        this.config = config;
        this.bikeLocations = config.bikeLocations;
        this.parkLocations = config.parkLocations;
        this.museumLocations = config.museumLocations;
        this.restaurantLocations = config.restaurantLocations;

        // 매니저 클래스 초기화 추가
        this.mapManager = new MapManager(config);
        this.markerManager = null;
        this.dropupManager = new DropupManager();
        this.routeManager = null;
        this.locationManager = null;

        // 이벤트 핸들러 바인딩
        this.handleMarkerSelected = this.handleMarkerSelected.bind(this);
        this.handleGroupCreateDropupClosed = this.handleGroupCreateDropupClosed.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
    }

    handleMarkerSelected(event) {
        const ticketDropup = this.dropupManager.ticketDropup;
        
        // 이용권 선택 드롭업이 열려있지 않을 때만 모임 생성하기 드롭업 표시
        if (!ticketDropup?.classList.contains('active')) {
            this.dropupManager.showGroupCreateDropup();
        }
    }

    handleGroupCreateDropupClosed() {
        this.markerManager.clearMarkers();
        this.mapManager.clearCircle();
        this.markerManager.addBikeMarkers(this.bikeLocations);
    }

    validateAndParseData(elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`${elementId} 요소를 찾을 수 없습니다.`);
        }
        const data = JSON.parse(element.textContent);
        if (!Array.isArray(data)) {
            throw new Error(`${elementId}의 데이터가 배열 형식이 아닙니다.`);
        }
        return data;
    }

    init() {
        try {
            // 기본 컴포넌트 초기화
            this.mapManager.init();
            this.markerManager = new MarkerManager(this.mapManager.map, this.config);
            this.routeManager = new RouteManager(this.mapManager.map, this.config);
            this.locationManager = new LocationManager(this.mapManager.map, this.config);

            // 초기 데이터 로드 및 마커 표시
            this.loadInitialData();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 위치 버튼 설정
            this.locationManager.setupLocationButton();

            console.log("🌍 지도 및 위치 기능 초기화 완료");
        } catch (error) {
            this.handleError(error, "지도 초기화 중 오류가 발생했습니다.");
        }
    }

    loadInitialData() {
        try {
            if (!this.bikeLocations || !Array.isArray(this.bikeLocations)) {
                throw new Error('자전거 위치 데이터가 유효하지 않습니다.');
            }
            console.log('로드된 자전거 위치 데이터:', this.bikeLocations.length);
            this.markerManager.addBikeMarkers(this.bikeLocations);
        } catch (error) {
            this.handleError(error, "데이터 로드 중 오류가 발생했습니다.");
        }
    }

    setupEventListeners() {
        // 반납소 설정 리스너를 클래스 속성으로 저장
        this.returnListener = (event) => {
            console.log('반납소로 설정');
            const endpoint = event.detail.location;
            // 반납소 위치를 endPoint로 설정
            this.markerManager.setEndPoint({
                lat: endpoint.lat,
                lng: endpoint.lng,
                name: endpoint.name
            });
            this.dropupManager.showReturnDropup();
        };
    
        // 이용권 선택 버튼들의 공통 이벤트 처리
        const handleTicketSelection = (duration, radius) => {
            console.log(`🎫 ${duration}시간 대여권 선택, 반경: ${radius}m`);
            
            const startPoint = this.markerManager.getStartPoint();
            console.log('현재 시작점:', startPoint);
    
            if (!startPoint || !startPoint.lat || !startPoint.lng) {
                console.warn('유효한 시작점이 설정되지 않았습니다.');
                return;
            }
    
            // 기존 선택 제거
            document.querySelectorAll('.ticket-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
    
            // 현재 버튼 선택
            const selectedButton = document.getElementById(`ticket-${duration}h`);
            if (selectedButton) {
                selectedButton.classList.add('selected');
                
                // 대여권이 선택되면 마커 클릭 이벤트를 변경
                document.removeEventListener('markerSelected', this.handleMarkerSelected);
                document.removeEventListener('markerSelected', this.returnListener);
            }

                document.addEventListener('markerSelected', this.returnListener, { once: true });
    
            // 기존 마커와 원 초기화
            this.markerManager.clearMarkers();
            this.mapManager.clearCircle();
            
            // 반경 원 그리기
            const mintColor = 'rgba(178, 235, 217, 0.6)';
            this.mapManager.drawCircle(startPoint, radius, mintColor);
            
            // 반경 내 마커만 표시
            this.markerManager.addBikeMarkersInRadius(this.bikeLocations, startPoint, radius);
            
            console.log(`🎯 ${radius}m 반경 설정 완료`);
        };
    
        // 대여권 버튼 이벤트
        const ticketOneHour = document.getElementById('ticket-1h');
        const ticketTwoHour = document.getElementById('ticket-2h');
    
        if (ticketOneHour) {
            ticketOneHour.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // 이벤트 전파 중단
                console.log('1시간 대여권 버튼 클릭');
                handleTicketSelection(1, 3000);
            });
        }
    
        if (ticketTwoHour) {
            ticketTwoHour.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // 이벤트 전파 중단
                console.log('2시간 대여권 버튼 클릭');
                handleTicketSelection(2, 10000);
            });
        }
    
        // 모임 생성하기 버튼 이벤트
        const createGroupBtn = document.querySelector('.create-group-btn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dropupManager.closeGroupCreateDropup();
                
                // 모임 생성하기 드롭업이 완전히 닫힌 후 이용권 선택 드롭업 열기
                document.addEventListener('groupCreateDropupClosed', () => {
                    this.dropupManager.showTicketSelectDropup();
                }, { once: true });
            });
        }
    
        // 반납소 버튼 이벤트
        const returnBtn = document.getElementById('return-btn');
        if (returnBtn) {
            returnBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const startPoint = this.markerManager.getStartPoint();
                const endPoint = this.markerManager.getEndPoint();
        
                if (!endPoint) {
                    console.error('반납소 위치가 선택되지 않았습니다.');
                    return;
                }
        
                fetch('/riding/save-marker/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.config.csrfToken,
                    },
                    body: JSON.stringify({
                        start_point: startPoint,
                        end_point: endPoint,
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        this.dropupManager.closeReturnDropup();
                        console.log(`위치 캐쉬 저장 완료`);
                        // 테마 드롭업
                        this.dropupManager.showThemaDropup();
                    }
                });
            });
        }

        // 이용권 선택 드롭업 닫힘 이벤트 핸들러
        document.addEventListener('ticketDropupClosed', () => {
            const selectedTicket = document.querySelector('.ticket-btn.selected');
            
            // 모든 마커 관련 이벤트 리스너 제거
            document.removeEventListener('markerSelected', this.handleMarkerSelected);
            document.removeEventListener('markerSelected', this.returnListener);
            
            // 맵 초기화
            this.markerManager.clearMarkers();
            this.mapManager.clearCircle();
            this.markerManager.addBikeMarkers(this.bikeLocations);
            
            // 모임 생성하기 이벤트만 다시 등록
            document.addEventListener('markerSelected', this.handleMarkerSelected);
        });
    
        // 반납소 드롭업 닫힘 이벤트 핸들러
        document.addEventListener('returnDropupClosed', () => {
            // 필요한 경우 추가 처리
        });
    
        // 이벤트 리스너 등록
        document.removeEventListener('markerSelected', this.handleMarkerSelected);
        document.removeEventListener('groupCreateDropupClosed', this.handleGroupCreateDropupClosed);
        document.addEventListener('markerSelected', this.handleMarkerSelected);
        document.addEventListener('groupCreateDropupClosed', this.handleGroupCreateDropupClosed);
    }
    

    setupGroupCreateButton() {
        const createGroupBtn = document.querySelector('.create-group-btn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => {
                this.dropupManager.showTicketSelectDropup();
            });
        }
    }

    handleOutsideClick(event) {
        const dropups = [
            this.dropupManager.groupInfoDropup,
            this.dropupManager.groupCreateDropup,
            this.dropupManager.ticketDropup
        ];

        dropups.forEach(dropup => {
            if (dropup && !dropup.contains(event.target)) {
                if (dropup.classList.contains('active')) {
                    this.handleDropupClose(dropup);
                }
            }
        });
    }

    handleDropupClose(dropup) {
        try {
            switch(dropup) {
                case this.dropupManager.groupInfoDropup:
                    this.dropupManager.closeGroupInfoDropup();
                    break;
                case this.dropupManager.groupCreateDropup:
                    this.dropupManager.closeGroupCreateDropup();
                    break;
                case this.dropupManager.ticketDropup:
                    this.dropupManager.closeTicketSelectDropup();
                    break;
            }
        } catch (error) {
            this.handleError(error, "드롭업 닫기 중 오류가 발생했습니다.");
        }
    }

    handleError(error, userMessage = "오류가 발생했습니다.") {
        console.error("Error:", error);
        alert(userMessage);
    }
}




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