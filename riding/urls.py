from django.urls import path
from . import views

app_name = "riding"

urlpatterns = [
    path("map_main/", views.map_main_view, name="map_main"),
]
