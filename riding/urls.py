from django.urls import path
from . import views

app_name = "riding"

urlpatterns = [
    path("map_main/", views.map_main_view, name="map_main"),
    path("api/sidebar-info/", views.user_sidebar_info, name="user-sidebar-info"),
]
