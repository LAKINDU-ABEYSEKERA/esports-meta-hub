# File: backend/api/models.py
from django.db import models
from django.contrib.auth.models import User
from pgvector.django import VectorField ,HnswIndex

class Weapon(models.Model):
    name = models.CharField(max_length=100)
    weapon_type = models.CharField(max_length=50)

    def __str__(self):
        return self.name

class Attachment(models.Model):
    name = models.CharField(max_length=100)
    slot = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.name} ({self.slot})"

class Loadout(models.Model):
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='loadouts')
    weapon = models.ForeignKey(Weapon, on_delete=models.CASCADE, related_name='loadouts')
    attachments = models.ManyToManyField(Attachment, blank=True)
    tactical_description = models.TextField(help_text="LLM generated summary of the build")
    embedding = VectorField(dimensions=384, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            HnswIndex(
                name='loadout_embedding_index',
                fields=['embedding'],
                m=16,
                ef_construction=64,
                opclasses=['vector_cosine_ops']
            )
        ]

    def __str__(self):
        return f"{self.weapon.name} by {self.creator.username}"