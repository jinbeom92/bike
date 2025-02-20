// DropupManager.js
class DropupManager {
    constructor() {
        // DOM 요소 초기화
        this.groupInfoDropup = document.querySelector('.group-info-container');
        this.groupCreateDropup = document.querySelector('.group-create-container');
        this.ticketDropup = document.getElementById('ticket-select-dropup');
        this.overlay = document.getElementById('overlay');
        this.currentHandler = null;
        
        // 애니메이션 타이밍 설정
        this.animationDelay = 50;
        this.transitionDuration = 300;

        // 이벤트 핸들러 한 번만 등록
        this.handleGlobalClick = this.handleGlobalClick.bind(this);
        document.addEventListener('click', this.handleGlobalClick);
    }

    // removeCurrentHandler 메서드 복원
    removeCurrentHandler() {
        if (this.currentHandler) {
            document.removeEventListener('click', this.currentHandler);
            document.removeEventListener('touchstart', this.currentHandler);
            this.currentHandler = null;
        }
    }

    handleGlobalClick(event) {
        // 마커 클릭은 MarkerManager에서 처리되므로 여기서는 드롭업 관련 처리만 함
        
        // 이벤트 처리 우선순위 설정
        const createGroupBtn = event.target.closest('.create-group-btn');
        
        // 이용권 선택 드롭업이 열려있는 경우
        if (this.ticketDropup?.classList.contains('active')) {
            const isOutside = !this.ticketDropup.contains(event.target);
            if (isOutside && !createGroupBtn) {
                this.closeTicketSelectDropup();
                event.stopPropagation();
                return;
            }
        }
    
        // 모임 생성하기 드롭업이 열려있는 경우
        if (this.groupCreateDropup?.classList.contains('active')) {
            // 모임 생성하기 버튼 클릭 처리
            if (createGroupBtn) {
                this.closeGroupCreateDropup();
                document.addEventListener('groupCreateDropupClosed', () => {
                    this.showTicketSelectDropup();
                }, { once: true });
                return;
            }
    
            // 외부 클릭 처리
            const isOutside = !this.groupCreateDropup.contains(event.target);
            if (isOutside) {
                this.closeGroupCreateDropup();
                event.stopPropagation();
                return;
            }
        }
    }

    // 모임 생성하기 드롭업
    showGroupCreateDropup() {
        try {
            if (!this.groupCreateDropup) {
                throw new Error('모임 생성 드롭업 요소를 찾을 수 없습니다.');
            }
            
            console.log('📌 모임 생성하기 드롭업 열기 시작');
            this.groupCreateDropup.style.display = 'flex';
            this.groupCreateDropup.style.bottom = '-140px';
            this.groupCreateDropup.offsetHeight;
            
            setTimeout(() => {
                this.groupCreateDropup.classList.add('active');
                this.groupCreateDropup.style.bottom = '0';
                this.showOverlay();
                console.log('✅ 모임 생성하기 드롭업 열기 완료');
            }, this.animationDelay);
        } catch (error) {
            console.error('모임 생성 드롭업 표시 중 오류:', error);
            throw error;
        }
    }

    closeGroupCreateDropup() {
        try {
            if (!this.groupCreateDropup || !this.groupCreateDropup.classList.contains('active')) return;
            
            console.log('📌 모임 생성하기 드롭업 닫기 시작');
            this.groupCreateDropup.classList.remove('active');
            this.groupCreateDropup.style.bottom = '-140px';
            this.hideOverlay();
    
            setTimeout(() => {
                this.groupCreateDropup.style.display = 'none';
                console.log('✅ 모임 생성하기 드롭업 닫기 완료');
                
                document.dispatchEvent(new CustomEvent('groupCreateDropupClosed', {
                    detail: { source: 'dropupManager' },
                    bubbles: false
                }));
            }, this.transitionDuration);
        } catch (error) {
            console.error('모임 생성 드롭업 닫기 중 오류:', error);
        }
    }


    showTicketSelectDropup() {
        try {
            if (!this.ticketDropup) {
                throw new Error('이용권 선택 드롭업 요소를 찾을 수 없습니다.');
            }
            
            console.log('📌 이용권 선택 드롭업 열기 시작');
            this.ticketDropup.style.display = 'flex';
            this.ticketDropup.offsetHeight;
            
            setTimeout(() => {
                this.ticketDropup.classList.add('active');
                this.showOverlay();
                console.log('✅ 이용권 선택 드롭업 열기 완료');
            }, this.animationDelay);
    
        } catch (error) {
            console.error('이용권 선택 드롭업 표시 중 오류:', error);
            throw error;
        }
    }

    showGroupInfoDropup() {
        try {
            if (!this.groupInfoDropup) {
                throw new Error('그룹 정보 드롭업 요소를 찾을 수 없습니다.');
            }
            
            this.groupInfoDropup.style.display = 'flex';
            this.groupInfoDropup.style.bottom = '-100%';
            this.groupInfoDropup.offsetHeight;
            
            this.groupInfoDropup.classList.add("active");
            this.groupInfoDropup.style.bottom = '0';
        } catch (error) {
            console.error('그룹 정보 드롭업 표시 중 오류:', error);
            throw error;
        }
    }

    closeTicketSelectDropup() {
        try {
            if (!this.ticketDropup) return;
    
            console.log('📌 이용권 선택 드롭업 닫기 시작');
            this.ticketDropup.classList.remove('active');
            this.hideOverlay();
            this.removeCurrentHandler();
            
            // 이용권 버튼 선택 상태 초기화
            const ticketButtons = document.querySelectorAll('.ticket-btn');
            ticketButtons.forEach(btn => {
                btn.classList.remove('selected');
            });
    
            setTimeout(() => {
                this.ticketDropup.style.display = 'none';
                console.log('✅ 이용권 선택 드롭업 닫기 완료');
                
                document.dispatchEvent(new CustomEvent('ticketDropupClosed', {
                    detail: { source: 'dropupManager' },
                    bubbles: false
                }));
            }, this.transitionDuration);
        } catch (error) {
            console.error('이용권 선택 드롭업 닫기 중 오류:', error);
        }
    }
    

    closeGroupInfoDropup() {
        try {
            if (!this.groupInfoDropup) return;

            this.groupInfoDropup.classList.remove('active');
            this.groupInfoDropup.style.bottom = '-100%';
            this.removeCurrentHandler();

            setTimeout(() => {
                this.groupInfoDropup.style.display = 'none';
            }, this.transitionDuration);
        } catch (error) {
            console.error('그룹 정보 드롭업 닫기 중 오류:', error);
            throw error;
        }
    }

    showOverlay() {
        if (this.overlay) {
            this.overlay.style.display = 'block';
            this.overlay.classList.add('active');
        }
    }

    hideOverlay() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
            this.overlay.style.display = 'none';
        }
    }

    // 현재 활성화된 드롭업 확인
    getActiveDropup() {
        if (this.groupInfoDropup?.classList.contains('active')) return 'groupInfo';
        if (this.groupCreateDropup?.classList.contains('active')) return 'groupCreate';
        if (this.ticketDropup?.classList.contains('active')) return 'ticket';
        return null;
    }

    // 모든 드롭업 닫기
    closeAllDropups() {
        this.closeGroupInfoDropup();
        this.closeGroupCreateDropup();
        this.closeTicketSelectDropup();
    }
}
