import math

# Curated list of mock places along the highway route (e.g., Mumbai-Pune Expressway area)
# Coordinated around Lonavala (approx. 18.7480, 73.4070), which is a common midpoint rest area.
PLACES = [
    {
        "id": "place_01",
        "name": "Khandala Government Rest House",
        "type": "rest_house",
        "lat": 18.7610,
        "lng": 73.3650,
        "address": "Khandala Heights, Old Mumbai-Pune Highway, Khandala",
        "phone": "+91 2114 273012",
        "rating": 3.8,
        "rating_count": 84,
        "price_level": "$",
        "price_text": "₹800 - ₹1,200 / night",
        "amenities": ["parking", "bed", "food"],
        "description": "Affordable state-run rest house offering basic amenities, large parking spaces, and scenic mountain views. Ideal for quick night stays."
    },
    {
        "id": "place_02",
        "name": "Lonavala Highway Inn",
        "type": "hotel",
        "lat": 18.7540,
        "lng": 73.4020,
        "address": "Near Valvan Dam, Lonavala Bypass, Lonavala",
        "phone": "+91 2114 298574",
        "rating": 4.2,
        "rating_count": 210,
        "price_level": "$$",
        "price_text": "₹1,800 - ₹2,500 / night",
        "amenities": ["wifi", "food", "ac", "parking", "bed"],
        "description": "Comfortable roadside hotel with quick highway access, 24/7 check-in, hot showers, and high-speed Wi-Fi to refresh during long journeys."
    },
    {
        "id": "place_03",
        "name": "Khalapur Toll Plaza Rest Stop",
        "type": "rest_house",
        "lat": 18.8250,
        "lng": 73.2380,
        "address": "Expressway Food Mall, Khalapur Toll Plaza, Khalapur",
        "phone": "+91 2192 265009",
        "rating": 3.6,
        "rating_count": 145,
        "price_level": "$",
        "price_text": "₹500 - ₹900 / night",
        "amenities": ["parking", "bed", "food"],
        "description": "Conveniently located directly at the Khalapur Toll Plaza food mall. Offers cozy rest rooms, clean restrooms, and heavy vehicle parking."
    },
    {
        "id": "place_04",
        "name": "Urse Toll Plaza Rest Center",
        "type": "rest_house",
        "lat": 18.6920,
        "lng": 73.6650,
        "address": "Urse Toll Plaza (Pune Side), Mumbai-Pune Expressway, Urse",
        "phone": "+91 2114 287411",
        "rating": 3.5,
        "rating_count": 92,
        "price_level": "$",
        "price_text": "₹600 - ₹1,000 / night",
        "amenities": ["parking", "bed", "food"],
        "description": "Government-supported transit rest stop on the Pune-bound side of the expressway. Quick check-in and basic lodging for tired drivers."
    },
    {
        "id": "place_05",
        "name": "Radisson Resort & Spa Lonavala",
        "type": "hotel",
        "lat": 18.7380,
        "lng": 73.4180,
        "address": "Gold Valley, Sector E, Tungarli, Lonavala",
        "phone": "+91 2114 261700",
        "rating": 4.6,
        "rating_count": 930,
        "price_level": "$$$",
        "price_text": "₹6,500 - ₹9,500 / night",
        "amenities": ["wifi", "food", "ac", "parking", "bed"],
        "description": "Premium luxury resort offering world-class rooms, swimming pools, spa therapies to combat driving fatigue, and 24-hour room service."
    },
    {
        "id": "place_06",
        "name": "Express Inn & Suites Talegaon",
        "type": "hotel",
        "lat": 18.7280,
        "lng": 73.6740,
        "address": "Talegaon MIDC Junction, Old NH4, Talegaon Dabhade",
        "phone": "+91 2114 259000",
        "rating": 4.1,
        "rating_count": 315,
        "price_level": "$$",
        "price_text": "₹2,200 - ₹3,200 / night",
        "amenities": ["wifi", "food", "ac", "parking", "bed"],
        "description": "Modern business hotel with cozy rooms, silent environment, secure underground parking, and dynamic dining options right near the highway exit."
    },
    {
        "id": "place_07",
        "name": "Lonavala Government Guest House",
        "type": "rest_house",
        "lat": 18.7480,
        "lng": 73.4070,
        "address": "Near Ryewood Park, Lonavala Town Center",
        "phone": "+91 2114 272021",
        "rating": 3.9,
        "rating_count": 67,
        "price_level": "$",
        "price_text": "₹700 - ₹1,100 / night",
        "amenities": ["parking", "bed", "food"],
        "description": "Quiet PWD rest house located in the heart of Lonavala. Green surroundings, spacious colonial-style rooms, and secure parking."
    },
    {
        "id": "place_08",
        "name": "Valvan Lake Resort",
        "type": "hotel",
        "lat": 18.7565,
        "lng": 73.4215,
        "address": "Valvan, Near Mumbai-Pune Highway, Lonavala",
        "phone": "+91 2114 274350",
        "rating": 4.3,
        "rating_count": 480,
        "price_level": "$$",
        "price_text": "₹2,500 - ₹3,800 / night",
        "amenities": ["wifi", "food", "ac", "parking", "bed"],
        "description": "Beautiful lake-facing resort. Features excellent soundproof rooms, multi-cuisine restaurant, and active room service for a peaceful break."
    },
    {
        "id": "place_09",
        "name": "Highway Comfort Motel",
        "type": "hotel",
        "lat": 18.7900,
        "lng": 73.3100,
        "address": "Sajgaon, Near Adoshi Tunnel, Mumbai-Pune Expressway",
        "phone": "+91 98231 44521",
        "rating": 3.7,
        "rating_count": 188,
        "price_level": "$",
        "price_text": "₹1,200 - ₹1,700 / night",
        "amenities": ["food", "parking", "bed"],
        "description": "No-frills highway motel tailored for quick rest stops. Convenient drive-in parking, clean beds, and immediate access to expressway services."
    },
    {
        "id": "place_10",
        "name": "The Dukes Retreat Khandala",
        "type": "hotel",
        "lat": 18.7542,
        "lng": 73.3768,
        "address": "Pune-Mumbai Road, Khandala",
        "phone": "+91 2114 269201",
        "rating": 4.5,
        "rating_count": 760,
        "price_level": "$$$",
        "price_text": "₹5,000 - ₹8,000 / night",
        "amenities": ["wifi", "food", "ac", "parking", "bed"],
        "description": "Stunning cliff-side resort in Khandala. Offers luxurious fatigue-recovery packages, swimming pool, soundproof cottages, and panoramic valley views."
    },
    {
        "id": "place_11",
        "name": "Sajgaon Toll Plaza PWD Rest House",
        "type": "rest_house",
        "lat": 18.8050,
        "lng": 73.2850,
        "address": "Near Sajgaon Toll Booth, Khopoli-Bypass Road",
        "phone": "+91 2192 263102",
        "rating": 3.4,
        "rating_count": 41,
        "price_level": "$",
        "price_text": "₹500 - ₹800 / night",
        "amenities": ["parking", "bed"],
        "description": "PWD rest cottage for travelers needing a quick sleep. Highly secure, fenced premises with simple beds and basic washroom facilities."
    },
    {
        "id": "place_12",
        "name": "Fariyas Resort Lonavala",
        "type": "hotel",
        "lat": 18.7402,
        "lng": 73.3980,
        "address": "Frichley Hill, Tungarli, Lonavala",
        "phone": "+91 2114 660100",
        "rating": 4.6,
        "rating_count": 1200,
        "price_level": "$$$",
        "price_text": "₹7,000 - ₹11,000 / night",
        "amenities": ["wifi", "food", "ac", "parking", "bed"],
        "description": "Ultra-luxury five-star resort tucked in Frichley Hills. Includes water park, full-service health club, indoor pool, and cozy rooms for absolute comfort."
    }
]

