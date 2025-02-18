document.addEventListener('DOMContentLoaded', function() {
    // 폼 요소들
    const editForm = document.getElementById('editForm');
    const nicknameInput = document.getElementById('userNickname');
    const passwordInput = document.getElementById('userPw');
    const passwordCheckInput = document.getElementById('userPwCheck');
    const emailInput = document.getElementById('userEmail');
    const verifyEmailBtn = document.querySelector('.verify-btn');
    const verificationInput = document.querySelector('.verify-input');
    const verifyCodeBtn = document.querySelector('.email-verify-btn');
    
    // 에러 메시지 요소들
    const nickError = document.getElementById('userNickError');
    const pwError = document.getElementById('userPwError');
    const emailError = document.getElementById('emailVerificationError');

    // 유효성 검사 상태
    let isNicknameValid = false;
    let isPasswordValid = false;
    let isEmailVerified = false;

    // 닉네임 유효성 검사
    nicknameInput.addEventListener('input', function() {
        const nickname = this.value;
        const nicknameRegex = /^[가-힣a-zA-Z0-9]{2,50}$/;
        
        if (!nicknameRegex.test(nickname)) {
            nickError.textContent = '닉네임은 한글, 영문, 숫자만 가능합니다.';
            isNicknameValid = false;
        } else {
            // 닉네임 중복 검사
            fetch(`/check-nickname/?nickname=${nickname}`)
                .then(response => response.json())
                .then(data => {
                    if (data.available) {
                        nickError.textContent = '';
                        isNicknameValid = true;
                    } else {
                        nickError.textContent = '이미 사용 중인 닉네임입니다.';
                        isNicknameValid = false;
                    }
                });
        }
    });

    // 비밀번호 유효성 검사
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        
        if (!passwordRegex.test(password)) {
            pwError.textContent = '비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.';
            isPasswordValid = false;
        } else {
            pwError.textContent = '';
            isPasswordValid = true;
        }
    });

    // 비밀번호 확인 검사
    passwordCheckInput.addEventListener('input', function() {
        if (this.value !== passwordInput.value) {
            pwError.textContent = '비밀번호가 일치하지 않습니다.';
            isPasswordValid = false;
        } else {
            pwError.textContent = '';
            isPasswordValid = true;
        }
    });

    // 이메일 인증번호 발송
    verifyEmailBtn.addEventListener('click', function() {
        const email = emailInput.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
            emailError.textContent = '유효한 이메일 주소를 입력해주세요.';
            return;
        }

        // 이메일 중복 확인 후 인증번호 발송
        fetch('/check-email/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({ email: email })
        })
        .then(response => response.json())
        .then(data => {
            if (data.available) {
                // 인증번호 발송 요청
                return fetch('/send-verification/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify({ email: email })
                });
            } else {
                emailError.textContent = '이미 사용 중인 이메일입니다.';
                throw new Error('이메일 중복');
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                emailError.textContent = '인증번호가 발송되었습니다. (5분 안에 입력해주세요)';
                emailError.style.color = 'green';
                // 인증번호 입력 필드 활성화
                verificationInput.disabled = false;
                verifyCodeBtn.disabled = false;
            } else {
                emailError.textContent = '인증번호 발송에 실패했습니다.';
            }
        })
        .catch(error => {
            if (error.message !== '이메일 중복') {
                emailError.textContent = '서버 오류가 발생했습니다.';
            }
        });
    });

    // 인증번호 확인
    verifyCodeBtn.addEventListener('click', function() {
        const code = verificationInput.value;
        const email = emailInput.value;

        fetch('/verify-code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({ 
                email: email,
                code: code 
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                emailError.textContent = '이메일 인증이 완료되었습니다.';
                emailError.style.color = 'green';
                isEmailVerified = true;
                // 인증 완료 후 입력 필드 비활성화
                verificationInput.disabled = true;
                verifyCodeBtn.disabled = true;
                emailInput.readOnly = true;
            } else {
                emailError.textContent = '잘못된 인증번호입니다.';
                isEmailVerified = false;
            }
        });
    });

    // 폼 제출
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // 변경된 필드가 있는지 확인
        const hasPasswordChange = passwordInput.value.length > 0;
        const hasEmailChange = isEmailVerified;
        const hasNicknameChange = nicknameInput.value !== nicknameInput.defaultValue;

        // 변경된 필드가 없으면 제출하지 않음
        if (!hasPasswordChange && !hasEmailChange && !hasNicknameChange) {
            alert('변경된 정보가 없습니다.');
            return;
        }

        // 변경된 필드의 유효성 검사
        if (hasPasswordChange && !isPasswordValid) {
            alert('비밀번호를 올바르게 입력해주세요.');
            return;
        }
        if (hasEmailChange && !isEmailVerified) {
            alert('이메일 인증을 완료해주세요.');
            return;
        }
        if (hasNicknameChange && !isNicknameValid) {
            alert('닉네임을 올바르게 입력해주세요.');
            return;
        }

        // 회원정보 수정 요청
        fetch('/update-profile/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({
                nickname: hasNicknameChange ? nicknameInput.value : null,
                password: hasPasswordChange ? passwordInput.value : null,
                email: hasEmailChange ? emailInput.value : null
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('회원정보가 성공적으로 수정되었습니다.');
                window.location.href = '/profile/';
            } else {
                alert(data.message || '회원정보 수정에 실패했습니다.');
            }
        });
    });
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