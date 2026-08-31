# File: backend/api/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from pgvector.django import CosineDistance
from .models import Weapon, Attachment, Loadout
from .serializers import WeaponSerializer, AttachmentSerializer, LoadoutSerializer
from sentence_transformers import SentenceTransformer

local_ai = SentenceTransformer('all-MiniLM-L6-v2')

class WeaponViewSet(viewsets.ModelViewSet):
    queryset = Weapon.objects.all()
    serializer_class = WeaponSerializer

class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer

class LoadoutViewSet(viewsets.ModelViewSet):
    queryset = Loadout.objects.all()
    serializer_class = LoadoutSerializer

    def perform_create(self, serializer):
        tactical_desc = self.request.data.get('tactical_description', '')
        weapon_id = self.request.data.get('weapon')
        vector_embedding = None
        
        if tactical_desc and weapon_id:
            try:
                weapon = Weapon.objects.get(id=weapon_id)
                ai_context = f"Weapon: {weapon.name}. Strategy: {tactical_desc}"
                vector_embedding = local_ai.encode(ai_context).tolist()
            except Exception as e:
                print(f"Failed to generate AI Vector: {e}")

        serializer.save(creator=self.request.user, embedding=vector_embedding)

    # NEW: High-performance semantic search endpoint
    @action(detail=False, methods=['post'])
    def search(self, request):
        query = request.data.get('query', '')
        if not query:
            return Response([])

        # Convert the user's search bar text into a 384-D vector
        query_vector = local_ai.encode(query).tolist()

        # Database-level Cosine Distance calculation (blazing fast due to HNSW index)
        # Orders results by closest contextual match and grabs the top 10
        results = Loadout.objects.annotate(
            distance=CosineDistance('embedding', query_vector)
        ).order_by('distance')[:10]

        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)