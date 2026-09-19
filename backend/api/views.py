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

import httpx



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
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        image_file = request.FILES.get('image')
        if not image_file:
            return Response(
                {"detail": "No image file provided. Use 'image' field."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if image_file.size > 5 * 1024 * 1024:
            return Response(
                {"detail": "Image file too large. Maximum size is 5MB."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            image_bytes = image_file.read()
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
        except Exception as e:
            return Response(
                {"detail": f"Failed to read image: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            import os
            api_key = os.environ.get('GEMINI_API_KEY')

        if not api_key:
            return Response(
                {"detail": "GEMINI_API_KEY is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Dynamically determine MIME type so PNG, JPG, or WEBP screenshots pass validation
        mime_type = getattr(image_file, 'content_type', None) or "image/jpeg"
        filename = (getattr(image_file, 'name', '') or '').lower()
        if filename.endswith(".png"):
            mime_type = "image/png"
        elif filename.endswith(".webp"):
            mime_type = "image/webp"
        elif filename.endswith((".jpg", ".jpeg")):
            mime_type = "image/jpeg"

        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"
        headers = {
            "x-goog-api-key": api_key.strip(),
            "Content-Type": "application/json"
        }
        payload = {
            "contents": [{
                "parts": [
                    {
                        "text": (
                            "You are an OCR gaming assistant. Read the screenshot and return "
                            "strictly a raw JSON object with keys 'weapon' and 'attachments'. "
                            "The 'weapon' value is a string, and 'attachments' is an array of strings."
                        )
                    },
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64_image
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 300,
                "responseMimeType": "application/json"
            }
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                llm_content = data['candidates'][0]['content']['parts'][0]['text']
        except Exception as e:
            return Response(
                {"detail": f"Gemini Vision API error: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        try:
            parsed = json.loads(llm_content.strip())
            weapon_name = parsed.get('weapon')
            attachment_names = parsed.get('attachments', [])
            if not weapon_name or not isinstance(weapon_name, str):
                raise ValueError("Weapon name missing from OCR result")
        except Exception as e:
            return Response(
                {"detail": f"Failed to parse OCR response: {str(e)}"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        weapon_obj = Weapon.objects.filter(name__iexact=weapon_name.strip()).first()
        if not weapon_obj:
            weapon_obj = Weapon.objects.filter(name__icontains=weapon_name.strip()).first()

        if not weapon_obj:
            return Response(
                {"detail": f"Identified weapon '{weapon_name}' does not match any weapons in the database."},
                status=status.HTTP_404_NOT_FOUND
            )

        attachment_ids = []
        for att_name in attachment_names:
            if not isinstance(att_name, str) or not att_name.strip():
                continue
            att = Attachment.objects.filter(name__iexact=att_name.strip()).first()
            if not att:
                att = Attachment.objects.filter(name__icontains=att_name.strip()).first()
            if att:
                attachment_ids.append(att.id)

        return Response({
            "weapon_id": weapon_obj.id,
            "attachment_ids": attachment_ids
        }, status=status.HTTP_200_OK)