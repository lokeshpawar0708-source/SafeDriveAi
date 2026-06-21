import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Phone, Star, Wifi, Coffee, Compass, 
  Car, Navigation, Bed, Search, Filter, RefreshCw, Sparkles 
} from 'lucide-react';
import { searchPlaces } from '../../../services/api';

const LOCATION_PRESETS = [
  { name: "Lonavala Center (Bypass)", lat: 18.7480, lng: 73.4070 },
  { name: "Mumbai (Gateway of India)", lat: 18.9220, lng: 72.8347 },
  { name: "Pune Center (Shaniwar Wada)", lat: 18.5204, lng: 73.8567 },
  { name: "Jalgaon Center", lat: 21.0077, lng: 75.5626 },
  { name: "Delhi (Connaught Place)", lat: 28.6304, lng: 77.2177 },
  { name: "Bangalore (Majestic)", lat: 12.9716, lng: 77.5946 },
  { name: "Khandala Heights", lat: 18.7610, lng: 73.3650 },
  { name: "Khalapur Toll Plaza", lat: 18.8250, lng: 73.2380 },
  { name: "Urse Toll Plaza", lat: 18.6920, lng: 73.6650 },
  { name: "Sajgaon Toll Plaza", lat: 18.8050, lng: 73.2850 }
];

