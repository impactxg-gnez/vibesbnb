'use client';

import { useEffect, useRef, useState } from 'react';
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
    const router = useRouter();

    // Convert properties to map format with coordinates
    const propertiesWithCoords = properties.map(p => ({
        ...p,
        coordinates: { lat: p.latitude, lng: p.longitude },
    }));

    useEffect(() => {
        if (propertiesWithCoords.length === 0) {
            return;
        }

        // Check if Google Maps is already loaded
        if (typeof window === 'undefined' || !window.google?.maps) {
            // Wait for Google Maps to load (it should be loaded in layout.tsx)
            const checkGoogleMaps = setInterval(() => {
                if (window.google?.maps) {
                    clearInterval(checkGoogleMaps);
                    setMapLoaded(true);
                    initializeMap();
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkGoogleMaps);
                if (!window.google?.maps) {
                    console.error('Google Maps failed to load');
                }
            }, 10000);

            return () => clearInterval(checkGoogleMaps);
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
    }, []);

    useEffect(() => {
        if (mapLoaded && mapInstanceRef.current && propertiesWithCoords.length > 0) {
            updateMarkers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapLoaded, propertiesWithCoords.length]);

    // Handle center coordinates and selected properties changes
    useEffect(() => {
        if (mapLoaded && mapInstanceRef.current) {
            // Smooth zoom to center coordinates
            mapInstanceRef.current.panTo(centerCoordinates);
            // Calculate appropriate zoom level based on selected properties
            const zoomLevel = selectedProperties.length > 0 
                ? (selectedProperties.length === 1 ? 15 : selectedProperties.length <= 3 ? 12 : 10)
                : (propertiesWithCoords.length === 1 ? 15 : propertiesWithCoords.length <= 5 ? 12 : 10);
            mapInstanceRef.current.setZoom(zoomLevel);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapLoaded, centerCoordinates.lat, centerCoordinates.lng, selectedProperties.length]);

    const initializeMap = () => {
        if (!mapRef.current || !window.google?.maps || propertiesWithCoords.length === 0) {
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
                    scale: isSelected ? 10 : 8,
                    fillColor: isSelected ? '#4A7C4A' : '#4A7C4A', // earth-500
                    fillOpacity: isSelected ? 1 : 0.8,
                    strokeColor: '#ffffff',
                    strokeWeight: isSelected ? 3 : 2,
                },
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

        // Fit map to show all markers if there are multiple
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
            mapInstanceRef.current.fitBounds(selectedBounds, { padding: 50 });
        } else if (propertiesWithCoords.length > 1) {
            // Fit to all properties with padding
            mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
        }
    };

    return (
        <div className="relative w-full h-full">
            <div ref={mapRef} className="w-full h-full" />
            {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-charcoal-950">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-r-2 border-earth-500 mx-auto mb-4" />
                        <p className="text-mist-100 text-lg font-light tracking-[0.3em]">Loading map...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

