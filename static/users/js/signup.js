// 클라이언트 검증
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소 선택
    const signupForm = document.getElementById('signupForm');
    const usernameInput = document.getElementById('userId');
    const passwordInput = document.getElementById('userPw');
    const passwordConfirmInput = document.getElementById('userPwCheck');
    const nicknameInput = document.getElementById('userNickname');
    const birthInput = document.getElementById('ssnFirst');
    const birthEndInput = document.getElementById('ssnLast');
    const emailInput = document.getElementById('userEmail');
    const verificationBtn = document.querySelector('.verify-btn');
    const verificationInput = document.querySelector('.verify-input');
    const verifyBtn = document.querySelector('.email-verify-btn');
    const submitBtn = document.querySelector('.submit-btn');

    // 에러 메시지 요소 선택
    const userIdError = document.getElementById('userIdError');
    const userPwError = document.getElementById('userPwError');
    const userNickError = document.getElementById('userNickError');
    const userSsnError = document.getElementById('userssnError');
    const emailVerificationError = document.getElementById('emailVerificationError');

    // 초기 상태 설정
    verificationBtn.disabled = true;
    verificationInput.disabled = true;
    verifyBtn.disabled = true;
    submitBtn.disabled = true;

    // 페이지 로드 시 즉시 폼 유효성 검사 실행
    checkFormValidity();

    // 이메일 인증 상태 추적 변수
    let isEmailVerified = false;

    // 메시지 표시 함수
    function showMessage(element, message, isError = true) {
        element.textContent = message;
        element.style.display = message ? 'block' : 'none';
        element.style.color = isError ? 'red' : 'green';
    }

    // 유효성 검사 함수들
    function isValidEmail(email) {
        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.(com|net)$/;
        const validDomains = ['gmail.com', 'naver.com', 'daum.net', 'hanmail.net', 'nate.com', 'yahoo.com'];
        const domain = email.split('@')[1];
        return emailPattern.test(email) && validDomains.includes(domain);
    }

    function isValidUsername(username) {
        return /^[a-zA-Z0-9]{4,12}$/.test(username.trim());
    }

    function isValidPassword(password) {
        return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(password.trim());
    }

    function isValidNickname(nickname) {
        return /^[a-zA-Z0-9가-힣]{2,5}$/.test(nickname.trim());
    }

    function hasOnlyConsonantsOrVowels(str) {
        const consonants = /^[ㄱ-ㅎ]+$/;
        const vowels = /^[ㅏ-ㅣ]+$/;
        return consonants.test(str) || vowels.test(str);
    }

    function isValidBirth(birth) {
        return /^\d{6}$/.test(birth);
    }

    function isValidBirthEnd(birthEnd) {
        return /^[1-4]$/.test(birthEnd);
    }

    // 아이디 유효성 검사 및 중복 확인
    async function validateUsername() {
        showMessage(userIdError, ''); // 메시지 초기화
        const username = usernameInput.value.trim();
        if (!isValidUsername(username)) {
            if (/\s/.test(username)) {
                showMessage(userIdError, '공백은 사용할 수 없습니다');
            } else {
                showMessage(userIdError, '영문, 숫자 포함 4자 이상');
            }
            return false;
        }

        try {
            const response = await fetch('/check_username/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ username: username })
            });
            const data = await response.json();
            if (data.available) {
                showMessage(userIdError, '사용 가능한 아이디입니다', false);
                return true;
            } else {
                showMessage(userIdError, '이미 사용 중인 아이디입니다');
                return false;
            }
        } catch (error) {
            console.error('아이디 확인 중 오류:', error);
            showMessage(userIdError, '아이디 확인 중 오류가 발생했습니다');
            return false;
        }
    }

    // 비밀번호 및 비밀번호 확인 유효성 검사
    function validatePasswordAndConfirm() {
        showMessage(userPwError, ''); // 메시지 초기화

        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;

        console.log("입력된 비밀번호:", password);
        console.log("유효성 검사 결과:", isValidPassword(password));

        // 1. 비밀번호 유효성 검사
        if (!isValidPassword(password)) {
            showMessage(userPwError, '영문, 숫자, 특수문자를 포함 8자 이상');
            return false;
        }

        // 2. 비밀번호 확인 검사 (비밀번호가 유효할 때만 실행)
        if (password !== passwordConfirm) {
            showMessage(userPwError, '비밀번호가 일치하지 않습니다');
            return false;
        }

        showMessage(userPwError, '비밀번호가 일치합니다', false);
        return true;
    }

    // 닉네임 유효성 검사 및 중복 확인
    async function validateNickname() {
        showMessage(userNickError, ''); // 메시지 초기화
        const nickname = nicknameInput.value.trim();
        if (!isValidNickname(nickname)) {
            if (/\s/.test(nickname)) {
                showMessage(userNickError, '공백은 사용할 수 없습니다');
            } else if (hasOnlyConsonantsOrVowels(nickname)) {
                showMessage(userNickError, '올바르게 입력하세요');
            } else {
                showMessage(userNickError, '5자 이하여야 됩니다');
            }
            return false;
        }

        try {
            const response = await fetch('/check_nickname/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ nickname: nickname })
            });
            const data = await response.json();
            if (data.available) {
                showMessage(userNickError, '사용 가능한 닉네임입니다', false);
                return true;
            } else {
                showMessage(userNickError, '이미 사용 중인 닉네임입니다');
                return false;
            }
        } catch (error) {
            console.error('닉네임 확인 중 오류:', error);
            showMessage(userNickError, '닉네임 확인 중 오류가 발생했습니다');
            return false;
        }
    }


    // 생년월일 유효성 검사
    function validateBirth() {
        showMessage(userSsnError, ''); // 메시지 초기화
        const birth = birthInput.value.trim();
        if (!isValidBirth(birth)) {
            showMessage(userSsnError, '생년월일은 6자리 숫자여야 합니다');
            return false;
        }
        return true;
    }

    // 주민번호 뒷자리 유효성 검사 및 마스킹
    function validateAndMaskBirthEnd() {
        let value = birthEndInput.value;
        
        // 입력값이 1, 2, 3, 4 중 하나인지 확인
        if (/^[1-4]$/.test(value)) {
            birthEndInput.value = value + '******';
            showMessage(userSsnError, '생년월일이 올바릅니다', false);
            return true;
        } else {
            // 올바르지 않은 입력인 경우 값을 지우고 에러 메시지 표시
            birthEndInput.value = '';
            showMessage(userSsnError, '뒷자리 첫 번째 숫자는 1-4 사이여야 합니다');
            return false;
        }
    }

    // 이메일 유효성 검사
    function validateEmail() {
        showMessage(emailVerificationError, ''); // 메시지 초기화
        const email = emailInput.value.trim();
        if (email && isValidEmail(email)) {
            verificationBtn.disabled = false;
            verificationBtn.style.backgroundColor = '#40B59F';
            verificationBtn.style.color = '#FFF';
            return true;
        } else {
            verificationBtn.disabled = true;
            verificationBtn.style.backgroundColor = '#DDDDDD';
            verificationBtn.style.color = '#352555';
            showMessage(emailVerificationError, '유효한 이메일 주소를 입력해주세요');
            return false;
        }
    }

    // 이벤트 리스너 설정
    usernameInput.addEventListener('input', function() {
        validateUsername().then(() => checkFormValidity());
    });
    passwordInput.addEventListener('input', function() {
        validatePasswordAndConfirm();
        checkFormValidity();
    });
    passwordConfirmInput.addEventListener('input', function() {
        validatePasswordAndConfirm();
        checkFormValidity();
    });
    nicknameInput.addEventListener('input', function() {
        validateNickname().then(() => checkFormValidity());
    });
    birthInput.addEventListener('input', function() {
        validateBirth();
        checkFormValidity();
    });
    birthEndInput.addEventListener('input', function(e) {
        setTimeout(() => {
            validateAndMaskBirthEnd();
            checkFormValidity();
        }, 0);
    });
    emailInput.addEventListener('input', function() {
        validateEmail();
        checkFormValidity();
    });
    verificationInput.addEventListener('input', validateVerificationCode);

    // 포커스가 떠날 때 마스킹 유지
    birthEndInput.addEventListener('blur', function() {
        if (this.value.length === 1) {
            this.value += '******';
        }
    });

    // 포커스를 받았을 때 마스킹 해제
    birthEndInput.addEventListener('focus', function() {
        if (this.value.length === 7) {
            this.value = this.value.charAt(0);
        }
    });

    // 인증번호 유효성 검사
    function validateVerificationCode() {
        verificationInput.value = verificationInput.value.replace(/[^0-9]/g, '').slice(0, 6);
        if (verificationInput.value.length === 6) {
            verifyBtn.disabled = false;
            verifyBtn.style.backgroundColor = '#40B59F';
            verifyBtn.style.color = '#FFF';
        } else {
            verifyBtn.disabled = true;
            verifyBtn.style.backgroundColor = '#DDDDDD';
            verifyBtn.style.color = '#352555';
        }
    }

    // 이메일 인증 버튼 클릭 이벤트
    verificationBtn.addEventListener('click', async function() {
        const email = emailInput.value.trim();    
        try {
            const response = await fetch('/send_verification/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ email: email })
            });
    
            const data = await response.json();
            if (data.success) {
                showVerificationImage('verify_logo.png');
                verificationInput.value = '';
                this.disabled = true;
                this.style.backgroundColor = '#DDDDDD';
                this.style.color = '#352555'; 
                emailInput.disabled = true;
                verificationInput.disabled = false;
                verifyBtn.disabled = true;
            } else {
                showMessage(emailVerificationError, data.message || '이메일 인증 요청 중 오류가 발생했습니다');
            }
        } catch (error) {
            console.error('이메일 인증 요청 중 오류:', error);
            showMessage(emailVerificationError, '이메일 인증 요청 중 오류가 발생했습니다');
        }
    });

    // 인증번호 확인 버튼 클릭 이벤트
    verifyBtn.addEventListener('click', async function() {
        const email = emailInput.value.trim();
        const verificationCode = verificationInput.value.trim();
        
        try {
            const response = await fetch('/verify_code/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    email: email,
                    code: verificationCode
                })
            });

            const data = await response.json();
            if (data.valid) {
                showVerificationImage('verify_num_logo.png');
                verificationInput.value = '';
                this.disabled = true;
                this.style.backgroundColor = '#DDDDDD';
                this.style.color = '#352555';
                verificationInput.disabled = true;
                isEmailVerified = true;
                checkFormValidity();
            } else {
                showMessage(emailVerificationError, data.error || '인증번호가 일치하지 않습니다');
            }
        } catch (error) {
            console.error('인증번호 확인 중 오류:', error);
            showMessage(emailVerificationError, '인증번호 확인 중 오류가 발생했습니다');
        }
    });

    // 폼 제출 이벤트
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!isEmailVerified || !checkFormValidity()) {
            showMessage(emailVerificationError, '모든 필드를 올바르게 입력해주세요');
            return;
        }
    
        const formData = new FormData();
        formData.append('username', usernameInput.value);
        formData.append('password', passwordInput.value);
        formData.append('email', emailInput.value);
        formData.append('password_confirm', passwordConfirmInput.value);
        formData.append('nickname', nicknameInput.value);
        formData.append('birth', birthInput.value);
        formData.append('birth_end', birthEndInput.value.charAt(0));
    
        try {
            const response = await fetch('/signup/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });
    
            const data = await response.json();
            if (data.success) {
                showSuccessImageAndRedirect('signup.png');
            } else {
                let errorMessage = '회원가입 중 오류가 발생했습니다';
                if (data.errors) {
                    errorMessage = Object.entries(data.errors).map(([field, errors]) => 
                        `${field}: ${errors.join(', ')}`
                    ).join('\n');
                }
                showMessage(emailVerificationError, errorMessage);
            }
        } catch (error) {
            console.error('회원가입 요청 중 오류:', error);
            showMessage(emailVerificationError, '회원가입 요청 중 오류가 발생했습니다');
        }
    });

    // 폼 유효성 검사 함수
    function checkFormValidity() {
        const isUsernameValid = isValidUsername(usernameInput.value);
        const isPasswordValid = isValidPassword(passwordInput.value);
        const isPasswordConfirmValid = passwordInput.value === passwordConfirmInput.value;
        const isNicknameValid = isValidNickname(nicknameInput.value);
        const isBirthValid = isValidBirth(birthInput.value);
        const isBirthEndValid = isValidBirthEnd(birthEndInput.value.charAt(0));
        const isEmailValid = isValidEmail(emailInput.value);
    
        const isValid = isUsernameValid &&
                        isPasswordValid &&
                        isPasswordConfirmValid &&
                        isNicknameValid &&
                        isBirthValid &&
                        isBirthEndValid &&
                        isEmailValid &&
                        isEmailVerified;
    
        submitBtn.disabled = !isValid;
        submitBtn.style.backgroundColor = isValid ? '#40B59F' : '#DDDDDD';
        submitBtn.style.color = isValid ? '#FFF' : '#352555';
        
        return isValid;
    }
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

function showSuccessImageAndRedirect(imageName) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = '#FFFFFF';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '1000';

    const img = document.createElement('img');
    img.src = `/static/users/images/${imageName}`;
    img.style.maxWidth = '80%';
    img.style.maxHeight = '80%';

    overlay.appendChild(img);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function() {
        window.location.href = '/login/';
    });
}