// MapManager.js
class MapManager {
    constructor(config) {
        this.config = config;
        this.map = null;
        this.markers = new Map();
        this.currentCircle = null;
        this.polyline = null;
        
        // 지도 기본 설정
        this.mapOptions = {
            center: new Tmapv2.LatLng(37.5665, 126.978),
            zoom: 15,
            zoomControl: false
        };

        // 데이터 초기화
        this.bikeLocations = JSON.parse(document.getElementById('bike-data').textContent);
        this.parkLocations = JSON.parse(document.getElementById('park-data').textContent);
        this.museumLocations = JSON.parse(document.getElementById('museum-data').textContent);
        this.restaurantLocations = JSON.parse(document.getElementById('restaurant-data').textContent);
    }

    init() {
        try {
            // 지도 생성
            this.map = new Tmapv2.Map("map_div", this.mapOptions);
            
            // 지도 옵션 설정
            this.setMapOptions({
                scrollwheel: true,
                draggable: true,
            });

            // 이벤트 리스너 설정
            this.setupMapEventListeners();

            console.log("🗺️ 지도가 성공적으로 초기화되었습니다.");
            return true;
        } catch (error) {
            console.error("지도 초기화 중 오류 발생:", error);
            throw new Error("지도를 초기화하는데 실패했습니다.");
        }
    }

    setMapOptions(options) {
        try {
            this.map.setOptions(options);
        } catch (error) {
            console.error("지도 옵션 설정 중 오류:", error);
            throw error;
        }
    }

    setupMapEventListeners() {
        // 지도 클릭 이벤트
        this.map.addListener('click', (e) => {
            const event = new CustomEvent('mapClicked', {
                detail: {
                    lat: e.latLng.lat(),
                    lng: e.latLng.lng()
                }
            });
            document.dispatchEvent(event);
        });

        // 지도 줌 변경 이벤트
        this.map.addListener('zoom_changed', () => {
            const event = new CustomEvent('mapZoomChanged', {
                detail: {
                    zoom: this.map.getZoom()
                }
            });
            document.dispatchEvent(event);
        });
    }

    setCenter(lat, lng) {
        try {
            const latLng = new Tmapv2.LatLng(lat, lng);
            this.map.setCenter(latLng);
        } catch (error) {
            console.error("지도 중심 설정 중 오류:", error);
            throw new Error("지도 중심을 설정하는데 실패했습니다.");
        }
    }

    drawCircle(center, radius, color) {
        try {
            this.clearCircle();
    
            this.currentCircle = new Tmapv2.Circle({
                center: new Tmapv2.LatLng(center.lat, center.lng),
                radius: radius,
                strokeColor: color,
                strokeOpacity: 0.5,
                strokeWeight: 2,
                fillColor: color,
                fillOpacity: 0.2,
                map: this.map
            });
    
            // 원의 중심으로 지도 이동 및 줌 레벨 조정
            this.map.setCenter(new Tmapv2.LatLng(center.lat, center.lng));
            this.map.setZoom(this.getZoomForRadius(radius));
    
            // 원이 그려진 후 이벤트 발생
            const event = new CustomEvent('circleDrawn', {
                detail: {
                    center: center,
                    radius: radius
                }
            });
            document.dispatchEvent(event);
    
            return this.currentCircle;
        } catch (error) {
            console.error("원 그리기 중 오류:", error);
            throw new Error("반경을 표시하는데 실패했습니다.");
        }
    }
    
    // 반경에 따른 적절한 줌 레벨 계산
    getZoomForRadius(radius) {
        if (radius <= 3000) return 14;  // 3km 이하
        if (radius <= 10000) return 12; // 10km 이하
        return 11;
    }

    clearCircle() {
        if (this.currentCircle) {
            this.currentCircle.setMap(null);
            this.currentCircle = null;
        }
    }

    // 지도 영역 조정
    fitBounds(points) {
        try {
            const bounds = new Tmapv2.LatLngBounds();
            points.forEach(point => {
                bounds.extend(new Tmapv2.LatLng(point.lat, point.lng));
            });
            this.map.fitBounds(bounds);
        } catch (error) {
            console.error("지도 영역 조정 중 오류:", error);
            throw error;
        }
    }

    // 현재 지도 중심 좌표 반환
    getCenter() {
        const center = this.map.getCenter();
        return {
            lat: center.lat(),
            lng: center.lng()
        };
    }

    // 현재 지도 줌 레벨 반환
    getZoom() {
        return this.map.getZoom();
    }

    // 지도 타입 변경
    setMapType(type) {
        try {
            this.map.setMapType(type);
        } catch (error) {
            console.error("지도 타입 변경 중 오류:", error);
            throw error;
        }
    }

    // 지도 인스턴스 반환
    getMap() {
        return this.map;
    }

    // 메모리 정리
    destroy() {
        this.clearCircle();
        if (this.polyline) {
            this.polyline.setMap(null);
        }
        this.markers.forEach(marker => marker.setMap(null));
        this.markers.clear();
    }
}
