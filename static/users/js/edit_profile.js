// 클라이언트 검증
document.addEventListener('DOMContentLoaded', function() {
    const editProfileForm = document.getElementById('editProfileForm');
    
    async function sendVerificationForEmail(email) {
        const response = await fetch('/users/edit-profile/send-verification/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        return await response.json();
    }

    editProfileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(editProfileForm);
        
        try {
            const response = await fetch('/users/edit-profile/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            });

            const data = await response.json();
            
            if (response.ok) {
                alert('프로필이 수정되었습니다.');
                window.location.reload();
            } else {
                alert(data.error || '프로필 수정에 실패했습니다.');
            }
        } catch (error) {
            alert('처리 중 오류가 발생했습니다.');
        }
    });

    // 이메일 인증번호 발송 버튼 클릭 이벤트
    document.getElementById('sendEmailVerification')?.addEventListener('click', async function() {
        const email = document.getElementById('email').value;
        if (!email) {
            alert('이메일을 입력해주세요.');
            return;
        }

        try {
            const result = await sendVerificationForEmail(email);
            if (result.success) {
                alert('인증번호가 발송되었습니다.');
            } else {
                alert(result.error || '인증번호 발송에 실패했습니다.');
            }
        } catch (error) {
            alert('처리 중 오류가 발생했습니다.');
        }
    });
});
