'use client';

import { useEffect, useRef, useState } from 'react';

interface Property {
  id: string;
  name: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  price: number;
  images?: string[];
  status?: 'active' | 'draft' | 'inactive';
}

interface PropertiesMapProps {
  properties: Property[];
  className?: string;
  height?: string;
}

export default function PropertiesMap({ 
  properties, 
  className = '', 
  height = '600px' 
}: PropertiesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowsRef = useRef<Map<any, any>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter properties with coordinates
  const propertiesWithCoords = properties.filter(p => p.coordinates);

  useEffect(() => {
    if (propertiesWithCoords.length === 0) {
      return;
    }

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
      // Cleanup markers and info windows
      markersRef.current.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      infoWindowsRef.current.forEach(infoWindow => {
        if (infoWindow && infoWindow.close) {
          infoWindow.close();
        }
      });
      markersRef.current = [];
      infoWindowsRef.current.clear();
    };
  }, [propertiesWithCoords.length]);

  useEffect(() => {
    if (mapLoaded && mapInstanceRef.current && propertiesWithCoords.length > 0) {
      updateMarkers();
    }
  }, [propertiesWithCoords, mapLoaded]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps || propertiesWithCoords.length === 0) {
      return;
    }

    // Calculate center from all properties
    const avgLat = propertiesWithCoords.reduce((sum, p) => sum + (p.coordinates?.lat || 0), 0) / propertiesWithCoords.length;
    const avgLng = propertiesWithCoords.reduce((sum, p) => sum + (p.coordinates?.lng || 0), 0) / propertiesWithCoords.length;

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: avgLat, lng: avgLng },
      zoom: propertiesWithCoords.length === 1 ? 15 : 10,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'all',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#ffffff' }],
        },
        {
          featureType: 'all',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#000000' }, { visibility: 'on' }],
        },
        {
          featureType: 'all',
          elementType: 'labels.icon',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'landscape',
          elementType: 'geometry',
          stylers: [{ color: '#1a1a1a' }],
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#0a0a0a' }],
        },
      ],
    });

    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !window.google?.maps) {
      return;
    }

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];

    // Create bounds to fit all markers
    const bounds = new window.google.maps.LatLngBounds();

    // Add markers for each property
    propertiesWithCoords.forEach((property) => {
      if (!property.coordinates) return;

      const marker = new window.google.maps.Marker({
        position: {
          lat: property.coordinates.lat,
          lng: property.coordinates.lng,
        },
        map: mapInstanceRef.current,
        title: property.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: property.status === 'active' ? '#10b981' : '#f59e0b',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      // Create info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="color: #000; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px;">${property.name}</h3>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${property.location}</p>
            <p style="margin: 0; font-weight: 600; color: #10b981; font-size: 16px;">$${property.price}/night</p>
            ${property.status ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: ${property.status === 'active' ? '#10b981' : '#f59e0b'};">
              ${property.status === 'active' ? '✓ Published' : 'Draft'}
            </p>` : ''}
          </div>
        `,
      });

      marker.addListener('click', () => {
        // Close all other info windows
        infoWindowsRef.current.forEach(iw => {
          if (iw && iw.close) {
            iw.close();
          }
        });
        infoWindow.open(mapInstanceRef.current, marker);
      });

      // Store info window in a Map
      infoWindowsRef.current.set(marker, infoWindow);
      markersRef.current.push(marker);
      bounds.extend({
        lat: property.coordinates.lat,
        lng: property.coordinates.lng,
      });
    });

    // Fit map to show all markers
    if (propertiesWithCoords.length > 1) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  };

  if (propertiesWithCoords.length === 0) {
    return (
      <div className={`bg-charcoal-900 border border-charcoal-800 rounded-xl p-12 text-center ${className}`} style={{ height }}>
        <div className="text-6xl mb-4">🗺️</div>
        <h3 className="text-xl font-semibold text-white mb-2">No Properties with Coordinates</h3>
        <p className="text-mist-400">
          Add map coordinates to your properties to see them on the map
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-charcoal-900 border border-charcoal-800 rounded-xl overflow-hidden ${className}`} style={{ height }}>
      <div ref={mapRef} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-charcoal-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-earth-500 mx-auto mb-4"></div>
            <p className="text-white">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

