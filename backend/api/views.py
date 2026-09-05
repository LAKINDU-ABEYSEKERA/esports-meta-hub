# backend/api/views.py

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.decorators import action
from pgvector.django import CosineDistance

from .models import Weapon, Attachment, Loadout, ai_model
from .serializers import WeaponSerializer, AttachmentSerializer, LoadoutSerializer
from .permissions import IsOwnerOrReadOnly


class WeaponViewSet(viewsets.ModelViewSet):
    queryset = Weapon.objects.all()
    serializer_class = WeaponSerializer


class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer


class LoadoutViewSet(viewsets.ModelViewSet):
    queryset = Loadout.objects.all()
    serializer_class = LoadoutSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        # AI Vector generation is safely handled in models.py save()
        serializer.save(creator=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Returns the authenticated user's personal loadouts, ordered by most recent.
        """
        loadouts = Loadout.objects.filter(creator=request.user).order_by('-created_at')
        results = []
        for loadout in loadouts:
            results.append({
                "id": loadout.id,
                "weapon_name": loadout.weapon.name,
                "category": loadout.weapon.weapon_type.name,
                "creator_username": loadout.creator.username,
                "description": loadout.tactical_description,
                "similarity": None
            })
        return Response({"results": results}, status=status.HTTP_200_OK)


class VectorSearchView(APIView):
    """
    POST /loadouts/search/
    Accepts a natural language query and returns the top 6 semantically similar loadouts.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        query = request.data.get('query')
        if not query or not isinstance(query, str) or not query.strip():
            return Response(
                {"detail": "A valid 'query' string is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Encode the query using the global SentenceTransformer model
            query_vector = ai_model.encode(query.strip()).tolist()
        except Exception as e:
            return Response(
                {"detail": f"Failed to encode query: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Retrieve top 6 loadouts ordered by cosine distance (closest first)
        loadouts = Loadout.objects.annotate(
            distance=CosineDistance('embedding', query_vector)
        ).order_by('distance')[:6]

        results = []
        for loadout in loadouts:
            similarity = 1.0 - loadout.distance
            results.append({
                "id": loadout.id,
                "weapon_name": loadout.weapon.name,
                "category": loadout.weapon.weapon_type.name,
                "creator_username": loadout.creator.username,
                "description": loadout.tactical_description,
                "similarity": round(similarity, 6)
            })

        return Response({"results": results}, status=status.HTTP_200_OK)