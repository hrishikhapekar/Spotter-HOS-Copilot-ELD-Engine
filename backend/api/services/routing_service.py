import math
import requests
from typing import Dict, List, Tuple, Any

# Pre-populated freight hubs across US for instant, reliable fallback and fast lookups
US_FREIGHT_HUBS = {
    "atlanta, ga": {"lat": 33.7490, "lng": -84.3880, "name": "Atlanta, GA"},
    "atlanta": {"lat": 33.7490, "lng": -84.3880, "name": "Atlanta, GA"},
    "chicago, il": {"lat": 41.8781, "lng": -87.6298, "name": "Chicago, IL"},
    "chicago": {"lat": 41.8781, "lng": -87.6298, "name": "Chicago, IL"},
    "dallas, tx": {"lat": 32.7767, "lng": -96.7970, "name": "Dallas, TX"},
    "dallas": {"lat": 32.7767, "lng": -96.7970, "name": "Dallas, TX"},
    "fort worth, tx": {"lat": 32.7555, "lng": -97.3308, "name": "Fort Worth, TX"},
    "houston, tx": {"lat": 29.7604, "lng": -95.3698, "name": "Houston, TX"},
    "houston": {"lat": 29.7604, "lng": -95.3698, "name": "Houston, TX"},
    "indianapolis, in": {"lat": 39.7684, "lng": -86.1581, "name": "Indianapolis, IN"},
    "indianapolis": {"lat": 39.7684, "lng": -86.1581, "name": "Indianapolis, IN"},
    "los angeles, ca": {"lat": 34.0522, "lng": -118.2437, "name": "Los Angeles, CA"},
    "los angeles": {"lat": 34.0522, "lng": -118.2437, "name": "Los Angeles, CA"},
    "memphis, tn": {"lat": 35.1495, "lng": -90.0490, "name": "Memphis, TN"},
    "memphis": {"lat": 35.1495, "lng": -90.0490, "name": "Memphis, TN"},
    "nashville, tn": {"lat": 36.1627, "lng": -86.7816, "name": "Nashville, TN"},
    "new york, ny": {"lat": 40.7128, "lng": -74.0060, "name": "New York, NY"},
    "new york": {"lat": 40.7128, "lng": -74.0060, "name": "New York, NY"},
    "newark, nj": {"lat": 40.7357, "lng": -74.1724, "name": "Newark, NJ"},
    "philadelphia, pa": {"lat": 39.9526, "lng": -75.1652, "name": "Philadelphia, PA"},
    "phoenix, az": {"lat": 33.4484, "lng": -112.0740, "name": "Phoenix, AZ"},
    "richmond, va": {"lat": 37.5407, "lng": -77.4360, "name": "Richmond, VA"},
    "seattle, wa": {"lat": 47.6062, "lng": -122.3321, "name": "Seattle, WA"},
    "denver, co": {"lat": 39.7392, "lng": -104.9903, "name": "Denver, CO"},
    "kansas city, mo": {"lat": 39.0997, "lng": -94.5786, "name": "Kansas City, MO"},
    "st. louis, mo": {"lat": 38.6270, "lng": -90.1994, "name": "St. Louis, MO"},
    "salt lake city, ut": {"lat": 40.7608, "lng": -111.8910, "name": "Salt Lake City, UT"},
    "columbus, oh": {"lat": 39.9612, "lng": -82.9988, "name": "Columbus, OH"},
    "cincinnati, oh": {"lat": 39.1031, "lng": -84.5120, "name": "Cincinnati, OH"},
    "charlotte, nc": {"lat": 35.2271, "lng": -80.8431, "name": "Charlotte, NC"},
    "jacksonville, fl": {"lat": 30.3322, "lng": -81.6557, "name": "Jacksonville, FL"},
    "miami, fl": {"lat": 25.7617, "lng": -80.1918, "name": "Miami, FL"},
    "oklahoma city, ok": {"lat": 35.4676, "lng": -97.5164, "name": "Oklahoma City, OK"},
    "omaha, ne": {"lat": 41.2565, "lng": -95.9345, "name": "Omaha, NE"},
    "minneapolis, mn": {"lat": 44.9778, "lng": -93.2650, "name": "Minneapolis, MN"},
    "albuquerque, nm": {"lat": 35.0844, "lng": -106.6504, "name": "Albuquerque, NM"},
    "el paso, tx": {"lat": 31.7619, "lng": -106.4850, "name": "El Paso, TX"},
    "detroit, mi": {"lat": 42.3314, "lng": -83.0458, "name": "Detroit, MI"},
    "portland, or": {"lat": 45.5152, "lng": -122.6784, "name": "Portland, OR"},
    "san antonio, tx": {"lat": 29.4241, "lng": -98.4936, "name": "San Antonio, TX"},
    "fredericksburg, va": {"lat": 38.3032, "lng": -77.4605, "name": "Fredericksburg, VA"},
    "baltimore, md": {"lat": 39.2904, "lng": -76.6122, "name": "Baltimore, MD"},
    "cherry hill, nj": {"lat": 39.9348, "lng": -75.0307, "name": "Cherry Hill, NJ"},
}

