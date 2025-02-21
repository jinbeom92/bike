from django.core.cache import cache
from django.contrib.auth.models import User


class RidingCacheManager:
    def __init__(self):
        self.cache = cache
        self.TIMEOUT = 60 * 60  # 1시간

    def save_start_point(self, user_id, marker_data):
        cache_key = f"start_point:{user_id}"
        self.cache.set(cache_key, marker_data, self.TIMEOUT)

    def save_return_point(self, user_id, marker_data):
        cache_key = f"return_point:{user_id}"
        self.cache.set(cache_key, marker_data, self.TIMEOUT)

    def get_start_point(self, user_id):
        cache_key = f"start_point:{user_id}"
        return self.cache.get(cache_key)

    def get_return_point(self, user_id):
        cache_key = f"return_point:{user_id}"
        return self.cache.get(cache_key)

    def delete_riding_data(self, user_id):
        self.cache.delete(f"start_point:{user_id}")
        self.cache.delete(f"return_point:{user_id}")
