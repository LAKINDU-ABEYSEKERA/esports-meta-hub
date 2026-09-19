import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import WeaponCategory, Weapon, Loadout

def seed():
    admin = User.objects.filter(username='admin').first()
    if not admin:
        print("Admin user not found. Please create superuser first.")
        return

    # 1. Weapon Categories
    categories = {
        'Sniper Rifle': WeaponCategory.objects.get_or_create(name='Sniper Rifle')[0],
        'SMG': WeaponCategory.objects.get_or_create(name='SMG')[0],
        'Assault Rifle': WeaponCategory.objects.get_or_create(name='Assault Rifle')[0],
        'Shotgun': WeaponCategory.objects.get_or_create(name='Shotgun')[0],
    }

    # 2. Weapons
    weapons = {
        'M700': Weapon.objects.get_or_create(name='M700', weapon_type=categories['Sniper Rifle'])[0],
        'Kar98k': Weapon.objects.get_or_create(name='Kar98k', weapon_type=categories['Sniper Rifle'])[0],
        'MP7': Weapon.objects.get_or_create(name='MP7', weapon_type=categories['SMG'])[0],
        'Vector': Weapon.objects.get_or_create(name='Vector', weapon_type=categories['SMG'])[0],
        'M4A1': Weapon.objects.get_or_create(name='M4A1', weapon_type=categories['Assault Rifle'])[0],
        'Origin 12': Weapon.objects.get_or_create(name='Origin 12', weapon_type=categories['Shotgun'])[0],
    }

    # 3. Loadouts (Designed for semantic spectrum testing)
    loadout_data = [
        {
            'weapon': weapons['Kar98k'],
            'description': 'High-precision marksman sniper rifle setup with extreme bullet velocity, variable 8x scope, and bipod for dedicated long-range recon.'
        },
        {
            'weapon': weapons['M700'],
            'description': 'Lightweight aggressive quick-scope sniper build tuned for fast ADS handling, lightweight chassis, and mid-range target acquisition.'
        },
        {
            'weapon': weapons['M4A1'],
            'description': 'Versatile all-around assault rifle configuration engineered for moderate recoil control, suppressive fire, and stable medium-distance engagements.'
        },
        {
            'weapon': weapons['MP7'],
            'description': 'Ultra-fast mobility submachine gun setup optimized for rapid sprint-to-fire speed, 50-round drum magazine, and tight hip-fire accuracy in close quarters.'
        },
        {
            'weapon': weapons['Vector'],
            'description': 'Point-blank CQB room sweeper with maximum cycling rate, laser sight, and compensator to shred enemies in tight indoor corridors.'
        },
        {
            'weapon': weapons['Origin 12'],
            'description': 'Heavy breach shotgun setup with extended drum mag and choke designed strictly for clearing interior buildings and heavy close-range pressure.'
        }
    ]

    print("Generating vector embeddings and seeding loadouts...")
    for item in loadout_data:
        loadout, created = Loadout.objects.get_or_create(
            creator=admin,
            weapon=item['weapon'],
            tactical_description=item['description']
        )
        status = "Created" if created else "Existing"
        print(f"[{status}] {loadout.weapon.name} -> Vector Dimension: {len(loadout.embedding)}")

    print("\nDatabase seeded successfully!")

if __name__ == '__main__':
    seed()