import urllib.request
import urllib.parse
import json

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points
    on the Earth's surface (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371.0  # Radius of Earth in kilometers
    return r * c

def get_overpass_places(lat, lng, radius_km=10.0, place_type='all'):
    """
    Queries OpenStreetMap's public Overpass API to fetch real guesthouses and hotels 
    within the specified radius around the given latitude/longitude.
    """
    radius_meters = int(radius_km * 1000)
    
    # Restrict search types based on filter selection
    types_query = ""
    if place_type == 'hotel':
        types_query = f"""
        node["tourism"="hotel"](around:{radius_meters},{lat},{lng});
        way["tourism"="hotel"](around:{radius_meters},{lat},{lng});
        node["tourism"="motel"](around:{radius_meters},{lat},{lng});
        way["tourism"="motel"](around:{radius_meters},{lat},{lng});
        """
    elif place_type == 'rest_house':
        types_query = f"""
        node["tourism"="guest_house"](around:{radius_meters},{lat},{lng});
        way["tourism"="guest_house"](around:{radius_meters},{lat},{lng});
        node["tourism"="hostel"](around:{radius_meters},{lat},{lng});
        way["tourism"="hostel"](around:{radius_meters},{lat},{lng});
        node["amenity"="guesthouse"](around:{radius_meters},{lat},{lng});
        way["amenity"="guesthouse"](around:{radius_meters},{lat},{lng});
        """
    else:
        types_query = f"""
        node["tourism"="hotel"](around:{radius_meters},{lat},{lng});
        way["tourism"="hotel"](around:{radius_meters},{lat},{lng});
        node["tourism"="motel"](around:{radius_meters},{lat},{lng});
        way["tourism"="motel"](around:{radius_meters},{lat},{lng});
        node["tourism"="guest_house"](around:{radius_meters},{lat},{lng});
        way["tourism"="guest_house"](around:{radius_meters},{lat},{lng});
        node["tourism"="hostel"](around:{radius_meters},{lat},{lng});
        way["tourism"="hostel"](around:{radius_meters},{lat},{lng});
        node["amenity"="guesthouse"](around:{radius_meters},{lat},{lng});
        way["amenity"="guesthouse"](around:{radius_meters},{lat},{lng});
        """
        
    query_body = f"""
    [out:json][timeout:15];
    (
        {types_query}
    );
    out body center;
    """
    
    # Public keyless Overpass Interpreter endpoint
    url = "https://overpass-api.de/api/interpreter"
    data = urllib.parse.urlencode({'data': query_body}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'User-Agent': 'SafeDriveAI/1.0'})
    
    try:
        print(f"Requesting Overpass API at {lat},{lng} with radius {radius_km}km...")
        with urllib.request.urlopen(req, timeout=12) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            elements = res_data.get('elements', [])
            
            results = []
            for element in elements:
                lat_val = element.get('lat') or element.get('center', {}).get('lat')
                lon_val = element.get('lon') or element.get('center', {}).get('lon')
                
                if lat_val is None or lon_val is None:
                    continue
                    
                tags = element.get('tags', {})
                name = tags.get('name')
                if not name:
                    continue # Ignore nameless points
                    
                # Categorize place type
                osm_tourism = tags.get('tourism', '')
                osm_amenity = tags.get('amenity', '')
                
                inferred_type = 'hotel'
                if osm_tourism in ['guest_house', 'hostel'] or osm_amenity == 'guesthouse':
                    inferred_type = 'rest_house'
                    
                # Extract phone details
                phone = tags.get('phone') or tags.get('contact:phone') or tags.get('contact:mobile') or "N/A"
                
                # Extract address details
                addr_street = tags.get('addr:street', '')
                addr_city = tags.get('addr:city', '')
                addr_housenumber = tags.get('addr:housenumber', '')
                
                address_parts = [p for p in [addr_housenumber, addr_street, addr_city] if p]
                address = ", ".join(address_parts) if address_parts else tags.get('addr:full') or "Nearby Location"
                
                # Dynamic mocks for user review values based on hash
                name_hash = sum(ord(char) for char in name)
                rating = round(3.5 + (name_hash % 15) * 0.1, 1)
                if rating > 5.0: rating = 4.8
                rating_count = 8 + (name_hash % 250)
                
                price_lvl = "$" if name_hash % 3 == 0 else "$$" if name_hash % 3 == 1 else "$$$"
                price_txt = "₹900 - ₹1,400 / night" if price_lvl == "$" else "₹2,200 - ₹3,500 / night" if price_lvl == "$$" else "₹5,000 - ₹8,000 / night"
                
                # Dynamic amenities based on node properties or hash
                amenities = ["bed", "parking"]
                if tags.get('internet_access') or tags.get('wifi') or name_hash % 2 == 0:
                    amenities.append("wifi")
                if tags.get('restaurant') or tags.get('food') or name_hash % 3 == 0:
                    amenities.append("food")
                if tags.get('air_conditioning') or name_hash % 4 == 0:
                    amenities.append("ac")
                    
                description = tags.get('description') or f"A real-world {inferred_type.replace('_', ' ')} located in this area. Clean rooms, secure rest areas, and driving support tools nearby."
                
                results.append({
                    "id": f"osm_{element['id']}",
                    "name": name,
                    "type": inferred_type,
                    "lat": lat_val,
                    "lng": lon_val,
                    "address": address,
                    "phone": phone,
                    "rating": rating,
                    "rating_count": rating_count,
                    "price_level": price_lvl,
                    "price_text": price_txt,
                    "amenities": amenities,
                    "description": description
                })
                
            print(f"Successfully loaded {len(results)} live places from OpenStreetMap!")
            return results
    except Exception as e:
        print(f"Error querying live Overpass API: {e}. Falling back to empty...")
        return []

