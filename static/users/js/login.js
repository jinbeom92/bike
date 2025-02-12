document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupButton = document.querySelector('.signup-btn');
    const errorMessageElement = document.getElementById('errorMessage');

    function showError(message) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = message ? 'block' : 'none';
        errorMessageElement.className = 'error-message';
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        showError(''); // 에러 메시지 초기화
        
        const formData = new FormData(loginForm);
        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        
        try {
            const response = await fetch('/login/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': csrftoken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            const data = await response.json();
            
            if (data.success) {
                window.location.href = data.redirect;
            } else {
                showError('아이디 또는 비밀번호가 틀립니다');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('로그인 처리 중 오류가 발생했습니다.');
        }
    });

    signupButton.addEventListener('click', function() {
        window.location.href = '/signup/';
    });
});
