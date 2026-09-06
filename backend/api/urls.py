from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WeaponViewSet, AttachmentViewSet, LoadoutViewSet, VectorSearchView

router = DefaultRouter()
router.register(r'weapons', WeaponViewSet)
router.register(r'attachments', AttachmentViewSet)
router.register(r'loadouts', LoadoutViewSet)

urlpatterns = [
    # Custom endpoint MUST be placed before the router to prevent "search" from being treated as an ID
    path('loadouts/search/', VectorSearchView.as_view(), name='loadout-vector-search'),
    path('', include(router.urls)),
]