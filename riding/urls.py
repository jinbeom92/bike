from django.urls import path
from . import views

app_name = "riding"

urlpatterns = [
    path("map_main/", views.map_main_view, name="map_main"),
    path("api/sidebar-info/", views.user_sidebar_info, name="user-sidebar-info"),
    path("usage_history/", views.usage_history, name="usage_history"),
    path("mileage_history/", views.mileage_history, name="mileage_history"),
    path("start_ride/", views.start_ride, name="start_ride"),
    path("end_ride/", views.end_ride, name="end_ride"),
    path("add_mileage/", views.add_mileage, name="add_mileage"),
    path("use_mileage/", views.use_mileage, name="use_mileage"),
    path("calculate-route/", views.calculate_route, name="calculate_route"),
    path("users_info_edit/", views.users_info_edit, name="users_info_edit"),
    path("check-nickname/", views.check_nickname, name="check_nickname"),
    path("check-email/", views.check_email, name="check_email"),
    path("send-verification/", views.send_verification, name="send_verification"),
    path("verify-code/", views.verify_code, name="verify_code"),
    path("update-profile/", views.update_profile, name="update_profile"),
]
