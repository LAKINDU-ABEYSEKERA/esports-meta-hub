# File: backend/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WeaponViewSet, LoadoutViewSet

router = DefaultRouter()
router.register(r'weapons', WeaponViewSet)
router.register(r'loadouts', LoadoutViewSet)

urlpatterns = [
    path('', include(router.urls)),
]