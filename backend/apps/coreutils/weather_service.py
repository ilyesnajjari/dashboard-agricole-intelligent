import requests
from datetime import datetime, date
from django.utils import timezone
from .models import FrostSeason

CITIES = {
    'Monteux': {'lat': 44.0333, 'lon': 4.9833},
    'Pernes-les-Fontaines': {'lat': 43.9997, 'lon': 5.0594},
    'Carpentras': {'lat': 44.0550, 'lon': 5.0481}
}

def get_current_season_start_year():
    """
    Returns the start year of the current frost season.
    Season runs from Nov 1st to Mar 31st.
    If we are in Jan-Mar 2026, season started in 2025.
    If we are in Nov-Dec 2025, season started in 2025.
    """
    today = date.today()
    if today.month < 11:
        return today.year - 1
    return today.year

def update_frost_hours(city_name):
    """
    Updates the frost hours for a specific city for the current season.
    Fetches hourly data from Open-Meteo for the period Nov 1st to now (or Mar 31st).
    """
    if city_name not in CITIES:
        raise ValueError(f"Unknown city: {city_name}")

    coords = CITIES[city_name]
    start_year = get_current_season_start_year()
    
    # Season start: Nov 1st of start_year
    start_date = date(start_year, 11, 1)
    
    # Season end: Mar 31st of next year, or today if sooner
    end_of_season = date(start_year + 1, 3, 31)
    today = date.today()
    
    end_date = min(today, end_of_season)
    
    # If we are before the season starts (e.g. Oct), do nothing
    if today < start_date:
        return 0.0

    # Fetch data from Open-Meteo
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": coords['lat'],
        "longitude": coords['lon'],
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "hourly": "temperature_2m",
        "timezone": "Europe/Paris"
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        hourly_temps = data.get("hourly", {}).get("temperature_2m", [])
        
        # Count hours < 7.5°C
        frost_hours = sum(1 for temp in hourly_temps if temp is not None and temp < 7.5)
        
        # Update or create DB record
        obj, created = FrostSeason.objects.update_or_create(
            city=city_name,
            season_start_year=start_year,
            defaults={'frost_hours': float(frost_hours)}
        )
        
        return float(frost_hours)
        
    except Exception as e:
        print(f"Error updating frost hours for {city_name}: {e}")
        return 0.0

def update_all_cities():
    """Updates frost hours for all configured cities."""
    results = {}
    for city in CITIES:
        hours = update_frost_hours(city)
        results[city] = hours
    return results

def calculate_frost_hours(city_name, start_date, end_date=None):
    """
    Calculates frost hours for a specific city and date range.
    Useful for tracking cold hours since a specific planting date.
    """
    if city_name not in CITIES:
        raise ValueError(f"Unknown city: {city_name}")

    coords = CITIES[city_name]
    if end_date is None:
        end_date = date.today()

    # Ensure dates are date objects
    if isinstance(start_date, datetime):
        start_date = start_date.date()
    if isinstance(end_date, datetime):
        end_date = end_date.date()

    # Fetch data from Open-Meteo Archive
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": coords['lat'],
        "longitude": coords['lon'],
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "hourly": "temperature_2m",
        "timezone": "Europe/Paris"
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        hourly_temps = data.get("hourly", {}).get("temperature_2m", [])
        
        # Count hours < 7.5°C
        frost_hours = sum(1 for temp in hourly_temps if temp is not None and temp < 7.5)
        
        return float(frost_hours)
        
    except Exception as e:
        print(f"Error calculating frost hours for {city_name}: {e}")
        return 0.0
