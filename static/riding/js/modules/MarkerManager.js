// MarkerManager.js
class MarkerManager {
    constructor(mapInstance, config) {
        this.map = mapInstance;
        this.config = config;
        this.markers = new Map();
        this.startPoint = null;
        this.endPoint = null;
        this.markerImages = config.staticUrls;
        this.bikeLocations = config.bikeLocations;
        this.selectedMarker = null;
        this.isRadiusMode = false;
        this.currentRadius = null;
        this.radiusCenter = null;
    }

    // 기본 마커 추가 메서드
    addBikeMarkers(bikeLocations) {
        try {
            if (!Array.isArray(bikeLocations)) {
                throw new Error('유효하지 않은 자전거 위치 데이터');
            }
            
            this.validateBikeLocations(bikeLocations);
            this.clearMarkers();
            
            bikeLocations.forEach(location => {
                const marker = this.createBikeMarker(location);
                const key = this.getMarkerKey(location);
                this.markers.set(key, marker);
            });

            console.log(`🚲 ${this.markers.size}개의 자전거 대여소 마커가 추가되었습니다.`);
        } catch (error) {
            console.error('마커 추가 중 오류 발생:', error);
            throw error;
        }
    }

    validateBikeLocations(locations) {
        const requiredKeys = ['위도', '경도', '거치율', '대여소명'];
        locations.forEach((location, index) => {
            if (!requiredKeys.every(key => key in location)) {
                throw new Error(`위치 데이터 ${index}번째 항목에 필수 키가 누락되었습니다.`);
            }
        });
    }

    createBikeMarker(location) {
        try {
            const occupancyRate = parseFloat(location.거치율);
            const markerImage = this.getMarkerImage(occupancyRate);
            
            const marker = new Tmapv2.Marker({
                position: new Tmapv2.LatLng(location.위도, location.경도),
                icon: markerImage,
                map: this.map,
                title: location.대여소명
            });

            marker.addListener("click", () => {
                this.handleMarkerClick(location, marker);
            });

            return marker;
        } catch (error) {
            console.error('마커 생성 중 오류 발생:', error);
            throw new Error('마커를 생성하는 중 오류가 발생했습니다.');
        }
    }

    getMarkerImage(occupancyRate) {
        if (occupancyRate >= 130) {
            return this.markerImages.maxLogo;
        } else if (occupancyRate > 30) {
            return this.markerImages.meanLogo;
        } else {
            return this.markerImages.minLogo;
        }
    }

    handleMarkerClick(location, marker) {
        try {
            // 이용권 선택 드롭업이 열려있는지 확인
            const ticketDropup = document.getElementById('ticket-select-dropup');
            const selectedTicket = document.querySelector('.ticket-btn.selected');
            
            if (ticketDropup?.classList.contains('active') && selectedTicket) {
                // 이용권이 선택된 상태에서는 반납소 설정
                this.endPoint = {
                    lat: parseFloat(location.위도),
                    lng: parseFloat(location.경도),
                    name: location.대여소명,
                    occupancyRate: location.거치율
                };
                console.log('반납소로 설정');
                
                // endPoint 설정 후 이벤트 발생
                document.dispatchEvent(new CustomEvent('markerSelected', {
                    detail: { 
                        location: this.endPoint,
                        showDropup: true 
                    }
                }));
                return;
            }
    
            // 일반적인 경우 모임 생성하기 로직 실행
            this.clearMarkers();
            
            if (this.selectedMarker) {
                this.selectedMarker.setMap(null);
                this.selectedMarker = null;
            }
            
            this.selectedMarker = new Tmapv2.Marker({
                position: new Tmapv2.LatLng(location.위도, location.경도),
                icon: this.getMarkerImage(parseFloat(location.거치율)),
                map: this.map,
                title: location.대여소명
            });
            
            this.startPoint = {
                lat: parseFloat(location.위도),
                lng: parseFloat(location.경도),
                name: location.대여소명,
                occupancyRate: location.거치율
            };
    
            this.map.setCenter(new Tmapv2.LatLng(location.위도, location.경도));
    
            document.dispatchEvent(new CustomEvent('markerSelected', {
                detail: { 
                    location: this.startPoint,
                    showDropup: true 
                }
            }));
            
            return true;
        } catch (error) {
            console.error('마커 클릭 처리 중 오류 발생:', error);
            throw error;
        }
    }
    
    

