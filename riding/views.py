from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .forms import MapForm


@login_required
def map_main_view(request):
    form = MapForm(request.POST or None)
    nickname = request.user.profile.nickname
    riding_stats = {"distance": "14.50", "speed": "8.00", "mileage": "800"}

    context = {
        "form": form,
        "nickname": nickname,
        "riding_stats": riding_stats,
        "preferred_station": request.user.profile.preferred_station,
    }

    return render(request, "riding/map_main.html", context)
