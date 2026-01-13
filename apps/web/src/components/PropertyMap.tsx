'use client';

import { useEffect, useRef } from 'react';

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  propertyName: string;
}

export function PropertyMap({ latitude, longitude, propertyName }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    const initializeMap = () => {
      if (!window.google?.maps || !mapRef.current || mapInstanceRef.current) return;

      try {
        // Initialize map
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          gestureHandling: 'greedy',
          disableDefaultUI: false,
          draggable: true,
          scrollwheel: true,
          disableDoubleClickZoom: false,
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry',
              stylers: [{ color: '#1a1a1a' }],
            },
            {
              featureType: 'all',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#a0a0a0' }],
            },
            {
              featureType: 'all',
              elementType: 'labels.text.stroke',
              stylers: [{ color: '#000000' }],
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#0a0a0a' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#1a1a1a' }],
            },
            {
              featureType: 'poi',
              elementType: 'geometry',
              stylers: [{ color: '#1a1a1a' }],
            },
          ],
        });

        // Add marker at exact property location
        markerRef.current = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: mapInstanceRef.current,
          title: propertyName,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#4A7C4A',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          animation: window.google.maps.Animation.DROP,
        });
      } catch (error) {
        console.error('Error initializing property map:', error);
      }
    };

    // Check if Google Maps is loaded
    if (window.google?.maps) {
      initializeMap();
    } else {
      // Poll for Google Maps to load
      let checkCount = 0;
      const maxChecks = 100;
      
      const checkGoogleMaps = setInterval(() => {
        checkCount++;
        if (window.google?.maps) {
          clearInterval(checkGoogleMaps);
          initializeMap();
        } else if (checkCount >= maxChecks) {
          clearInterval(checkGoogleMaps);
          console.error('Google Maps failed to load');
        }
      }, 100);

      return () => {
        clearInterval(checkGoogleMaps);
      };
    }

    return () => {
      // Cleanup
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, propertyName]);

  return (
    <div ref={mapRef} className="w-full h-full bg-charcoal-900" />
  );
}


