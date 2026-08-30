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
    weapon_name = serializers.CharField(source='weapon.name', read_only=True)
    creator_name = serializers.CharField(source='creator.username', read_only=True)

    class Meta:
        model = Loadout
        fields = ['id', 'creator', 'creator_name', 'weapon', 'weapon_name', 'attachments', 'tactical_description', 'created_at']
        read_only_fields = ['creator']

        