from rest_framework import viewsets
from .models import Weapon, Attachment, Loadout
from .serializers import WeaponSerializer, AttachmentSerializer, LoadoutSerializer
import openai
from django.conf import settings

# Initialize the OpenAI Client securely
client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

class LoadoutViewSet(viewsets.ModelViewSet):
    queryset = Loadout.objects.all()
    serializer_class = LoadoutSerializer

    def perform_create(self, serializer):
        tactical_desc = self.request.data.get('tactical_description', '')
        weapon_id = self.request.data.get('weapon')
        
        vector_embedding = None
        
        if tactical_desc and weapon_id:
            try:
                # Retrieve the weapon name for better AI context
                weapon = Weapon.objects.get(id=weapon_id)
                ai_context = f"Weapon: {weapon.name}. Strategy: {tactical_desc}"
                
                # Generate the 1,536-dimension vector
                response = client.embeddings.create(
                    input=ai_context,
                    model="text-embedding-3-small"
                )
                vector_embedding = response.data[0].embedding
            except Exception as e:
                print(f"Failed to generate AI Vector: {e}")

        # Save the loadout, injecting the logged-in user and the new AI vector
        serializer.save(
            creator=self.request.user, 
            embedding=vector_embedding
        )