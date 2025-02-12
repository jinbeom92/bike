document.addEventListener('DOMContentLoaded', function() {
    // 필요한 DOM 요소들을 선택합니다.
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordMessage = document.getElementById('passwordMessage');
    const submitBtn = document.querySelector('.submit-btn');

    // 버튼 비활성화
    submitBtn.disabled = true;

    // 비밀번호의 기본적인 유효성을 검사합니다 (최소 8자).
    function isValidPassword(password) {
        return password.length >= 8;
    }

    // 메시지를 표시하는 함수입니다.
    function showMessage(message, isError = true) {
        passwordMessage.textContent = message;
        passwordMessage.style.display = message ? 'block' : 'none';
        passwordMessage.style.color = isError ? 'red' : 'green';
    }

    // 비밀번호 유효성을 검사하고 메시지를 표시하는 함수입니다.
    function validatePasswords() {
        const password = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password && confirmPassword) {
            if (!isValidPassword(password)) {
                showMessage('비밀번호는 최소 8자 이상이어야 합니다');
                return false;
            } else if (password !== confirmPassword) {
                showMessage('비밀번호가 일치하지 않습니다');
                return false;
            } else {
                showMessage('비밀번호가 일치합니다', false);
                return true;
            }
        } else {
            showMessage('');
            return false;
        }
    }

    // 폼의 유효성을 검사하고 제출 버튼의 활성화 여부를 결정합니다.
    function checkFormValidity() {
        const isValid = validatePasswords();
        submitBtn.disabled = !isValid;
        
        if (submitBtn.disabled) {
            submitBtn.style.backgroundColor = '#DDDDDD';
            submitBtn.style.color = '#352555';
        } else {
            submitBtn.style.backgroundColor = '#40B59F';
            submitBtn.style.color = '#FFF';
        }
    }

    // 비밀번호 입력 필드에 이벤트 리스너를 추가합니다.
    newPasswordInput.addEventListener('input', checkFormValidity);
    confirmPasswordInput.addEventListener('input', checkFormValidity);

    // 폼 제출 이벤트를 처리합니다.
    resetPasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submitted');

        if (submitBtn.disabled) {
            console.log('Form is not valid, submission prevented');
            return;
        }

        const formData = new FormData(this);

        try {
            // 서버에 비밀번호 재설정 요청을 보냅니다.
            const response = await fetch('/reset_password/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });

            console.log('Server response:', response);

            const data = await response.json();
            console.log('Response data:', data);

            if (data.success) {
                // 성공 시 이미지를 표시합니다.
                const imageName = 'password.png';
                const img = document.createElement('img');
                img.src = `/static/users/images/${imageName}`;
                img.className = 'verification-image';
                img.style.position = 'fixed';
                img.style.top = '50%';
                img.style.left = '50%';
                img.style.backgroundColor = '#FFFFFF';
                img.style.transform = 'translate(-50%, -50%)';
                img.style.zIndex = '1000';
                img.style.width = '300px';
                img.style.height = 'auto';
                document.body.appendChild(img);

                // 클릭 이벤트를 추가하여 로그인 페이지로 리다이렉트합니다.
                document.body.addEventListener('click', function() {
                    window.location.href = '/login/';
                });
            } else {
                // 오류 발생 시 오류 메시지를 표시합니다.
                if (data.errors) {
                    const errors = JSON.parse(data.errors);
                    if (errors.new_password) {
                        showMessage(errors.new_password[0]);
                    }
                } else if (data.message) {
                    showMessage(data.message);
                } else {
                    showMessage('비밀번호 변경 중 오류가 발생했습니다');
                }
            }
        } catch (error) {
            console.error('비밀번호 재설정 중 오류:', error);
            showMessage('비밀번호 재설정 중 오류가 발생했습니다');
        }
    });

    // CSRF 토큰을 쿠키에서 가져오는 함수입니다.
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
});