def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8  # Earth radius in miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def geocode_location(query: str) -> Dict[str, Any]:
    clean_q = query.strip().lower()
    if clean_q in US_FREIGHT_HUBS:
        return US_FREIGHT_HUBS[clean_q]
    
    # Check partial match
    for key, val in US_FREIGHT_HUBS.items():
        if clean_q == key or clean_q in key or key in clean_q:
            return {"lat": val["lat"], "lng": val["lng"], "name": query.strip()}

    # Try OpenStreetMap Nominatim
    try:
        url = "https://nominatim.openstreetmap.org/search"
        headers = {"User-Agent": "FMCSA-ELD-TripPlanner/1.0 (contact@example.com)"}
        params = {"q": query, "format": "json", "limit": 1}
        resp = requests.get(url, params=params, headers=headers, timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 0:
                return {
                    "lat": float(data[0]["lat"]),
                    "lng": float(data[0]["lon"]),
                    "name": data[0].get("display_name", query)
                }
    except Exception:
        pass

    # Fallback to Chicago if completely unrecognized
    return {"lat": 41.8781, "lng": -87.6298, "name": query.strip()}

def get_route_between(p1: Dict[str, float], p2: Dict[str, float]) -> Dict[str, Any]:
    """
    Attempts to fetch route from OSRM public API.
    Falls back to interpolated great-circle road curve if OSRM is unavailable.
    """
    lon1, lat1 = p1["lng"], p1["lat"]
    lon2, lat2 = p2["lng"], p2["lat"]

    try:
        osrm_url = f"https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson"
        resp = requests.get(osrm_url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == "Ok" and len(data.get("routes", [])) > 0:
                route = data["routes"][0]
                distance_meters = route["distance"]
                duration_seconds = route["duration"]
                coordinates = route["geometry"]["coordinates"]  # [[lon, lat], ...]
                
                distance_miles = distance_meters * 0.000621371
                driving_hours = duration_seconds / 3600.0

                # Convert coords to [[lat, lng], ...]
                lat_lng_coords = [[c[1], c[0]] for c in coordinates]
                return {
                    "distance_miles": round(distance_miles, 1),
                    "driving_hours": round(driving_hours, 2),
                    "coordinates": lat_lng_coords
                }
    except Exception:
        pass

    # Fallback highway distance estimation (haversine * 1.18 road winding factor)
    crow_miles = haversine_miles(lat1, lon1, lat2, lon2)
    road_miles = max(1.0, crow_miles * 1.18)
    avg_speed = 58.0  # standard commercial truck interstate average
    driving_hours = road_miles / avg_speed

    # Interpolate intermediate coordinates for map visualization
    num_steps = max(5, int(road_miles / 25))
    coords = []
    for i in range(num_steps + 1):
        t = i / float(num_steps)
        lat = lat1 + t * (lat2 - lat1)
        lng = lon1 + t * (lon2 - lon1)
        coords.append([round(lat, 5), round(lng, 5)])

    return {
        "distance_miles": round(road_miles, 1),
        "driving_hours": round(driving_hours, 2),
        "coordinates": coords
    }
