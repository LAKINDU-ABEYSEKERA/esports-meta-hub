# backend/api/views.py

import base64
import json
import os

from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.decorators import action
from pgvector.django import CosineDistance
from openai import OpenAI

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
    queryset = Loadout.objects.select_related('weapon__weapon_type', 'creator').prefetch_related('attachments')
    serializer_class = LoadoutSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        # AI Vector generation is handled in models.py save()
        serializer.save(creator=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Returns the authenticated user's personal loadouts, ordered by most recent,
        with attachments included.
        """
        loadouts = Loadout.objects.filter(creator=request.user)\
            .select_related('weapon__weapon_type', 'creator')\
            .prefetch_related('attachments')\
            .order_by('-created_at')

        results = []
        for loadout in loadouts:
            results.append({
                "id": loadout.id,
                "weapon_name": loadout.weapon.name,
                "category": loadout.weapon.weapon_type.name if loadout.weapon.weapon_type else "Unknown",
                "creator_username": loadout.creator.username,
                "description": loadout.tactical_description,
                "similarity": None,
                "attachments": [
                    {
                        "id": a.id,
                        "name": a.name,
                        "slot": a.slot,
                        "damage_modifier": a.damage_modifier,
                        "ads_modifier": a.ads_modifier,
                        "recoil_modifier": a.recoil_modifier,
                    }
                    for a in loadout.attachments.all()
                ]
            })
        return Response({"results": results}, status=status.HTTP_200_OK)


class VectorSearchView(APIView):
    """
    POST /loadouts/search/
    Accepts a natural language query and returns the top 6 semantically similar loadouts,
    with attachments included and safe weapon_type handling.
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
            query_vector = ai_model.encode(query.strip()).tolist()
        except Exception as e:
            return Response(
                {"detail": f"Failed to encode query: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        loadouts = Loadout.objects.annotate(
            distance=CosineDistance('embedding', query_vector)
        ).select_related('weapon__weapon_type', 'creator')\
         .prefetch_related('attachments')\
         .order_by('distance')[:6]

        results = []
        for loadout in loadouts:
            similarity = 1.0 - loadout.distance
            results.append({
                "id": loadout.id,
                "weapon_name": loadout.weapon.name,
                "category": loadout.weapon.weapon_type.name if loadout.weapon.weapon_type else "Unknown",
                "creator_username": loadout.creator.username,
                "description": loadout.tactical_description,
                "similarity": round(similarity, 6),
                "attachments": [
                    {
                        "id": a.id,
                        "name": a.name,
                        "slot": a.slot,
                        "damage_modifier": a.damage_modifier,
                        "ads_modifier": a.ads_modifier,
                        "recoil_modifier": a.recoil_modifier,
                    }
                    for a in loadout.attachments.all()
                ]
            })

        return Response({"results": results}, status=status.HTTP_200_OK)


class VisionImportView(APIView):
    """
    POST /loadouts/vision-import/
    Accepts an image file, uses GPT-4o to extract weapon and attachment names,
    then fuzzy-matches them to database IDs.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # 1. Validate file presence
        image_file = request.FILES.get('image')
        if not image_file:
            return Response(
                {"detail": "No image file provided. Use 'image' field."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Read and encode image
            image_bytes = image_file.read()
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
        except Exception as e:
            return Response(
                {"detail": f"Failed to read image: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Call OpenAI Vision (GPT-4o)
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an OCR gaming assistant. Read the screenshot and return "
                            "strictly a JSON object with keys 'weapon' and 'attachments'. "
                            "The 'weapon' value is a string, and 'attachments' is an array of strings. "
                            "Do not include any markdown formatting or code fences. "
                            "Example: {\"weapon\": \"M4A1\", \"attachments\": [\"Red Dot Sight\", \"Suppressor\"]}"
                        )
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract loadout information from this image."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=300,
                temperature=0.2,
            )
            llm_content = response.choices[0].message.content.strip()
        except Exception as e:
            return Response(
                {"detail": f"Vision API error: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        # 3. Parse JSON from LLM output
        try:
            # Remove potential code fences
            cleaned = llm_content.replace('```json', '').replace('```', '').strip()
            parsed = json.loads(cleaned)
            weapon_name = parsed.get('weapon')
            attachment_names = parsed.get('attachments', [])
            if not weapon_name or not isinstance(weapon_name, str):
                raise ValueError("Weapon not found in response")
        except Exception as e:
            return Response(
                {"detail": f"Failed to parse AI response: {str(e)}. Raw: {llm_content}"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        # 4. Fuzzy match weapon and attachments
        weapon_obj = Weapon.objects.filter(name__icontains=weapon_name.strip()).first()
        if not weapon_obj:
            return Response(
                {"detail": f"Weapon '{weapon_name}' not found in database."},
                status=status.HTTP_404_NOT_FOUND
            )

        attachment_ids = []
        for att_name in attachment_names:
            att_obj = Attachment.objects.filter(name__iexact=att_name.strip()).first()
            if not att_obj:
                att_obj = Attachment.objects.filter(name__icontains=att_name.strip()).first()
            if att_obj:
                attachment_ids.append(att_obj.id)

        return Response({
            "weapon_id": weapon_obj.id,
            "attachment_ids": attachment_ids
        }, status=status.HTTP_200_OK)