export default function RestStopsPanel({ stateData }) {
  // Coordinates and query states
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [lat, setLat] = useState(LOCATION_PRESETS[0].lat);
  const [lng, setLng] = useState(LOCATION_PRESETS[0].lng);
  
  // Custom manual coordinates mode
  const [isManualCoords, setIsManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState("18.7480");
  const [manualLng, setManualLng] = useState("73.4070");

  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState(15);
  const [placeType, setPlaceType] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [priceLevel, setPriceLevel] = useState('all');

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  
  // Leaflet map loading status
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [leafletError, setLeafletError] = useState(false);
  const [highlightedPlaceId, setHighlightedPlaceId] = useState(null);
  const [mapStyle, setMapStyle] = useState('dark');

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef([]);
  const driverMarkerRef = useRef(null);

  // Fetch places based on query, coordinates, radius, type
  const fetchNearbyPlaces = async () => {
    setLoading(true);
    const searchParams = {
      lat: isManualCoords ? parseFloat(manualLat) : lat,
      lng: isManualCoords ? parseFloat(manualLng) : lng,
      query,
      radius,
      type: placeType
    };

    if (isNaN(searchParams.lat) || isNaN(searchParams.lng)) {
      searchParams.lat = LOCATION_PRESETS[0].lat;
      searchParams.lng = LOCATION_PRESETS[0].lng;
    }

    const data = await searchPlaces(searchParams);
    
    // Apply client-side filters (rating and price level)
    let filteredData = data || [];
    if (minRating > 0) {
      filteredData = filteredData.filter(p => p.rating >= minRating);
    }
    if (priceLevel !== 'all') {
      filteredData = filteredData.filter(p => p.price_level === priceLevel);
    }

    setPlaces(filteredData);
    setLoading(false);
  };

  // Sync manual inputs when preset changes
  useEffect(() => {
    if (!isManualCoords) {
      setManualLat(lat.toFixed(4));
      setManualLng(lng.toFixed(4));
    }
  }, [lat, lng, isManualCoords]);

  // Load places on dependencies change
  useEffect(() => {
    fetchNearbyPlaces();
  }, [lat, lng, isManualCoords, query, radius, placeType, minRating, priceLevel]);

  // Handle Preset Select
  const handlePresetChange = (e) => {
    const idx = parseInt(e.target.value);
    setSelectedPresetIndex(idx);
    setIsManualCoords(false);
    setLat(LOCATION_PRESETS[idx].lat);
    setLng(LOCATION_PRESETS[idx].lng);
  };

  // Request browser geolocation
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser.");
      return;
    }
    setLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsManualCoords(true);
        setManualLat(position.coords.latitude.toFixed(6));
        setManualLng(position.coords.longitude.toFixed(6));
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setLoading(false);
      },
      (error) => {
        console.error("GPS Error:", error);
        setGpsError(`GPS Access Failed: ${error.message}`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Load Leaflet CDN script and stylesheet
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    // 1. Add style tag
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // 2. Add script tag
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setLeafletLoaded(true);
    };
    script.onerror = () => {
      console.error("Leaflet script failed to load");
      setLeafletError(true);
    };
    document.body.appendChild(script);

    return () => {
      // Clean up maps script elements if needed, but usually leaving them is fine
    };
  }, []);

  // Initialize and Update Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || window.L === undefined) return;

    const L = window.L;
    const currentLat = isManualCoords ? parseFloat(manualLat) : lat;
    const currentLng = isManualCoords ? parseFloat(manualLng) : lng;

    const mapCenter = [
      isNaN(currentLat) ? LOCATION_PRESETS[0].lat : currentLat,
      isNaN(currentLng) ? LOCATION_PRESETS[0].lng : currentLng
    ];

    // Initialize Map instance
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: mapCenter,
        zoom: 12,
        zoomControl: true
      });

      // Add styled tiles (Google Maps / Dark Matter tiles)
      let url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      let attribution = '&copy; OpenStreetMap &copy; CARTO';
      
      if (mapStyle === 'google_roads') {
        url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
        attribution = '&copy; Google Maps';
      } else if (mapStyle === 'google_satellite') {
        url = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
        attribution = '&copy; Google Maps';
      } else if (mapStyle === 'google_hybrid') {
        url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        attribution = '&copy; Google Maps';
      }

      tileLayerRef.current = L.tileLayer(url, {
        attribution,
        maxZoom: 20
      }).addTo(mapRef.current);

      // Map click handler to update manual coordinates
      mapRef.current.on('click', (e) => {
        setIsManualCoords(true);
        setManualLat(e.latlng.lat.toFixed(6));
        setManualLng(e.latlng.lng.toFixed(6));
      });
    } else {
      // Update center if manual coords did not trigger it
      mapRef.current.setView(mapCenter, mapRef.current.getZoom());
    }

    const map = mapRef.current;

    // Draw / Move Driver Marker
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng(mapCenter);
    } else {
      // Circle Marker for driver
      driverMarkerRef.current = L.circleMarker(mapCenter, {
        radius: 12,
        fillColor: '#f43f5e', // Rose / Red
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95
      }).addTo(map)
        .bindPopup("<b>Your Car Position</b><br/>Search origin point.");
    }

    // Clear existing rest stop markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Add Markers for nearby places
    places.forEach(place => {
      const isHotel = place.type === 'hotel';
      const markerColor = isHotel ? 'var(--status-normal)' : 'var(--status-warning)';
      const isHighlighted = place.id === highlightedPlaceId;

      const marker = L.circleMarker([place.lat, place.lng], {
        radius: isHighlighted ? 12 : 8,
        fillColor: markerColor,
        color: isHighlighted ? '#ffffff' : markerColor,
        weight: isHighlighted ? 3 : 1,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);

      // Popup content
      const popupContent = `
        <div style="color: #1f2937; font-family: sans-serif; font-size: 0.85rem; min-width: 140px;">
          <h4 style="margin: 0 0 0.25rem 0; font-weight: bold; color: #111827;">${place.name}</h4>
          <p style="margin: 0 0 0.25rem 0;">Type: <b>${isHotel ? 'Hotel' : 'Rest House'}</b></p>
          <p style="margin: 0 0 0.25rem 0; color: #f59e0b;">★ ${place.rating} (${place.rating_count} reviews)</p>
          <p style="margin: 0 0 0.5rem 0; font-weight: 500;">${place.price_text}</p>
          <a href="tel:${place.phone}" style="display: block; font-size: 0.8rem; color: #2563eb; text-decoration: none;">📞 Call: ${place.phone}</a>
        </div>
      `;
      marker.bindPopup(popupContent);

      // Handle marker events
      marker.on('click', () => {
        setHighlightedPlaceId(place.id);
      });

      markersRef.current.push(marker);
    });

  }, [leafletLoaded, places, lat, lng, isManualCoords, manualLat, manualLng, highlightedPlaceId]);

  // Handle Map Style changes dynamically
  useEffect(() => {
    if (!mapRef.current || !window.L || !tileLayerRef.current) return;
    const L = window.L;
    
    // Remove old layer
    mapRef.current.removeLayer(tileLayerRef.current);
    
    // Create new layer
    let url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    let attribution = '&copy; OpenStreetMap &copy; CARTO';
    
    if (mapStyle === 'google_roads') {
      url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Maps';
    } else if (mapStyle === 'google_satellite') {
      url = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Maps';
    } else if (mapStyle === 'google_hybrid') {
      url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Maps';
    }
    
    tileLayerRef.current = L.tileLayer(url, {
      attribution,
      maxZoom: 20
    }).addTo(mapRef.current);
  }, [mapStyle]);

  // Map cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
        driverMarkerRef.current = null;
        markersRef.current = [];
      }
    };
  }, []);

  // Zoom to a specific place
  const handleFocusPlace = (place) => {
    setHighlightedPlaceId(place.id);
    if (mapRef.current && window.L) {
      mapRef.current.setView([place.lat, place.lng], 14);
      // Find matching marker and open its popup
      const matchingMarker = markersRef.current.find(m => {
        const latlng = m.getLatLng();
        return Math.abs(latlng.lat - place.lat) < 0.0001 && Math.abs(latlng.lng - place.lng) < 0.0001;
      });
      if (matchingMarker) {
        matchingMarker.openPopup();
      }
    }
  };

  // SVG Fallback Offline Map coordinates converter
  const renderSVGFallbackMap = () => {
    // Determine bounds of current places + driver
    const currentLat = isManualCoords ? parseFloat(manualLat) : lat;
    const currentLng = isManualCoords ? parseFloat(manualLng) : lng;

    const driverX = 200;
    const driverY = 150;

    // Plot other places relative to driver (scaling lat/lng diffs to screen px)
    // 0.01 degree ~ 1.1 km. Let's make 0.01 degrees = 40 pixels.
    const scale = 5000; // factor

    return (
      <div className="svg-fallback-map-wrapper">
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
          <span>Offline SVG Navigator</span>
          <span style={{ color: 'var(--status-warning)' }}>⚠️ Leaflet API Offline</span>
        </div>
        <div style={{ position: 'relative', width: '100%', height: '300px', background: '#070b19', overflow: 'hidden' }}>
          {/* Grid lines */}
          <svg style={{ width: '100%', height: '100%' }}>
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Draw a mock road line representing Expressway */}
            <path d="M -50 250 L 500 50" fill="none" stroke="rgba(255, 255, 255, 0.07)" strokeWidth="20" strokeLinecap="round" />
            <path d="M -50 250 L 500 50" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,5" />

            {/* Draw Driver */}
            <g transform={`translate(${driverX}, ${driverY})`}>
              <circle r="14" fill="rgba(244, 63, 94, 0.2)" stroke="var(--status-critical)" strokeWidth="1" />
              <circle r="8" fill="var(--status-critical)" />
              <text y="-18" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">Driver Location</text>
            </g>

            {/* Draw Rest Stops */}
            {places.map((place) => {
              const dx = (place.lng - currentLng) * scale;
              const dy = -(place.lat - currentLat) * scale; // negative since Y goes down in SVG
              
              const x = driverX + dx;
              const y = driverY + dy;

              // Check if in bounds
              if (x < 15 || x > 385 || y < 15 || y > 285) {
                return null;
              }

              const isHotel = place.type === 'hotel';
              const markerColor = isHotel ? 'var(--status-normal)' : 'var(--status-warning)';
              const isSelected = place.id === highlightedPlaceId;

              return (
                <g 
                  key={place.id} 
                  transform={`translate(${x}, ${y})`} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => setHighlightedPlaceId(place.id)}
                >
                  {isSelected && (
                    <circle r="12" fill="none" stroke="#ffffff" strokeWidth="2" style={{ animation: 'pulse-icon 0.6s infinite alternate' }} />
                  )}
                  <circle r="7" fill={markerColor} stroke="#ffffff" strokeWidth="1" />
                  <text y="16" textAnchor="middle" fill="var(--text-main)" fontSize="8" fontWeight="500">
                    {place.name.split(' ')[0]} ({place.distance_km || '?'}k)
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
          Tip: Select a preset location to shift coordinate center. Click stops to highlight.
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card rest-stops-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      {/* Top Banner Alert integration if driver is fatigued */}
      {stateData && stateData.status !== "NORMAL" && (
        <div className="fatigue-indicator-bar" style={{
          background: 'rgba(245, 158, 11, 0.1)', 
          borderLeft: '4px solid var(--status-warning)',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <h4 style={{ fontWeight: 700, color: 'var(--status-warning)' }}>Driver Fatigue Active ({stateData.status})</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>We are highlighting the closest rest stops below to help you plan a safe break.</p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }} onClick={fetchNearbyPlaces}>
            <RefreshCw size={12} style={{ marginRight: '0.25rem', display: 'inline' }} /> Refresh
          </button>
        </div>
      )}

      {/* Grid Layout: Control Panel & Map on Left, List on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Column: Search Filters and Map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Header & Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin className="text-primary" style={{ color: 'var(--status-normal)' }} /> Nearby Rest & Stay
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Find local rest houses and hotels to recover from fatigue.
              </p>
            </div>
          </div>

          {/* Location Center Setting Controls */}
          <div className="glass-card" style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
              Set Driver Location Reference
            </h4>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flexGrow: 1, minWidth: '180px' }}>
                <select 
                  className="form-control-number" 
                  style={{ width: '100%', textAlign: 'left', background: 'rgba(0,0,0,0.2)', fontSize: '0.85rem' }}
                  onChange={handlePresetChange}
                  value={isManualCoords ? "manual" : selectedPresetIndex}
                >
                  {LOCATION_PRESETS.map((p, i) => (
                    <option key={i} value={i}>{p.name}</option>
                  ))}
                  {isManualCoords && <option value="manual">Custom Location (GPS / Map Click)</option>}
                </select>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={handleGetGPS}
                disabled={loading}
                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Compass size={14} /> Get Device GPS
              </button>
            </div>
            
            {gpsError && (
              <p style={{ color: 'var(--status-critical)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                {gpsError}
              </p>
            )}

            {/* Lat / Lng Fine Tuning */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Latitude: <b>{isManualCoords ? manualLat : lat.toFixed(5)}</b></span>
              <span>Longitude: <b>{isManualCoords ? manualLng : lng.toFixed(5)}</b></span>
              {isManualCoords && (
                <button 
                  onClick={() => setIsManualCoords(false)} 
                  style={{ background: 'none', border: 'none', color: 'var(--status-warning)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Reset to Preset
                </button>
              )}
            </div>
          </div>

          {/* Search Filters Row */}
          <div className="filter-controls-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem'
          }}>
            {/* Search query box */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.7rem' }}>Text Search</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Radisson..." 
                  className="form-control-number"
                  style={{ width: '100%', textAlign: 'left', paddingLeft: '1.75rem', fontSize: '0.85rem' }}
                />
                <Search size={12} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Place Type */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.7rem' }}>Place Type</label>
              <select 
                className="form-control-number" 
                style={{ width: '100%', textAlign: 'left', fontSize: '0.85rem' }}
                value={placeType}
                onChange={(e) => setPlaceType(e.target.value)}
              >
                <option value="all">All Stops</option>
                <option value="hotel">Hotels Only</option>
                <option value="rest_house">Rest Houses Only</option>
              </select>
            </div>

            {/* Radius */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.7rem' }}>Search Radius</label>
              <select 
                className="form-control-number" 
                style={{ width: '100%', textAlign: 'left', fontSize: '0.85rem' }}
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={15}>15 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
              </select>
            </div>

            {/* Min Rating */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.7rem' }}>Min Rating</label>
              <select 
                className="form-control-number" 
                style={{ width: '100%', textAlign: 'left', fontSize: '0.85rem' }}
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
              >
                <option value={0}>Any Stars</option>
                <option value={3.5}>3.5+ Stars</option>
                <option value={4.0}>4.0+ Stars</option>
                <option value={4.5}>4.5+ Stars</option>
              </select>
            </div>

            {/* Price Level */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.7rem' }}>Price Budget</label>
              <select 
                className="form-control-number" 
                style={{ width: '100%', textAlign: 'left', fontSize: '0.85rem' }}
                value={priceLevel}
                onChange={(e) => setPriceLevel(e.target.value)}
              >
                <option value="all">Any Price</option>
                <option value="$">₹ Budget ($)</option>
                <option value="$$">₹₹ Midrange ($$)</option>
                <option value="$$$">₹₹₹ Premium ($$$)</option>
              </select>
            </div>
          </div>

          {/* Map Display Frame */}
          <div className="glass-card" style={{ overflow: 'hidden', height: '340px', position: 'relative', border: '1px solid var(--glass-border)' }}>
            {(!leafletLoaded && !leafletError) ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                <div style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--status-normal)', borderRadius: '50%', animation: 'pulse-spin 1s infinite linear' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Initializing Map Modules...</span>
              </div>
            ) : leafletError ? (
              renderSVGFallbackMap()
            ) : (
              <>
                <div 
                  ref={mapContainerRef} 
                  style={{ width: '100%', height: '100%', zIndex: 1 }} 
                />
                {/* Google Maps Selector Control Overlay */}
                <div style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  zIndex: 1000, 
                  background: 'rgba(15, 23, 42, 0.85)', 
                  border: '1px solid var(--glass-border)', 
                  borderRadius: '8px', 
                  padding: '0.35rem 0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem'
                }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Map Theme:</span>
                  <select 
                    value={mapStyle} 
                    onChange={(e) => setMapStyle(e.target.value)}
                    style={{ 
                      background: '#030712', 
                      color: '#ffffff', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.35rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="dark">Dark Theme</option>
                    <option value="google_roads">Google Roads</option>
                    <option value="google_satellite">Google Satellite</option>
                    <option value="google_hybrid">Google Hybrid</option>
                  </select>
                </div>
              </>
            )}
            
            {/* Map click hint overlays */}
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', pointerEvents: 'none', color: 'var(--text-muted)' }}>
              🖱️ Click anywhere on the map to set a custom coordinates center.
            </div>
          </div>

        </div>

        {/* Right Column: Search Results List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '580px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Stops Found ({places.length})
            </h3>
            {loading && (
              <span style={{ fontSize: '0.75rem', color: 'var(--status-normal)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '8px', height: '8px', background: 'var(--status-normal)', borderRadius: '50%', animation: 'pulse-dot 1s infinite' }} /> Updating...
              </span>
            )}
          </div>

          {/* Cards List container scrollable */}
          <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {places.length === 0 ? (
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
                <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏨</span>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>No rest stops found near this location.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem', maxWidth: '280px', lineHeight: 1.4 }}>
                  {isManualCoords 
                    ? "Note: The mock dataset is centered around the Mumbai-Pune Expressway (Lonavala). Try selecting a preset location from the dropdown above to load mock rest stops." 
                    : "Try increasing the search radius to 50 km or clearing the search query."}
                </p>
              </div>
            ) : (
              places.map((place) => {
                const isHighlighted = place.id === highlightedPlaceId;
                const isHotel = place.type === 'hotel';
                const isNearest = places[0].id === place.id;

                return (
                  <div 
                    key={place.id}
                    onClick={() => handleFocusPlace(place)}
                    className={`glass-card rest-stop-card ${isHighlighted ? 'highlighted-stop' : ''}`}
                    style={{
                      padding: '1rem',
                      cursor: 'pointer',
                      borderLeft: isHighlighted 
                        ? '4px solid #ffffff' 
                        : isHotel 
                          ? '4px solid var(--status-normal)' 
                          : '4px solid var(--status-warning)',
                      background: isHighlighted ? 'rgba(255, 255, 255, 0.05)' : 'var(--glass-bg)',
                      position: 'relative'
                    }}
                  >
                    {/* Badge row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className={`log-event-badge ${isHotel ? 'drowsiness' : 'yawning'}`} style={{ 
                        background: isHotel ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isHotel ? 'var(--status-normal)' : 'var(--status-warning)',
                        fontSize: '0.65rem'
                      }}>
                        {isHotel ? 'Hotel & Stay' : 'Govt Rest House'}
                      </span>
                      
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        {isNearest && (
                          <span style={{
                            background: 'rgba(244, 63, 94, 0.15)',
                            color: 'var(--status-critical)',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            textTransform: 'uppercase'
                          }}>
                            Closest
                          </span>
                        )}
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-normal)' }}>
                          {place.distance_km !== null ? `${place.distance_km} km` : 'Near you'}
                        </span>
                      </div>
                    </div>

                    {/* Name & rating */}
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.5rem', color: '#ffffff' }}>
                      {place.name}
                    </h4>

                    {/* Rating stars */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                      <span style={{ display: 'flex', color: '#f59e0b' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            fill={i < Math.floor(place.rating) ? '#f59e0b' : 'none'} 
                            stroke="#f59e0b" 
                          />
                        ))}
                      </span>
                      <span style={{ fontWeight: 600 }}>{place.rating}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({place.rating_count} reviews)</span>
                      <span style={{ color: 'var(--text-muted)' }}>•</span>
                      <span style={{ fontWeight: 600, color: '#f3f4f6' }}>{place.price_text}</span>
                    </div>

                    {/* Address snippet */}
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.3 }}>
                      📍 {place.address}
                    </p>

                    {/* Description snippet */}
                    {isHighlighted && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '4px', lineHeight: 1.4 }}>
                        {place.description}
                      </p>
                    )}

                    {/* Amenities list */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                      {place.amenities.includes('wifi') && (
                        <span title="Wi-Fi" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                          <Wifi size={10} /> Free Wi-Fi
                        </span>
                      )}
                      {place.amenities.includes('food') && (
                        <span title="Dining Available" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                          <Coffee size={10} /> Food Mall
                        </span>
                      )}
                      {place.amenities.includes('ac') && (
                        <span title="Air Conditioned" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                          <Sparkles size={10} /> A/C Rooms
                        </span>
                      )}
                      {place.amenities.includes('parking') && (
                        <span title="Secure Parking" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                          <Car size={10} /> Secure Parking
                        </span>
                      )}
                      {place.amenities.includes('bed') && (
                        <span title="Lodging Bed" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                          <Bed size={10} /> Sleeping Beds
                        </span>
                      )}
                    </div>

                    {/* Card Actions (Visible when highlighted/selected) */}
                    {isHighlighted && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                        <a 
                          href={`tel:${place.phone}`}
                          className="btn btn-secondary" 
                          style={{ flexGrow: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.4rem 0.5rem', textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={12} /> Call Stop
                        </a>
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                          target="_blank" 
                          rel="noreferrer"
                          className="btn btn-primary" 
                          style={{ flexGrow: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.4rem 0.5rem', textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Navigation size={12} /> Route G-Maps
                        </a>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
