from django.contrib import admin
from .models import Weapon, Attachment, Loadout

admin.site.register(Weapon)
admin.site.register(Attachment)
admin.site.register(Loadout)