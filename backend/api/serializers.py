# backend/api/serializers.py

from rest_framework import serializers
from .models import Weapon, Attachment, Loadout

class WeaponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Weapon
        fields = '__all__'

class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ['id', 'name', 'slot', 'damage_modifier', 'ads_modifier', 'recoil_modifier']

class LoadoutSerializer(serializers.ModelSerializer):
    weapon_name = serializers.CharField(source='weapon.name', read_only=True)
    match_confidence = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)
    attachment_ids = serializers.PrimaryKeyRelatedField(
        queryset=Attachment.objects.all(),
        many=True,
        write_only=True,
        required=False
    )

    class Meta:
        model = Loadout
        fields = [
            'id',
            'weapon',
            'weapon_name',
            'tactical_description',
            'match_confidence',
            'created_at',
            'attachments',
            'attachment_ids'
        ]

    def get_match_confidence(self, obj):
        if hasattr(obj, 'distance') and obj.distance is not None:
            score = (1 - (obj.distance / 2)) * 100
            return f"{round(score, 1)}%"
        return None

    def create(self, validated_data):
        attachment_ids = validated_data.pop('attachment_ids', [])
        loadout = Loadout.objects.create(**validated_data)
        loadout.attachments.set(attachment_ids)
        return loadout

    def update(self, instance, validated_data):
        attachment_ids = validated_data.pop('attachment_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if attachment_ids is not None:
            instance.attachments.set(attachment_ids)
        return instance