from django.db import models
from django.contrib.auth.models import User
from pgvector.django import VectorField

class Weapon(models.Model):  # <--- This is the fix
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50) # e.g., SMG, Sniper
    base_damage = models.FloatField()
    base_fire_rate = models.FloatField()
    
    def __str__(self):
        return self.name

class Attachment(models.Model):
    name = models.CharField(max_length=100)
    slot = models.CharField(max_length=50) # e.g., Muzzle, Optic
    ads_speed_modifier = models.FloatField(default=0.0)
    recoil_modifier = models.FloatField(default=0.0)

    def __str__(self):
        return f"{self.name} ({self.slot})"

class Loadout(models.Model):
    creator = models.ForeignKey(User, on_delete=models.CASCADE)
    weapon = models.ForeignKey(Weapon, on_delete=models.CASCADE)
    attachments = models.ManyToManyField(Attachment, blank=True)
    
    tactical_description = models.TextField(help_text="LLM generated summary of the build")
    
    # 1536 dimensions matches OpenAI's text-embedding-ada-002 model
    embedding = VectorField(dimensions=1536, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.weapon.name} Loadout by {self.creator.username}"