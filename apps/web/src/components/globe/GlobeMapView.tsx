'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface Property {
    id: string;
    name: string;
    price: number;
    latitude: number;
    longitude: number;
    location: string;
    image: string;
    description: string;
}

interface GlobeMapViewProps {
    properties: Property[];
    centerCoordinates: { lat: number; lng: number };
    selectedProperties: Property[];
    onToggleGlobe: () => void;
}

export function GlobeMapView({
    properties,
    centerCoordinates,
    selectedProperties,
    onToggleGlobe,
}: GlobeMapViewProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const infoWindowsRef = useRef<Map<any, any>>(new Map());
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const zoomListenerRef = useRef<any>(null);
    const router = useRouter();

    // Convert properties to map format with coordinates, filter out invalid ones
    const propertiesWithCoords = useMemo(() => {
        return properties
            .filter(p => p.latitude != null && p.longitude != null && !isNaN(p.latitude) && !isNaN(p.longitude))
            .map(p => ({
                ...p,
                coordinates: { lat: p.latitude, lng: p.longitude },
            }));
    }, [properties]);

    useEffect(() => {
        // Check if Google Maps is already loaded
        if (typeof window === 'undefined') {
            return;
        }

        setIsInitializing(true);
        setMapError(null);

        const initializeMapWhenReady = () => {
            if (window.google?.maps && mapRef.current && !mapInstanceRef.current) {
                try {
                    initializeMap();
                    setMapLoaded(true);
                    setMapError(null);
                    setIsInitializing(false);
                } catch (error: any) {
                    console.error('Error initializing map:', error);
                    setMapError(error?.message || 'Failed to initialize map');
                    setMapLoaded(false);
                    setIsInitializing(false);
                }
            }
        };

        // Check if already loaded
        if (window.google?.maps) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                initializeMapWhenReady();
            }, 100);
            return () => clearTimeout(timer);
        } else {
            // Poll for Google Maps to load
            let checkCount = 0;
            const maxChecks = 100; // 10 seconds max (100 * 100ms)
            
            const checkGoogleMaps = setInterval(() => {
                checkCount++;
                if (window.google?.maps) {
                    clearInterval(checkGoogleMaps);
                    initializeMapWhenReady();
                } else if (checkCount >= maxChecks) {
                    clearInterval(checkGoogleMaps);
                    console.error('Google Maps failed to load after timeout');
                    setMapError('Google Maps failed to load. Please refresh the page.');
                    setMapLoaded(false);
                    setIsInitializing(false);
                }
            }, 100);

            return () => {
                clearInterval(checkGoogleMaps);
            };
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
            // Cleanup zoom listener
            if (zoomListenerRef.current && window.google?.maps) {
                window.google.maps.event.removeListener(zoomListenerRef.current);
                zoomListenerRef.current = null;
            }
            markersRef.current = [];
            infoWindowsRef.current.clear();
        };
    }, []);

    useEffect(() => {
        if (mapLoaded && mapInstanceRef.current) {
            try {
                // Always update markers when properties are available
                updateMarkers();
                // Always update center and zoom
                mapInstanceRef.current.panTo(centerCoordinates);
                const zoomLevel = selectedProperties.length > 0 
                    ? (selectedProperties.length === 1 ? 15 : selectedProperties.length <= 3 ? 12 : 10)
                    : (propertiesWithCoords.length === 1 ? 15 : propertiesWithCoords.length <= 5 ? 12 : 10);
                
                // Set zoom level
                mapInstanceRef.current.setZoom(zoomLevel);
                
                // Ensure zoom listener is active (re-add if it was removed)
                if (!zoomListenerRef.current && mapInstanceRef.current) {
                    zoomListenerRef.current = mapInstanceRef.current.addListener('zoom_changed', () => {
                        if (mapInstanceRef.current) {
                            const currentZoom = mapInstanceRef.current.getZoom();
                            // If zoomed out to level 6 or below (about 4 zoom outs from typical starting zoom of 10)
                            // Return to globe view
                            if (currentZoom <= 6) {
                                // Remove listener to prevent multiple calls
                                if (zoomListenerRef.current && window.google?.maps) {
                                    window.google.maps.event.removeListener(zoomListenerRef.current);
                                    zoomListenerRef.current = null;
                                }
                                // Switch back to globe view
                                onToggleGlobe();
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('Error updating map view:', error);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapLoaded, propertiesWithCoords.length, selectedProperties.length]);

    const initializeMap = () => {
        if (!mapRef.current || !window.google?.maps) {
            return;
        }

        // If no properties, still show map centered on coordinates
        if (propertiesWithCoords.length === 0) {
            mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
                center: centerCoordinates,
                zoom: 10,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: true,
                zoomControlOptions: {
                    position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
                },
                gestureHandling: 'greedy', // Allow scroll/touch zoom without Ctrl key
                disableDefaultUI: false,
                styles: [
                    {
                        featureType: 'all',
                        elementType: 'geometry',
                        stylers: [{ color: '#1a1a1a' }], // charcoal-900
                    },
                    {
                        featureType: 'all',
                        elementType: 'labels.text.fill',
                        stylers: [{ color: '#f5f5f3' }], // mist-100
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
                        stylers: [{ color: '#0f0f0f' }], // charcoal-950
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
            return;
        }

        // Use centerCoordinates if provided, otherwise calculate from properties
        const center = centerCoordinates || (() => {
            const avgLat = propertiesWithCoords.reduce((sum, p) => sum + (p.coordinates?.lat || 0), 0) / propertiesWithCoords.length;
            const avgLng = propertiesWithCoords.reduce((sum, p) => sum + (p.coordinates?.lng || 0), 0) / propertiesWithCoords.length;
            return { lat: avgLat, lng: avgLng };
        })();

        // Calculate zoom level based on selected properties
        const initialZoom = selectedProperties.length > 0
            ? (selectedProperties.length === 1 ? 15 : selectedProperties.length <= 3 ? 12 : 10)
            : 10;

        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: center,
            zoom: initialZoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            zoomControlOptions: {
                position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
            },
            gestureHandling: 'greedy', // Allow scroll/touch zoom without Ctrl key
            disableDefaultUI: false,
            styles: [
                {
                    featureType: 'all',
                    elementType: 'geometry',
                    stylers: [{ color: '#1a1a1a' }], // charcoal-900
                },
                {
                    featureType: 'all',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#f5f5f3' }], // mist-100
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
                    stylers: [{ color: '#0f0f0f' }], // charcoal-950
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

        // Smooth zoom animation after a brief delay
        setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.panTo(center);
                mapInstanceRef.current.setZoom(initialZoom);
                
                // Add zoom change listener to return to globe when zoomed out enough
                // Only add if not already added
                if (!zoomListenerRef.current) {
                    zoomListenerRef.current = mapInstanceRef.current.addListener('zoom_changed', () => {
                        if (mapInstanceRef.current) {
                            const currentZoom = mapInstanceRef.current.getZoom();
                            // If zoomed out to level 6 or below (about 4 zoom outs from typical starting zoom of 10)
                            // Return to globe view
                            if (currentZoom <= 6) {
                                // Remove listener to prevent multiple calls
                                if (zoomListenerRef.current && window.google?.maps) {
                                    window.google.maps.event.removeListener(zoomListenerRef.current);
                                    zoomListenerRef.current = null;
                                }
                                // Switch back to globe view
                                onToggleGlobe();
                            }
                        }
                    });
                }
            }
        }, 100);

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
        infoWindowsRef.current.clear();

        // Create bounds to fit all markers
        const bounds = new window.google.maps.LatLngBounds();

        // Add markers for each property
        propertiesWithCoords.forEach((property) => {
            if (!property.coordinates) return;

            // Highlight selected properties with different color
            const isSelected = selectedProperties.some(p => p.id === property.id);
            
            const marker = new window.google.maps.Marker({
                position: {
                    lat: property.coordinates.lat,
                    lng: property.coordinates.lng,
                },
                map: mapInstanceRef.current,
                title: property.name,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: isSelected ? 12 : 10, // Larger markers for better visibility
                    fillColor: isSelected ? '#4A7C4A' : '#4A7C4A', // earth-500
                    fillOpacity: isSelected ? 1 : 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: isSelected ? 3 : 2,
                },
                animation: window.google.maps.Animation.DROP, // Drop animation for markers
            });

            // Create custom styled info window
            const infoWindow = new window.google.maps.InfoWindow({
                content: `
                    <div style="color: #f5f5f3; min-width: 250px; background: rgba(15, 15, 15, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; backdrop-filter: blur(10px);">
                        <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 18px; color: #f5f5f3;">${property.name}</h3>
                        <p style="margin: 0 0 8px 0; color: #4A7C4A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">${property.location}</p>
                        <p style="margin: 0 0 12px 0; color: #a0a0a0; font-size: 14px; line-height: 1.4;">${property.description ? property.description.substring(0, 100) + '...' : 'No description available'}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="margin: 0; font-weight: 700; color: #4A7C4A; font-size: 20px;">$${property.price} <span style="font-weight: 400; font-size: 14px; color: #a0a0a0;">/ night</span></p>
                            <button onclick="window.open('/listings/${property.id}', '_blank')" style="background: #4A7C4A; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: background 0.2s;" onmouseover="this.style.background='#3a6a3a'" onmouseout="this.style.background='#4A7C4A'">View</button>
                        </div>
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

            // Store info window
            infoWindowsRef.current.set(marker, infoWindow);
            markersRef.current.push(marker);
            bounds.extend({
                lat: property.coordinates.lat,
                lng: property.coordinates.lng,
            });
        });

        // Fit map to show all markers
        if (selectedProperties.length > 0) {
            // If we have selected properties, fit to those
            const selectedBounds = new window.google.maps.LatLngBounds();
            selectedProperties.forEach(prop => {
                selectedBounds.extend({
                    lat: prop.latitude,
                    lng: prop.longitude,
                });
            });
            // Add padding for better view
            if (selectedProperties.length > 1) {
                mapInstanceRef.current.fitBounds(selectedBounds, { padding: 50 });
            }
        } else if (propertiesWithCoords.length > 0) {
            // Fit to all properties with padding - show all available properties
            if (propertiesWithCoords.length > 1) {
                mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
            } else {
                // Single property - center on it with appropriate zoom
                const singleProp = propertiesWithCoords[0];
                mapInstanceRef.current.setCenter({
                    lat: singleProp.coordinates.lat,
                    lng: singleProp.coordinates.lng,
                });
                mapInstanceRef.current.setZoom(15);
            }
        }
    };

    // Show error state
    if (mapError) {
        return (
            <div className="relative w-full h-full flex items-center justify-center bg-charcoal-950 min-h-screen">
                <div className="text-center p-8">
                    <p className="text-mist-100 text-lg mb-4">{mapError}</p>
                    <button
                        onClick={() => {
                            setMapError(null);
                            setMapLoaded(false);
                            setIsInitializing(true);
                            mapInstanceRef.current = null;
                            // Retry initialization
                            if (window.google?.maps && mapRef.current) {
                                try {
                                    initializeMap();
                                    setMapLoaded(true);
                                    setIsInitializing(false);
                                } catch (error: any) {
                                    setMapError(error?.message || 'Failed to initialize map');
                                    setMapLoaded(false);
                                    setIsInitializing(false);
                                }
                            } else {
                                // Reload page if Google Maps not available
                                window.location.reload();
                            }
                        }}
                        className="bg-earth-500 text-white px-6 py-3 rounded-full hover:bg-earth-600 transition-colors mb-4"
                    >
                        Retry
                    </button>
                    <button
                        onClick={onToggleGlobe}
                        className="block w-full text-mist-400 hover:text-mist-100 text-sm underline"
                    >
                        Back to Globe
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full min-h-screen bg-charcoal-950">
            <div ref={mapRef} className="w-full h-full min-h-screen" />
            {(isInitializing || !mapLoaded) && (
                <div className="absolute inset-0 flex items-center justify-center bg-charcoal-950 z-50">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-r-2 border-earth-500 mx-auto mb-4" />
                        <p className="text-mist-100 text-lg font-light tracking-[0.3em]">Loading map...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

