document.addEventListener("DOMContentLoaded", function () {
    // 사이드바 토글 기능
    const menuButton = document.getElementById("menu-button");
    const sidebar = document.getElementById("sidebar");

    menuButton.addEventListener("click", function () {
        sidebar.classList.toggle("open");
    });

    // 시간 선택 드롭업 토글 기능
    const timeButton = document.getElementById("time-button");
    const timeDropdown = document.getElementById("time-dropdown");

    timeButton.addEventListener("click", function () {
        timeDropdown.classList.toggle("visible");
    });

    // 시간 선택 시 드롭업 자동 닫기
    const timeItems = document.querySelectorAll(".time-selection__item");

    timeItems.forEach((item) => {
        item.addEventListener("click", function () {
            timeDropdown.classList.remove("visible");
            alert(`선택된 시간: ${this.textContent}`);
        });
    });

    // 드롭업 바깥 클릭 시 닫기 기능
    document.addEventListener("click", function (event) {
        if (!timeDropdown.contains(event.target) && !timeButton.contains(event.target)) {
            timeDropdown.classList.remove("visible");
        }

        if (!sidebar.contains(event.target) && !menuButton.contains(event.target)) {
            sidebar.classList.remove("open");
        }
    });
});
