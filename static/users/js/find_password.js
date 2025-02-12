// 클라이언트 검증
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소 선택
    const findPasswordForm = document.getElementById('findPasswordForm');
    const userId = document.getElementById('userId');
    const emailInput = document.getElementById('email');
    const verificationBtn = document.querySelector('.verification-btn');
    const verificationInput = document.querySelector('input[name="verification_code"]');
    const verifyBtn = document.querySelector('.verify-btn');
    const submitBtn = document.querySelector('.submit-btn');

    // 초기 버튼 상태 설정
    verificationBtn.disabled = true;
    verifyBtn.disabled = true;
    submitBtn.disabled = true;
    verificationInput.disabled = true;
    updateButtonStyles();

    // 버튼 스타일 업데이트 함수
    function updateButtonStyles() {
        [verificationBtn, verifyBtn].forEach(btn => {
            if (btn.disabled) {
                btn.style.backgroundColor = '#DDDDDD';
                btn.style.color = '#352555';
            } else {
                btn.style.backgroundColor = '#40B59F';
                btn.style.color = '#FFF';
            }
        });

        // '비밀번호 변경하기' 버튼 스타일 별도 처리
        if (submitBtn.disabled) {
            submitBtn.style.backgroundColor = '#DDDDDD';
            submitBtn.style.color = '#352555';
        } else {
            submitBtn.style.backgroundColor = '#40B59F';
            submitBtn.style.color = '#FFF';
        }
    }

    // 이메일 유효성 검사 함수
    function isValidEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.(com|net|org|kr|co\.kr)$/;
        return emailRegex.test(email);
    }

    // 아이디 유효성 검사
    function isValidUsername(username) {
        return username.length >= 3; // 예: 최소 3자 이상
    }

    // 아이디와 이메일 입력 감지
    function checkInputs() {
        const isValidEmailInput = isValidEmail(emailInput.value.trim());
        verificationBtn.disabled = !isValidEmailInput;
        updateButtonStyles();
    }
    
    // 에러 메시지
    function showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    // 에러 메시지 초기화
    function clearError() {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }

    // 입력 이벤트 리스너 추가
    userId.addEventListener('input', checkInputs);
    emailInput.addEventListener('input', checkInputs);

    // 인증번호 발송 버튼 클릭
    verificationBtn.addEventListener('click', async function() {
        if (!userId.value.trim()) {
            showError('아이디를 입력하세요');
            return;
        }
    
        if (!isValidEmail(emailInput.value.trim())) {
            showError('유효한 이메일 주소를 입력하세요');
            return;
        }
    
        try {
            this.disabled = true;
            updateButtonStyles();
    
            const response = await fetch('/send_verification_for_password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    username: userId.value.trim(),
                    email: emailInput.value.trim()
                })
            });
    
            const data = await response.json();
            if (data.valid) {
                clearError();
                showVerificationImage('verify_logo.png');
                verificationInput.value = '';
                userId.disabled = true;
                emailInput.disabled = true;
                this.disabled = true;
                verificationInput.disabled = false;  // 인증번호 입력 칸 활성화
                verificationInput.focus();  // 인증번호 입력 칸에 포커스
                verifyBtn.disabled = true;  // 인증 확인 버튼은 여전히 비활성화 상태
                updateButtonStyles();
            } else {
                showError('아이디와 이메일을 확인해주세요');
                this.disabled = false;  // 버튼 다시 활성화
                updateButtonStyles();
            }
        } catch (error) {
            console.error('Error:', error);
            showError('처리 중 오류가 발생했습니다');
            this.disabled = false;  // 버튼 다시 활성화
            updateButtonStyles();
        }
    });

    // 인증번호 입력 감지
    verificationInput.addEventListener('input', function() {
        // 숫자만 입력 가능하도록 처리
        this.value = this.value.replace(/[^0-9]/g, '');
        // 6자리로 제한
        if (this.value.length > 6) {
            this.value = this.value.slice(0, 6);
        }
        // 버튼 활성화 여부 결정
        verifyBtn.disabled = this.value.length !== 6;
        updateButtonStyles();
    });

    // 인증번호 확인
    verifyBtn.addEventListener('click', async function() {
        try {
            this.disabled = true;
            updateButtonStyles();

            const response = await fetch('/verify_code_for_password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    code: verificationInput.value.trim()
                })
            });
    
            const data = await response.json();
            if (data.valid) {
                clearError();
                showVerificationImage('verify_num_logo.png');
                verificationInput.disabled = true;
                submitBtn.disabled = false;
                updateButtonStyles();
            } else {
                showError(data.message || '인증번호가 일치하지 않습니다');
                this.disabled = false;
                updateButtonStyles();
            }
        } catch (error) {
            showError('인증번호 확인 중 오류가 발생했습니다');
            this.disabled = false;
            updateButtonStyles();
        }
    });

    // 비밀번호 변경하기 버튼 클릭
    submitBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (this.disabled) {
            showError('모든 인증 절차를 완료해주세요');
            return;
        }
        window.location.href = '/reset_password/';
    });

    // 폼 제출 이벤트
    findPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!verificationInput.disabled) {
            showError('이메일 인증을 완료해주세요');
            return;
        }
        this.submit();
    });
});

// CSRF 토큰 가져오기
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// 인증 이미지 표시 함수
function showVerificationImage(imageName, message) {
    const existingImg = document.querySelector('.verification-image');
    if (existingImg) {
        existingImg.remove();
    }

    const img = document.createElement('img');
    img.src = `/static/users/images/${imageName}`;
    img.className = 'verification-image';
    img.style.position = 'fixed';
    img.style.top = '50%';
    img.style.left = '50%';
    img.style.transform = 'translate(-50%, -50%)';
    img.style.zIndex = '1000';
    img.style.width = '300px';
    img.style.height = 'auto';
    document.body.appendChild(img);    
    setTimeout(() => {
        img.remove();
    }, 2000);
}
