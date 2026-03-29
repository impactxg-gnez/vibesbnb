'use client';

import { useEffect, useRef, useState } from 'react';

interface LocationPickerProps {
  location?: string;
  coordinates?: { lat: number; lng: number };
  onLocationChange: (location: string, coordinates?: { lat: number; lng: number }) => void;
  className?: string;
}

export default function LocationPicker({
  location: initialLocation,
  coordinates: initialCoordinates,
  onLocationChange,
  className = '',
}: LocationPickerProps) {
  const [location, setLocation] = useState(initialLocation || '');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>(initialCoordinates);
  const [useManualCoords, setUseManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState(initialCoordinates?.lat?.toString() || '');
  const [manualLng, setManualLng] = useState(initialCoordinates?.lng?.toString() || '');
  
  const mapRef = useRef<HTMLDivElement>(null);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Sync location prop changes
  useEffect(() => {
    if (initialLocation && initialLocation !== location) {
      setLocation(initialLocation);
    } else if (!initialLocation && location) {
      setLocation('');
    }
  }, [initialLocation]);

  // Sync coordinate prop changes
  useEffect(() => {
    if (initialCoordinates) {
      const sameCoords =
        coordinates &&
        coordinates.lat === initialCoordinates.lat &&
        coordinates.lng === initialCoordinates.lng;
      if (!sameCoords) {
        setCoordinates(initialCoordinates);
        setManualLat(initialCoordinates.lat?.toString() || '');
        setManualLng(initialCoordinates.lng?.toString() || '');
        if (mapLoaded) {
          updateMarker(initialCoordinates);
        }
      }
    } else if (coordinates) {
      setCoordinates(undefined);
      setManualLat('');
      setManualLng('');
    }
  }, [initialCoordinates, mapLoaded]);

  // Initialize Google Maps
  useEffect(() => {
    if (typeof window === 'undefined' || !window.google?.maps) {
      // Load Google Maps script if not already loaded
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setMapLoaded(true);
        initializeMap();
      };
      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
      initializeMap();
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, []);

  // Initialize map when Google Maps is loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [mapLoaded]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (mapLoaded && autocompleteInputRef.current && !autocompleteRef.current) {
      if (window.google?.maps?.places) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          autocompleteInputRef.current,
          { types: ['geocode', 'establishment'] }
        );

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (place?.geometry) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const newCoords = { lat, lng };
            const newLocation = place.formatted_address || place.name || location;

            setCoordinates(newCoords);
            setLocation(newLocation);
            setManualLat(lat.toString());
            setManualLng(lng.toString());
            updateMarker(newCoords);
            onLocationChange(newLocation, newCoords);
          }
        });
      }
    }
  }, [mapLoaded, location, onLocationChange]);

  // Geocode address if we have location but no coordinates
  useEffect(() => {
    if (
      mapLoaded &&
      location &&
      (!coordinates || isNaN(coordinates.lat) || isNaN(coordinates.lng)) &&
      window.google?.maps
    ) {
      if (!geocoderRef.current) {
        geocoderRef.current = new window.google.maps.Geocoder();
      }
      geocoderRef.current.geocode({ address: location }, (results, status) => {
        if (status === 'OK' && results && results[0]?.geometry) {
          const lat = results[0].geometry.location.lat();
          const lng = results[0].geometry.location.lng();
          const newCoords = { lat, lng };
          setCoordinates(newCoords);
          setManualLat(lat.toString());
          setManualLng(lng.toString());
          updateMarker(newCoords);
          onLocationChange(results[0].formatted_address || location, newCoords);
        }
      });
    }
  }, [mapLoaded, location, coordinates, onLocationChange]);

  // Update map when coordinates change
  useEffect(() => {
    if (coordinates && mapInstanceRef.current) {
      updateMarker(coordinates);
    }
  }, [coordinates]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps) return;

    const defaultCenter = coordinates || { lat: 37.7749, lng: -122.4194 }; // San Francisco default

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: coordinates ? 15 : 10,
      mapTypeControl: true,
      streetViewControl: true,
    });

    // Create marker
    if (coordinates) {
      markerRef.current = new window.google.maps.Marker({
        position: coordinates,
        map: mapInstanceRef.current,
        draggable: true,
        title: 'Property Location',
      });

      // Update coordinates when marker is dragged
      markerRef.current.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const newCoords = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
          };
          setCoordinates(newCoords);
          setManualLat(newCoords.lat.toString());
          setManualLng(newCoords.lng.toString());
          
          // Reverse geocode to get address
          reverseGeocode(newCoords);
        }
      });
    }

    // Update marker on map click
    mapInstanceRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newCoords = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };
        setCoordinates(newCoords);
        setManualLat(newCoords.lat.toString());
        setManualLng(newCoords.lng.toString());
        updateMarker(newCoords);
        reverseGeocode(newCoords);
      }
    });
  };

  const updateMarker = (coords: { lat: number; lng: number }) => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.setPosition(coords);
    } else {
      markerRef.current = new window.google.maps.Marker({
        position: coords,
        map: mapInstanceRef.current,
        draggable: true,
        title: 'Property Location',
      });

      markerRef.current.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const newCoords = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
          };
          setCoordinates(newCoords);
          setManualLat(newCoords.lat.toString());
          setManualLng(newCoords.lng.toString());
          reverseGeocode(newCoords);
        }
      });
    }

    mapInstanceRef.current.setCenter(coords);
    mapInstanceRef.current.setZoom(15);
  };

  const reverseGeocode = async (coords: { lat: number; lng: number }) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: coords }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const address = results[0].formatted_address;
          setLocation(address);
          onLocationChange(address, coords);
        }
      });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const handleManualCoordsUpdate = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const newCoords = { lat, lng };
      setCoordinates(newCoords);
      updateMarker(newCoords);
      reverseGeocode(newCoords);
      onLocationChange(location, newCoords);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Location Address
        </label>
        <div className="relative">
          <input
            ref={autocompleteInputRef}
            type="text"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              onLocationChange(e.target.value, coordinates);
            }}
            placeholder="Search for an address or enter manually"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Start typing to search for an address, or enter manually
        </p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-300">
            Coordinates
          </label>
          <button
            type="button"
            onClick={() => setUseManualCoords(!useManualCoords)}
            className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
          >
            {useManualCoords ? 'Use Map' : 'Enter Manually'}
          </button>
        </div>

        {useManualCoords ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                onBlur={handleManualCoordsUpdate}
                placeholder="e.g., 37.7749"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                onBlur={handleManualCoordsUpdate}
                placeholder="e.g., -122.4194"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-800/50 rounded p-2">
              <span className="text-xs text-gray-500 block">Latitude</span>
              <span className="text-white font-mono">{coordinates?.lat !== undefined ? coordinates.lat.toFixed(6) : 'N/A'}</span>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <span className="text-xs text-gray-500 block">Longitude</span>
              <span className="text-white font-mono">{coordinates?.lng !== undefined ? coordinates.lng.toFixed(6) : 'N/A'}</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Map (Click or drag pin to adjust location)
        </label>
        <div
          ref={mapRef}
          className="w-full h-64 rounded-xl border border-gray-800 overflow-hidden"
          style={{ minHeight: '256px' }}
        />
        <p className="mt-1 text-xs text-gray-500">
          Click on the map or drag the pin to set the exact location
        </p>
      </div>
    </div>
  );
}