def search_places(lat=None, lng=None, query=None, radius_km=10.0, place_type='all'):
    """
    Filters and sorts the places list based on proximity, search query, type, and radius.
    Fails over to OpenStreetMap Overpass query if coordinates are far from the Lonavala corridor.
    """
    results = []

    user_lat = None
    user_lng = None
    if lat is not None and lng is not None:
        try:
            user_lat = float(lat)
            user_lng = float(lng)
        except ValueError:
            pass

    # Check if we should fetch real-time OpenStreetMap points
    # Triggered if latitude/longitude is queried and it resides > 40 km from the Lonavala expressway preset center
    use_live_osm = False
    if user_lat is not None and user_lng is not None:
        dist_to_preset_center = haversine(user_lat, user_lng, 18.7480, 73.4070)
        if dist_to_preset_center > 40.0:
            use_live_osm = True

    if use_live_osm:
        results = get_overpass_places(user_lat, user_lng, radius_km=radius_km, place_type=place_type)
        
        # Apply search text filtering over the live points
        if query and results:
            filtered_results = []
            q = query.lower()
            for place in results:
                is_type_match = False
                if q in ["rest house", "resthouse", "rest-house", "guesthouse", "guest house", "pwd"] and place['type'] == 'rest_house':
                    is_type_match = True
                elif q in ["hotel", "motel", "inn", "resort", "stay"] and place['type'] == 'hotel':
                    is_type_match = True

                name_match = q in place['name'].lower()
                address_match = q in place['address'].lower()
                description_match = q in place['description'].lower()
                if name_match or address_match or description_match or is_type_match:
                    filtered_results.append(place)
            results = filtered_results
    else:
        # Load local Lonavala expressway mock dataset
        for place in PLACES:
            if place_type != 'all' and place['type'] != place_type:
                continue

            if query:
                q = query.lower()
                is_type_match = False
                if q in ["rest house", "resthouse", "rest-house", "guesthouse", "guest house", "pwd"] and place['type'] == 'rest_house':
                    is_type_match = True
                elif q in ["hotel", "motel", "inn", "resort", "stay"] and place['type'] == 'hotel':
                    is_type_match = True

                name_match = q in place['name'].lower()
                address_match = q in place['address'].lower()
                description_match = q in place['description'].lower()
                if not (name_match or address_match or description_match or is_type_match):
                    continue

            dist = None
            if user_lat is not None and user_lng is not None:
                dist = haversine(user_lat, user_lng, place['lat'], place['lng'])
                if not query and dist > float(radius_km):
                    continue

            place_data = place.copy()
            if dist is not None:
                place_data['distance_km'] = round(dist, 2)
            else:
                place_data['distance_km'] = None

            results.append(place_data)

    # Sort results
    if user_lat is not None and user_lng is not None:
        for place in results:
            if 'distance_km' not in place or place['distance_km'] is None:
                place['distance_km'] = round(haversine(user_lat, user_lng, place['lat'], place['lng']), 2)
        results.sort(key=lambda x: x['distance_km'] if x['distance_km'] is not None else 9999)
    else:
        results.sort(key=lambda x: x['rating'], reverse=True)

    return results
