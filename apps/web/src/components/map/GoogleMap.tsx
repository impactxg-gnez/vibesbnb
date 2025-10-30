'use client';

import { useEffect, useRef, useState } from 'react';

interface MapProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  markers?: Array<{
    lat: number;
    lng: number;
    title?: string;
    icon?: string;
  }>;
  className?: string;
}

export function GoogleMap({ center, zoom = 14, markers = [], className = 'w-full h-96' }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps is available
    if (typeof window === 'undefined' || !(window as any).google) {
      return;
    }

    if (!mapRef.current) return;

    try {
      // Initialize map
      const googleMap = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      setMap(googleMap);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to load map');
    }
  }, []);

  useEffect(() => {
    if (!map) return;

    // Update center
    map.setCenter(center);
  }, [map, center]);

  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    // Add new markers
    markers.forEach((marker) => {
      new google.maps.Marker({
        position: { lat: marker.lat, lng: marker.lng },
        map,
        title: marker.title,
        icon: marker.icon || undefined,
      });
    });
  }, [map, markers]);

  if (error) {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
}

// Fallback component when Google Maps isn't loaded
export function MapFallback({ address, className = 'w-full h-96' }: { address: string; className?: string }) {
  return (
    <div className={`${className} bg-gray-100 rounded-lg flex flex-col items-center justify-center p-6`}>
      <svg
        className="w-16 h-16 text-gray-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <p className="text-gray-600 font-medium mb-2">Location</p>
      <p className="text-gray-500 text-sm text-center">{address}</p>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
      >
        View on Google Maps
      </a>
    </div>
  );
}

