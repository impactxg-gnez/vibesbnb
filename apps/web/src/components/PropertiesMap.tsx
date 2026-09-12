'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { toTravelerPrice } from '@/lib/platformPricing';
import { useTheme } from '@/contexts/ThemeContext';
import { MAP_BACKGROUND, mapStylesForTheme, markerColors } from '@/lib/googleMapStyles';

interface Property {
  id: string;
  name: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  price: number;
  images?: string[];
  status?: 'active' | 'draft' | 'inactive' | 'pending_approval';
}

interface PropertiesMapProps {
  properties: Property[];
  className?: string;
  height?: string;
  hoveredListingId?: string | null;
  /** Query string (without ?) appended to listing links, e.g. checkIn=...&checkOut=... */
  listingQuery?: string;
}

export default function PropertiesMap({
  properties,
  className = '',
  height = '600px',
  hoveredListingId,
  listingQuery = '',
}: PropertiesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const infoWindowsRef = useRef<Map<any, any>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Filter properties with coordinates - use useMemo to ensure stable reference
  const propertiesWithCoords = useMemo(() => {
    const filtered = properties
      .map(p => {
        let lat = p.coordinates?.lat;
        let lng = p.coordinates?.lng;

        if (lat === undefined || lng === undefined) {
          lat = p.latitude ?? p.lat;
          lng = p.longitude ?? p.lng;
        }

        if (lat !== undefined && lng !== undefined) {
          return {
            ...p,
            coordinates: {
              lat: typeof lat === 'string' ? parseFloat(lat) : lat,
              lng: typeof lng === 'string' ? parseFloat(lng) : lng
            }
          };
        }
        return null;
      })
      .filter((p): p is any =>
        p !== null &&
        typeof p.coordinates.lat === 'number' &&
        typeof p.coordinates.lng === 'number' &&
        !isNaN(p.coordinates.lat) &&
        !isNaN(p.coordinates.lng)
      );

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
      markersMapRef.current.clear();
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
        markersMapRef.current.clear();
        infoWindowsRef.current.clear();
      }
    }
  }, [properties, mapLoaded, listingQuery]); // Depend on properties array, not just propertiesWithCoords

  // Handle hovered property highlighting
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Reset all markers to default state
    const colors = markerColors(themeRef.current);
    markersRef.current.forEach(marker => {
      marker.setIcon({
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: colors.active,
        fillOpacity: 1,
        strokeColor: colors.stroke,
        strokeWeight: 2,
      });
      marker.setZIndex(1);
    });

    if (hoveredListingId) {
      const marker = markersMapRef.current.get(hoveredListingId);
      if (marker) {
        // Highlight marker
        marker.setIcon({
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12, // Bigger
          fillColor: colors.hover,
          fillOpacity: 1,
          strokeColor: colors.stroke,
          strokeWeight: 3,
        });
        marker.setZIndex(999); // Bring to front
        
        // Pan map to marker
        mapInstanceRef.current.panTo(marker.getPosition());
        // Optional: slight zoom if nice
        // mapInstanceRef.current.setZoom(15);
      }
    }
  }, [hoveredListingId, mapLoaded, theme]);

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
      backgroundColor: MAP_BACKGROUND[themeRef.current],
      styles: mapStylesForTheme(themeRef.current),
    });

    updateMarkers();
  };

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setOptions({
      styles: mapStylesForTheme(theme),
      backgroundColor: MAP_BACKGROUND[theme],
    });
    const colors = markerColors(theme);
    markersRef.current.forEach((marker) => {
      const icon = marker.getIcon?.();
      marker.setIcon({
        path: window.google?.maps?.SymbolPath?.CIRCLE ?? icon?.path,
        scale: icon?.scale ?? 8,
        fillColor: colors.active,
        fillOpacity: 1,
        strokeColor: colors.stroke,
        strokeWeight: icon?.strokeWeight ?? 2,
      });
    });
  }, [theme]);

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
    markersMapRef.current.clear();
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

    // Add markers for each property
    let markersCreated = 0;
    coordinateGroups.forEach((propertiesAtLocation, coordKey) => {
      propertiesAtLocation.forEach((property, index) => {
        if (!property.coordinates) return;

        // Add a tiny offset for overlapping markers to make them visible as separate blips
        let lat = property.coordinates.lat;
        let lng = property.coordinates.lng;
        
        if (propertiesAtLocation.length > 1) {
          // Spread markers out in a tiny circle if they overlap
          // The radius starts small and grows slightly with more properties
          const angle = (index / propertiesAtLocation.length) * 2 * Math.PI;
          const radius = 0.00008 * (1 + Math.floor(index / 8) * 0.5); // ~8-12 meters offset
          lat += radius * Math.cos(angle);
          // Adjust longitude for latitude to keep circle shape
          lng += (radius * Math.sin(angle)) / Math.cos(lat * Math.PI / 180);
        }

        const colors = markerColors(themeRef.current);
        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          title: property.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: property.status === 'active' ? colors.active : colors.draft,
            fillOpacity: 1,
            strokeColor: colors.stroke,
            strokeWeight: 2,
          },
        });

        const listingPath = (id: string) =>
          listingQuery ? `/listings/${id}?${listingQuery}` : `/listings/${id}`;

        // Create clickable info content
        let infoContent = '';
        if (propertiesAtLocation.length === 1) {
          // Single property - make entire info window clickable
          infoContent = `
            <div style="color: #000; min-width: 200px; cursor: pointer;" onclick="window.location.href='${listingPath(property.id)}'">
              <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px;">${property.name}</h3>
              <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${property.location}</p>
              <p style="margin: 0; font-weight: 600; color: ${markerColors(themeRef.current).active}; font-size: 16px;">$${toTravelerPrice(property.price)}/night</p>
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
                ${propertiesAtLocation.map((p) => `
                  <div style="padding: 8px 0; border-bottom: 1px solid #eee; cursor: pointer;" onclick="window.location.href='${listingPath(p.id)}'">
                    <h4 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${p.name}</h4>
                    <p style="margin: 0 0 2px 0; color: #666; font-size: 12px;">${p.location}</p>
                    <p style="margin: 0; font-weight: 600; color: ${markerColors(themeRef.current).active}; font-size: 14px;">$${toTravelerPrice(p.price)}/night</p>
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
        markersMapRef.current.set(property.id, marker); // Store mapping
        
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
      <div className={`bg-[#FAF3EA] border border-[#51372B]/15 rounded-xl p-12 text-center dark:bg-gray-900 dark:border-gray-800 ${className}`} style={{ height }}>
        <div className="text-6xl mb-4">🗺️</div>
        <h3 className="text-xl font-semibold text-[#193F25] mb-2 dark:text-white">No Properties with Coordinates</h3>
        <p className="text-[#6B5346] dark:text-gray-400">
          Add map coordinates to your properties to see them on the map
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-[#FAF3EA] border border-[#51372B]/15 rounded-xl overflow-hidden flex flex-col dark:bg-gray-900 dark:border-gray-800 ${className}`}
      style={{ height }}
    >
      <div
        ref={mapRef}
        className="w-full flex-1 min-h-0"
        role="application"
        aria-label="Map of available stays. Use the listing list below for keyboard access."
      />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FAF3EA] dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#193F25] dark:border-emerald-500 mx-auto mb-4" aria-hidden />
            <p className="text-[#193F25] dark:text-white" role="status">Loading map...</p>
          </div>
        </div>
      )}
      <div className="border-t border-[#51372B]/15 max-h-40 overflow-y-auto bg-[#F4E6D4] shrink-0 dark:border-white/10 dark:bg-gray-950">
        <h3 className="sr-only">Listings on map</h3>
        <ul className="divide-y divide-white/5">
          {propertiesWithCoords.map((p: Property & { coordinates: { lat: number; lng: number } }) => {
            const qs = listingQuery ? `?${listingQuery}` : '';
            return (
              <li key={p.id}>
                <a
                  href={`/listings/${p.id}${qs}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-white/5 focus-visible:bg-white/10"
                >
                  <span className="font-semibold text-white truncate">{p.name}</span>
                  <span className="text-primary-500 font-bold tabular-nums shrink-0">
                    ${Math.round(toTravelerPrice(Number(p.price) || 0))}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

