# File: backend/api/serializers.py
from rest_framework import serializers
from .models import Weapon, Attachment, Loadout

class WeaponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Weapon
        fields = '__all__'

class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = '__all__'

class LoadoutSerializer(serializers.ModelSerializer):
    # Dynamically fetch the actual weapon name
    weapon_name = serializers.CharField(source='weapon.name', read_only=True)
    # Custom field to calculate the AI match percentage
    match_confidence = serializers.SerializerMethodField()

    class Meta:
        model = Loadout
        fields = ['id', 'weapon', 'weapon_name', 'tactical_description', 'match_confidence', 'created_at']

    def get_match_confidence(self, obj):
        # pgvector creates a 'distance' annotation during our search
        if hasattr(obj, 'distance') and obj.distance is not None:
            # Cosine distance ranges from 0 (perfect) to 2 (opposite).
            # This formula converts that distance into a clean 0-100% score.
            score = (1 - (obj.distance / 2)) * 100
            return f"{round(score, 1)}%"
        return None