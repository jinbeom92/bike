// 사이드바
document.addEventListener("DOMContentLoaded", function () {
    // 사이드바 관련 요소 선택
    const menuButton = document.getElementById("menu-button");
    const sidebar = document.getElementById("sidebar");

    if (!menuButton || !sidebar) {
        console.error("메뉴 버튼 또는 사이드바 요소를 찾을 수 없습니다.");
        return;
    }

    // 메뉴 버튼 클릭 시 사이드바 열기
    menuButton.addEventListener("click", function (event) {
        event.stopPropagation(); // 부모 요소로의 이벤트 전파 방지
        sidebar.classList.add("active"); // 사이드바 활성화
    });

    // 외부 클릭 시 사이드바 닫기
    document.addEventListener("click", function (event) {
        if (!sidebar.contains(event.target) && !menuButton.contains(event.target)) {
            sidebar.classList.remove("active"); // 사이드바 닫기
        }
    });
});