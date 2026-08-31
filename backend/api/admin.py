# File: backend/api/admin.py
from django.contrib import admin
from .models import WeaponCategory, Weapon, Attachment, Loadout

admin.site.register(WeaponCategory)
admin.site.register(Weapon)
admin.site.register(Attachment)
admin.site.register(Loadout)