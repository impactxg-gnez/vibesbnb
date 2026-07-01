'use client';

import { useEffect, useRef } from 'react';

/** Approximate stay area shown on the listing map (meters). */
export const PROPERTY_MAP_APPROX_RADIUS_METERS = 20;

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  propertyName: string;
  /** Circle radius in meters; defaults to 20m privacy buffer. */
  approximateRadiusMeters?: number;
}

export function PropertyMap({
  latitude,
  longitude,
  propertyName,
  approximateRadiusMeters = PROPERTY_MAP_APPROX_RADIUS_METERS,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    const applyCircle = (map: google.maps.Map) => {
      const center = { lat: latitude, lng: longitude };

      if (circleRef.current) {
        circleRef.current.setCenter(center);
        circleRef.current.setRadius(approximateRadiusMeters);
        circleRef.current.setMap(map);
      } else {
        circleRef.current = new window.google.maps.Circle({
          map,
          center,
          radius: approximateRadiusMeters,
          strokeColor: '#4A7C4A',
          strokeOpacity: 0.95,
          strokeWeight: 2,
          fillColor: '#4A7C4A',
          fillOpacity: 0.28,
          clickable: false,
        });
      }

      map.setCenter(center);
      const bounds = circleRef.current.getBounds();
      if (bounds) {
        map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
      }
    };

    const initializeMap = () => {
      if (!window.google?.maps || !mapRef.current) return;

      try {
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: { lat: latitude, lng: longitude },
            zoom: 17,
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
            minZoom: 14,
            maxZoom: 18,
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
        }

        applyCircle(mapInstanceRef.current);
      } catch (error) {
        console.error('Error initializing property map:', error);
      }
    };

    if (window.google?.maps) {
      initializeMap();
    } else {
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
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, propertyName, approximateRadiusMeters]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full bg-charcoal-900"
      role="img"
      aria-label={`Approximate map location for ${propertyName} (${approximateRadiusMeters} meter area)`}
    />
  );
}
