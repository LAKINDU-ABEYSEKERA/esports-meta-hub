# backend/api/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WeaponViewSet,
    AttachmentViewSet,          # Re-added to restore attachment CRUD
    LoadoutViewSet,
    VectorSearchView,
    VisionImportView,
)

router = DefaultRouter()
router.register(r'weapons', WeaponViewSet)
router.register(r'attachments', AttachmentViewSet)   # CRITICAL: re-register attachments
router.register(r'loadouts', LoadoutViewSet)

urlpatterns = [
    # Custom endpoints MUST be placed before the router to prevent them from being treated as an ID
    path('loadouts/search/', VectorSearchView.as_view(), name='loadout-vector-search'),
    path('loadouts/vision-import/', VisionImportView.as_view(), name='loadout-vision-import'),
    path('', include(router.urls)),
]