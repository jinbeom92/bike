// 클라이언트 검증
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소 선택
    const findIdForm = document.getElementById('findIdForm');
    const emailInput = document.getElementById('email');
    const verificationBtn = document.querySelector('.verification-btn');
    const verificationInput = document.querySelector('input[name="verification_code"]');
    const verifyBtn = document.querySelector('.verify-btn');
    const resultMessage = document.querySelector('.result-message');
    const loginBtn = document.querySelector('.login-btn');
    const findPasswordBtn = document.querySelector('.find-password-btn');

    // 초기 상태 설정
    verificationBtn.disabled = true;
    verificationInput.disabled = true;
    verifyBtn.disabled = true;
    resultMessage.style.display = 'none';

    // 이메일 인증 상태 추적 변수
    let isEmailVerificationSent = false;

    // 에러 메시지 요소 생성 및 추가
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message message-container';
    findIdForm.appendChild(errorMessage);

    // 메시지 표시 함수
    function showMessage(element, message, isError = true) {
        const errorMessage = document.querySelector('.error-message');
        const resultMessage = document.querySelector('.result-message');
        
        errorMessage.style.display = 'none';
        resultMessage.style.display = 'none';
        
        if (isError) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        } else {
            resultMessage.innerHTML = message;
            resultMessage.style.display = 'block';
        }
    }

    // 이메일 유효성 검사 함수 추가
    function isValidEmail(email) {
        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.(com|net)$/;
        const validDomains = ['gmail.com', 'naver.com', 'daum.net', 'hanmail.net', 'nate.com', 'yahoo.com'];
        const domain = email.split('@')[1];
        return emailPattern.test(email) && validDomains.includes(domain);
    }

    // 이메일 입력 이벤트 리스너 설정
    emailInput.addEventListener('input', function() {
        const email = this.value.trim();
        if (email && isValidEmail(email)) {
            verificationBtn.disabled = false;
            verificationBtn.style.backgroundColor = '#40B59F';
            verificationBtn.style.color = '#FFF';
        } else {
            verificationBtn.disabled = true;
            verificationBtn.style.backgroundColor = '#DDDDDD';
            verificationBtn.style.color = '#352555';
        }
    });

    verificationInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 6);
        if (this.value.length === 6) {
            verifyBtn.disabled = false;
            verifyBtn.style.backgroundColor = '#40B59F';
            verifyBtn.style.color = '#FFF';
        } else {
            verifyBtn.disabled = true;
            verifyBtn.style.backgroundColor = '#DDDDDD';
            verifyBtn.style.color = '#352555';
        }
    });
    

    // 이메일 인증 버튼 클릭 이벤트
    verificationBtn.addEventListener('click', async function() {
        const email = emailInput.value.trim();    
        try {
            const response = await fetch('/send_verification_for_id/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ email: email })
            });
    
            const data = await response.json();
            if (data.exists) {
                showMessage(null, '', false);
                isEmailVerificationSent = true;
                showVerificationImage('verify_logo.png');
                verificationInput.value = '';
                this.disabled = true;
                this.style.backgroundColor = '#DDDDDD';
                this.style.color = '#352555'; 
                emailInput.disabled = true;
                verificationInput.disabled = false;
                verifyBtn.disabled = true;
            } else {
                showMessage(errorMessage, data.message || '등록되지 않은 이메일입니다');
            }
        } catch (error) {
            showMessage(errorMessage, '이메일 인증 중 오류가 발생했습니다');
        }
    });

    // 인증번호 확인 버튼 클릭 이벤트
    verifyBtn.addEventListener('click', async function() {
        const email = emailInput.value.trim();
        const verificationCode = verificationInput.value.trim();
        
        console.log("전송 데이터:", { email, code: verificationCode }); // 디버깅용

        try {
            const response = await fetch('/verify_code_find_id/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    email: emailInput.value,
                    code: verificationCode
                })
            });

            const data = await response.json();
            console.log("서버 응답:", data);
            if (data.valid) {
                showVerificationImage('verify_num_logo.png');
                showMessage(resultMessage, `회원님의 아이디는 다음과 같습니다.<br><span class="user-id">${data.username}</span>`, false);
                this.disabled = true;
                this.style.backgroundColor = '#DDDDDD';
                this.style.color = '#352555';
                verificationInput.disabled = true;
                verificationBtn.disabled = true;
            } else {
                showMessage(errorMessage, data.error || '인증번호가 일치하지 않습니다');
            }
        } catch (error) {
            console.error("오류 발생:", error); 
            showMessage(errorMessage, '인증번호 확인 중 오류가 발생했습니다');
        }
    });

    // 네비게이션 버튼 이벤트
    loginBtn.addEventListener('click', () => window.location.href = '/login/');
    findPasswordBtn.addEventListener('click', () => window.location.href = '/find_password/');
});

// CSRF 토큰 가져오기 함수
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
function showVerificationImage(imageName) {
    const existingImg = document.querySelector('.verification-image');
    if (existingImg) existingImg.remove();

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
    
    setTimeout(() => img.remove(), 2000);
}
