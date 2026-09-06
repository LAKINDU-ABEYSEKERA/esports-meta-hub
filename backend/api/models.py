# backend/api/models.py

from django.db import models
from django.contrib.auth.models import User
from pgvector.django import VectorField, HnswIndex
from sentence_transformers import SentenceTransformer

ai_model = SentenceTransformer('all-MiniLM-L6-v2')

class WeaponCategory(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name

class Weapon(models.Model):
    name = models.CharField(max_length=100)
    weapon_type = models.ForeignKey(WeaponCategory, on_delete=models.SET_NULL, null=True, related_name='weapons')

    def __str__(self):
        return self.name

class Attachment(models.Model):
    SLOT_CHOICES = [
        ('Muzzle', 'Muzzle'),
        ('Barrel', 'Barrel'),
        ('Optic', 'Optic'),
        ('Underbarrel', 'Underbarrel'),
        ('Magazine', 'Magazine'),
        ('Stock', 'Stock'),
    ]

    name = models.CharField(max_length=100)
    slot = models.CharField(max_length=50, choices=SLOT_CHOICES)
    damage_modifier = models.FloatField(default=0.0)
    ads_modifier = models.FloatField(default=0.0)
    recoil_modifier = models.FloatField(default=0.0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['name', 'slot'], name='unique_attachment_name_slot')
        ]

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

    def save(self, *args, **kwargs):
        if self.tactical_description:
            self.embedding = ai_model.encode(self.tactical_description).tolist()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.weapon.name} by {self.creator.username}"