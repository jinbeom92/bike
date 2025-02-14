from django.contrib import admin
from .models import RideHistory, MileageHistory


@admin.register(RideHistory)
class RideHistoryAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "ride_date",
        "usage_time",
        "distance",
        "calories",
        "frequent_route",
    )
    fields = (
        "user",
        "ride_date",
        "ride_start_time",
        "ride_end_time",
        "usage_time",
        "distance",
        "calories",
        "frequent_route",
    )


@admin.register(MileageHistory)
class MileageHistoryAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "transaction_date",
        "transaction_type",
        "amount",
        "description",
    )
    fields = ("user", "transaction_date", "transaction_type", "amount", "description")
