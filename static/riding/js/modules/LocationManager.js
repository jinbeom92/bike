// LocationManager.js
class LocationManager {
    constructor(mapInstance, config) {
        this.map = mapInstance;
        this.config = config;
        this.currentMarker = null;
        this.myLocationIcon = config.myLocationIcon;
        this.watchId = null;
        this.isTracking = false;
        this.locationOptions = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };
    }

    async getCurrentLocation() {
        try {
            if (!navigator.geolocation) {
                throw new Error("이 브라우저에서는 위치 서비스를 지원하지 않습니다.");
            }

            const position = await this.getPosition();
            const { latitude: lat, longitude: lng } = position.coords;
            
            console.log(`📍 현재 위치: 위도 ${lat}, 경도 ${lng}`);
            
            this.updateLocationOnMap(lat, lng);
            return { lat, lng };
        } catch (error) {
            console.error("❌ 현재 위치를 가져올 수 없습니다.", error);
            throw new Error(`위치 정보를 가져올 수 없습니다: ${error.message}`);
        }
    }

    getPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                this.locationOptions
            );
        });
    }

    updateLocationOnMap(lat, lng) {
        try {
            this.map.setCenter(new Tmapv2.LatLng(lat, lng));

            if (this.currentMarker) {
                this.currentMarker.setMap(null);
            }

            this.currentMarker = new Tmapv2.Marker({
                position: new Tmapv2.LatLng(lat, lng),
                icon: this.config.staticUrls.myLocationIcon,
                iconSize: new Tmapv2.Size(15, 15),
                map: this.map
            });
        } catch (error) {
            console.error("위치 마커 업데이트 중 오류:", error);
            throw error;
        }
    }

    startTracking() {
        if (this.isTracking) return;

        try {
            this.isTracking = true;
            this.watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude: lat, longitude: lng } = position.coords;
                    this.updateLocationOnMap(lat, lng);
                },
                (error) => {
                    console.error("위치 추적 중 오류 발생:", error);
                    this.stopTracking();
                    throw error;
                },
                this.locationOptions
            );
        } catch (error) {
            this.isTracking = false;
            throw new Error("위치 추적을 시작할 수 없습니다.");
        }
    }

    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.isTracking = false;
    }

    removeLocationMarker() {
        if (this.currentMarker) {
            this.currentMarker.setMap(null);
            this.currentMarker = null;
        }
    }

    setupLocationButton() {
        const locationButton = document.getElementById("location-button");
        if (locationButton) {
            locationButton.addEventListener("click", async () => {
                try {
                    console.log("📍 위치 버튼 클릭됨!");
                    console.log("📍 내 위치 아이콘 경로:", this.myLocationIcon);
                    await this.getCurrentLocation();
                } catch (error) {
                    console.error("위치 버튼 클릭 처리 중 오류:", error);
                    alert(error.message);
                }
            });
        } else {
            console.warn("위치 버튼을 찾을 수 없습니다.");
        }
    }

    // 위치 정보 갱신 메서드
    async refreshLocation() {
        try {
            if (this.isTracking) {
                await this.getCurrentLocation();
            }
        } catch (error) {
            console.error("위치 정보 갱신 중 오류:", error);
            throw error;
        }
    }

    // 위치 추적 상태 확인
    isLocationTracking() {
        return this.isTracking;
    }

    // 현재 위치 마커 존재 여부 확인
    hasLocationMarker() {
        return this.currentMarker !== null;
    }
}