    maintainSelectedMarker(startPoint) {
        if (startPoint) {
            // 선택된 마커 다시 생성
            this.selectedMarker = new Tmapv2.Marker({
                position: new Tmapv2.LatLng(startPoint.lat, startPoint.lng),
                icon: this.getMarkerImage(parseFloat(startPoint.occupancyRate)),
                map: this.map,
                title: startPoint.name
            });
        }
    }

    clearMarkers() {
        if (this.selectedMarker) {
            this.selectedMarker.setMap(null);
            this.selectedMarker = null;
        }
        this.markers.forEach(marker => marker.setMap(null));
        this.markers.clear();
        
        // 반경 모드 초기화는 명시적으로 호출할 때만
        if (!this.isRadiusMode) {
            this.currentRadius = null;
            this.radiusCenter = null;
        }
    }

    showMarkersInRadius(center, radius) {
        try {
            // 기존 마커 재생성 없이 visibility만 변경
            this.markers.forEach((marker, key) => {
                const [lat, lng] = key.split('-').map(Number);
                const distance = this.calculateDistance(
                    center.lat,
                    center.lng,
                    lat,
                    lng
                );
    
                marker.setMap(distance <= radius ? this.map : null);
            });
    
            // 선택된 마커 유지
            if (this.selectedMarker) {
                this.selectedMarker.setMap(this.map);
            }
        } catch (error) {
            console.error('반경 내 마커 표시 중 오류 발생:', error);
            throw error;
        }
    }

    // 반경 내 마커만 표시하는 메서드
    addBikeMarkersInRadius(bikeLocations, center, radius) {
        try {
            this.clearMarkers();
            
            // 반경 모드 상태 저장
            this.isRadiusMode = true;
            this.currentRadius = radius;
            this.radiusCenter = center;
            
            // 선택된 마커 다시 생성
            if (this.startPoint) {
                this.selectedMarker = new Tmapv2.Marker({
                    position: new Tmapv2.LatLng(this.startPoint.lat, this.startPoint.lng),
                    icon: this.getMarkerImage(parseFloat(this.startPoint.occupancyRate)),
                    map: this.map,
                    title: this.startPoint.name
                });
            }
            
            // 반경 내 마커만 추가
            bikeLocations.forEach(location => {
                const distance = this.calculateDistance(
                    center.lat,
                    center.lng,
                    parseFloat(location.위도),
                    parseFloat(location.경도)
                );

                if (distance <= radius) {
                    const marker = this.createBikeMarker(location);
                    const key = this.getMarkerKey(location);
                    this.markers.set(key, marker);
                }
            });

            console.log(`🚲 반경 ${radius}m 내의 마커만 표시됩니다.`);
        } catch (error) {
            console.error('반경 내 마커 추가 중 오류 발생:', error);
            throw error;
        }
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // 지구 반지름 (미터)
        const φ1 = this.toRadians(lat1);
        const φ2 = this.toRadians(lat2);
        const Δφ = this.toRadians(lat2 - lat1);
        const Δλ = this.toRadians(lng2 - lng1);

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    getMarkerKey(location) {
        return `${location.위도}-${location.경도}`;
    }

    getStartPoint() {
        return this.startPoint;
    }

    setEndPoint(endpoint) {
        this.endPoint = endpoint;
    }

    getEndPoint() {
        return this.endPoint;
    }

    // 특정 위치의 마커 찾기
    findMarkerByLocation(lat, lng) {
        const key = `${lat}-${lng}`;
        return this.markers.get(key);
    }

    // 마커 표시/숨김 토글
    toggleMarkerVisibility(marker, visible) {
        if (marker) {
            marker.setMap(visible ? this.map : null);
        }
    }

    // 마커 아이콘 업데이트
    updateMarkerIcon(marker, occupancyRate) {
        if (marker) {
            marker.setIcon(this.getMarkerImage(occupancyRate));
        }
    }

    // 모든 마커 정보 가져오기
    getAllMarkers() {
        return Array.from(this.markers.values());
    }
}
