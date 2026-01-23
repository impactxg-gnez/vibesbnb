'use client';

import { useEffect, useRef, useState, useMemo } from 'react';

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

  // Filter properties with coordinates - use useMemo to ensure stable reference
  const propertiesWithCoords = useMemo(() => {
    const filtered = properties.filter(p => p.coordinates &&
      typeof p.coordinates.lat === 'number' &&
      typeof p.coordinates.lng === 'number' &&
      !isNaN(p.coordinates.lat) &&
      !isNaN(p.coordinates.lng));

    console.log('[PropertiesMap] Filtered properties with coords:', {
      totalProperties: properties.length,
      withCoords: filtered.length,
      sample: filtered.slice(0, 3).map(p => ({ id: p.id, name: p.name, coords: p.coordinates })),
    });

    return filtered;
  }, [properties]);

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
  }, [propertiesWithCoords.length]); // Only initialize once when we first get properties

  // Update map when properties change (for filter updates)
  useEffect(() => {
    console.log('[PropertiesMap] Properties changed effect triggered:', {
      mapLoaded,
      hasMapInstance: !!mapInstanceRef.current,
      propertiesCount: properties.length,
      propertiesWithCoordsCount: propertiesWithCoords.length,
    });

    if (mapLoaded && mapInstanceRef.current) {
      if (propertiesWithCoords.length > 0) {
        console.log('[PropertiesMap] Calling updateMarkers with', propertiesWithCoords.length, 'properties');
        updateMarkers();
      } else {
        // Clear all markers if no properties with coordinates
        console.log('[PropertiesMap] No properties with coordinates, clearing markers');
        markersRef.current.forEach(marker => {
          if (marker && marker.setMap) {
            marker.setMap(null);
          }
        });
        markersRef.current = [];
        infoWindowsRef.current.clear();
      }
    }
  }, [properties, mapLoaded]); // Depend on properties array, not just propertiesWithCoords

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
      gestureHandling: 'greedy', // Enable scroll zoom without Ctrl key
      scrollwheel: true, // Enable mouse wheel zoom
      disableDoubleClickZoom: false, // Allow double-click zoom
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

    console.log('[PropertiesMap] updateMarkers called with:', {
      totalProperties: properties.length,
      propertiesWithCoords: propertiesWithCoords.length,
      coords: propertiesWithCoords.map(p => ({
        id: p.id,
        name: p.name,
        coords: p.coordinates,
      })),
    });

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];
    infoWindowsRef.current.clear();

    // Create bounds to fit all markers
    const bounds = new window.google.maps.LatLngBounds();

    // Group properties by coordinates to handle duplicates
    const coordinateGroups = new Map<string, typeof propertiesWithCoords>();
    propertiesWithCoords.forEach((property) => {
      if (!property.coordinates) {
        console.warn('[PropertiesMap] Property missing coordinates:', property);
        return;
      }
      const key = `${property.coordinates.lat.toFixed(6)},${property.coordinates.lng.toFixed(6)}`;
      if (!coordinateGroups.has(key)) {
        coordinateGroups.set(key, []);
      }
      coordinateGroups.get(key)!.push(property);
    });

    console.log('[PropertiesMap] Coordinate groups:', {
      uniqueLocations: coordinateGroups.size,
      totalProperties: propertiesWithCoords.length,
      groups: Array.from(coordinateGroups.entries()).map(([key, props]) => ({
        coords: key,
        count: props.length,
        properties: props.map(p => p.name),
      })),
    });

    // Add markers for each property with offset for duplicates
    let markersCreated = 0;
    coordinateGroups.forEach((propertiesAtLocation, coordKey) => {
      propertiesAtLocation.forEach((property, index) => {
        if (!property.coordinates) return;

        // Calculate offset for properties at the same location
        // Use a smaller offset (about 30 meters) so markers don't overlap but stay close
        const offsetDistance = propertiesAtLocation.length > 1 ? 0.0003 : 0; // ~30 meters for duplicates
        const angle = propertiesAtLocation.length > 1
          ? (index * (360 / propertiesAtLocation.length)) * (Math.PI / 180)
          : 0;
        const offsetLat = property.coordinates.lat + (offsetDistance * Math.cos(angle));
        const offsetLng = property.coordinates.lng + (offsetDistance * Math.sin(angle));

        const marker = new window.google.maps.Marker({
          position: {
            lat: offsetLat,
            lng: offsetLng,
          },
          map: mapInstanceRef.current,
          title: propertiesAtLocation.length > 1
            ? `${property.name} (${propertiesAtLocation.length} properties at this location)`
            : property.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: property.status === 'active' ? '#10b981' : '#f59e0b',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        // Create clickable info content
        let infoContent = '';
        if (propertiesAtLocation.length === 1) {
          // Single property - make entire info window clickable
          infoContent = `
            <div style="color: #000; min-width: 200px; cursor: pointer;" onclick="window.location.href='/listings/${property.id}'">
              <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px;">${property.name}</h3>
              <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${property.location}</p>
              <p style="margin: 0; font-weight: 600; color: #10b981; font-size: 16px;">$${property.price}/night</p>
              ${property.status ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: ${property.status === 'active' ? '#10b981' : '#f59e0b'};">
                ${property.status === 'active' ? '✓ Published' : 'Draft'}
              </p>` : ''}
            </div>
          `;
        } else {
          // Multiple properties - make each property in the list clickable
          infoContent = `
            <div style="color: #000; min-width: 250px; max-width: 300px;">
              <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: #666;">${propertiesAtLocation.length} Properties at this location</h3>
              <div style="max-height: 300px; overflow-y: auto;">
                ${propertiesAtLocation.map((p, idx) => `
                  <div style="padding: 8px 0; border-bottom: 1px solid #eee; cursor: pointer;" onclick="window.location.href='/listings/${p.id}'">
                    <h4 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${p.name}</h4>
                    <p style="margin: 0 0 2px 0; color: #666; font-size: 12px;">${p.location}</p>
                    <p style="margin: 0; font-weight: 600; color: #10b981; font-size: 14px;">$${p.price}/night</p>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }

        const infoWindow = new window.google.maps.InfoWindow({
          content: infoContent,
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
        // Use original coordinates for bounds, not offset
        bounds.extend({
          lat: property.coordinates.lat,
          lng: property.coordinates.lng,
        });
        markersCreated++;
      });
    });

    console.log('[PropertiesMap] Markers created:', markersCreated, 'out of', propertiesWithCoords.length);

    // Fit map to show all markers
    if (propertiesWithCoords.length > 0) {
      if (propertiesWithCoords.length === 1) {
        // Single property: center and zoom in
        const singleProperty = propertiesWithCoords[0];
        if (singleProperty.coordinates) {
          mapInstanceRef.current.setCenter({
            lat: singleProperty.coordinates.lat,
            lng: singleProperty.coordinates.lng,
          });
          mapInstanceRef.current.setZoom(15);
        }
      } else {
        // Multiple properties: fit bounds
        // Add padding to ensure all markers are visible
        mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
        console.log('[PropertiesMap] Fitted bounds for', propertiesWithCoords.length, 'markers');
      }
    } else {
      console.warn('[PropertiesMap] No properties with coordinates to display');
    }
  };

  if (propertiesWithCoords.length === 0) {
    return (
      <div className={`bg-gray-900 border border-gray-800 rounded-xl p-12 text-center ${className}`} style={{ height }}>
        <div className="text-6xl mb-4">🗺️</div>
        <h3 className="text-xl font-semibold text-white mb-2">No Properties with Coordinates</h3>
        <p className="text-gray-400">
          Add map coordinates to your properties to see them on the map
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden ${className}`} style={{ height }}>
      <div ref={mapRef} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-white">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

