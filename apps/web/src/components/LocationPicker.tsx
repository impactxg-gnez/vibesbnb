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
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Location Address
        </label>
        <input
          ref={autocompleteInputRef}
          type="text"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            onLocationChange(e.target.value, coordinates);
          }}
          placeholder="Search for an address or enter manually"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Start typing to search for an address, or enter manually
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Coordinates
          </label>
          <button
            type="button"
            onClick={() => setUseManualCoords(!useManualCoords)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {useManualCoords ? 'Use Map' : 'Enter Manually'}
          </button>
        </div>

        {useManualCoords ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                onBlur={handleManualCoordsUpdate}
                placeholder="e.g., 37.7749"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                onBlur={handleManualCoordsUpdate}
                placeholder="e.g., -122.4194"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Latitude: {coordinates?.lat.toFixed(6) || 'N/A'}</p>
            <p>Longitude: {coordinates?.lng.toFixed(6) || 'N/A'}</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Map (Click or drag pin to adjust location)
        </label>
        <div
          ref={mapRef}
          className="w-full h-64 rounded-lg border border-gray-300 dark:border-gray-600"
          style={{ minHeight: '256px' }}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Click on the map or drag the pin to set the exact location
        </p>
      </div>
    </div>
  );
}
