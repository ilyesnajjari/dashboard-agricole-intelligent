import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.coreutils.weather_service import update_all_cities, get_current_season_start_year
from apps.coreutils.models import FrostSeason

def test_frost_calculation():
    print(f"Current season start year: {get_current_season_start_year()}")
    print("Updating frost hours for all cities...")
    
    try:
        results = update_all_cities()
        print(f"Success: True")
        
        msg_parts = []
        for city, hours in results.items():
            msg_parts.append(f"{city}: {hours}h")
        print(f"Message: {', '.join(msg_parts)}")
        
        # Verify DB
        print("Stored in DB:")
        season = get_current_season_start_year()
        for obj in FrostSeason.objects.filter(season_start_year=season):
            print(obj)
            
    except Exception as e:
        print(f"Success: False")
        print(f"Error: {e}")

if __name__ == "__main__":
    test_frost_calculation()
