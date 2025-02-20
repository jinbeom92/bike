// RouteManager.js
class RouteManager {
    constructor(mapInstance, config) {
        this.map = mapInstance;
        this.config = config;
        this.polyline = null;
        this.startPoint = null;
        this.endPoint = null;
        this.csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        
        // 경로 스타일 설정
        this.routeStyle = {
            strokeColor: "#FF7F00",
            strokeWeight: 7
        };

        // API 설정
        this.apiEndpoint = '/riding/calculate-route/';
    }

    async findPath(startLat, startLng, endLat, endLng) {
        try {
            const formData = this.createFormData(startLat, startLng, endLat, endLng);
            const response = await this.fetchRouteData(formData);
            
            if (response.status === 'success') {
                await this.handleSuccessResponse(response);
                return true;
            } else {
                throw new Error(response.message || "경로를 찾을 수 없습니다.");
            }
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    createFormData(startLat, startLng, endLat, endLng) {
        const formData = new FormData();
        formData.append('startLat', startLat);
        formData.append('startLng', startLng);
        formData.append('endLat', endLat);
        formData.append('endLng', endLng);
        return formData;
    }

    async fetchRouteData(formData) {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': this.csrfToken
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("API 요청 중 오류:", error);
            throw new Error("경로 데이터를 가져오는데 실패했습니다.");
        }
    }

    async handleSuccessResponse(response) {
        try {
            await this.drawPath(response.path);
            this.updateRouteInfo(response.distance, response.estimated_time);
            
            // 커스텀 이벤트 발생
            const event = new CustomEvent('routeCalculated', {
                detail: {
                    distance: response.distance,
                    estimatedTime: response.estimated_time,
                    path: response.path
                }
            });
            document.dispatchEvent(event);
        } catch (error) {
            console.error("경로 처리 중 오류:", error);
            throw error;
        }
    }

    drawPath(pathData) {
        if (!this.validatePathData(pathData)) {
            throw new Error("유효하지 않은 경로 데이터");
        }

        this.clearPath();

        try {
            const linePath = this.createLinePath(pathData);
            this.polyline = new Tmapv2.Polyline({
                path: linePath,
                strokeColor: this.routeStyle.strokeColor,
                strokeWeight: this.routeStyle.strokeWeight,
                map: this.map
            });
        } catch (error) {
            console.error("경로 그리기 중 오류:", error);
            throw new Error("경로를 지도에 표시하는데 실패했습니다.");
        }
    }

    validatePathData(pathData) {
        return pathData && Array.isArray(pathData) && pathData.length > 0;
    }

    createLinePath(pathData) {
        const linePath = [];
        pathData.forEach(path => {
            if (path.geometry.type === "LineString") {
                path.geometry.coordinates.forEach(coord => {
                    linePath.push(new Tmapv2.LatLng(coord[1], coord[0]));
                });
            }
        });
        return linePath;
    }

    clearPath() {
        if (this.polyline) {
            this.polyline.setMap(null);
            this.polyline = null;
        }
    }

    updateRouteInfo(distance, estimatedTime) {
        try {
            const distanceElement = document.querySelector('.route-info .route-item:first-child .value');
            const timeElement = document.querySelector('.route-info .route-item:nth-child(2) .value');
            
            if (distanceElement) {
                distanceElement.textContent = this.formatDistance(distance);
            }
            if (timeElement) {
                timeElement.textContent = this.formatTime(estimatedTime);
            }
        } catch (error) {
            console.error("경로 정보 업데이트 중 오류:", error);
            throw new Error("경로 정보를 업데이트하는데 실패했습니다.");
        }
    }

    formatDistance(distance) {
        return distance < 1000 ? 
            `${Math.round(distance)}m` : 
            `${(distance/1000).toFixed(1)}km`;
    }

    formatTime(minutes) {
        return minutes < 60 ? 
            `${Math.round(minutes)}분` : 
            `${Math.floor(minutes/60)}시간 ${Math.round(minutes%60)}분`;
    }

    setStartPoint(point) {
        this.startPoint = point;
    }

    setEndPoint(point) {
        this.endPoint = point;
    }

    getStartPoint() {
        return this.startPoint;
    }

    getEndPoint() {
        return this.endPoint;
    }

    clearPoints() {
        this.startPoint = null;
        this.endPoint = null;
        this.clearPath();
    }

    handleError(error) {
        console.error("경로 관리자 오류:", error);
        // 커스텀 이벤트 발생
        const event = new CustomEvent('routeError', {
            detail: { error: error.message }
        });
        document.dispatchEvent(event);
    }

    // 현재 경로가 있는지 확인
    hasRoute() {
        return this.polyline !== null;
    }

    // 경로 스타일 업데이트
    updateRouteStyle(style) {
        if (this.polyline) {
            this.polyline.setOptions(style);
        }
        Object.assign(this.routeStyle, style);
    }
}
