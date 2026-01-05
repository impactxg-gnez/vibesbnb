'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

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

interface Cluster {
    id: string;
    properties: Property[];
    center: { lat: number; lng: number };
    count: number;
}

interface GlobeMapViewProps {
    properties: Property[];
    centerCoordinates: { lat: number; lng: number };
    selectedProperties: Property[];
    onToggleGlobe: () => void;
    onPropertySelect?: (property: Property) => void;
}

export function GlobeMapView({
    properties,
    centerCoordinates,
    selectedProperties,
    onToggleGlobe,
    onPropertySelect,
}: GlobeMapViewProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const infoWindowsRef = useRef<Map<any, any>>(new Map());
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [showPropertySelector, setShowPropertySelector] = useState(true);
    const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);
    const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
    const [currentZoom, setCurrentZoom] = useState<number>(10);
    const [isTransitioningToGlobe, setIsTransitioningToGlobe] = useState(false);
    const zoomListenerRef = useRef<any>(null);
    const clusterMarkersRef = useRef<any[]>([]);
    const prevCenterRef = useRef<{ lat: number; lng: number } | null>(null);
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

    // Clustering function - groups nearby properties
    const clusterProperties = useMemo(() => {
        // Distance threshold for clustering (in degrees, roughly 0.01 = ~1km)
        const clusterDistance = 0.01;
        const clusters: Cluster[] = [];
        const usedProperties = new Set<string>();
        
        propertiesWithCoords.forEach(property => {
            if (usedProperties.has(property.id)) return;
            
            // Find nearby properties
            const nearbyProperties = propertiesWithCoords.filter(p => {
                if (usedProperties.has(p.id)) return false;
                const latDiff = Math.abs(property.coordinates.lat - p.coordinates.lat);
                const lngDiff = Math.abs(property.coordinates.lng - p.coordinates.lng);
                return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) < clusterDistance;
            });
            
            if (nearbyProperties.length > 1) {
                // Create cluster
                const avgLat = nearbyProperties.reduce((sum, p) => sum + p.coordinates.lat, 0) / nearbyProperties.length;
                const avgLng = nearbyProperties.reduce((sum, p) => sum + p.coordinates.lng, 0) / nearbyProperties.length;
                
                clusters.push({
                    id: `cluster-${property.id}`,
                    properties: nearbyProperties,
                    center: { lat: avgLat, lng: avgLng },
                    count: nearbyProperties.length,
                });
                
                nearbyProperties.forEach(p => usedProperties.add(p.id));
            }
        });
        
        // Individual properties (not in clusters)
        const individualProperties = propertiesWithCoords.filter(p => !usedProperties.has(p.id));
        
        return { clusters, individualProperties };
    }, [propertiesWithCoords]);

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
                    // Reset transition flag when map initializes
                    setIsTransitioningToGlobe(false);
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

    // Handle property selection - filter markers and move map to selected property
    useEffect(() => {
        if (mapLoaded && mapInstanceRef.current) {
            // Update markers to reflect filtering
            updateMarkers();
            
            if (selectedPropertyId) {
                const selectedProperty = propertiesWithCoords.find(p => p.id === selectedPropertyId);
                if (selectedProperty && selectedProperty.coordinates) {
                    try {
                        // Pan to selected property with smooth animation
                        mapInstanceRef.current.panTo({
                            lat: selectedProperty.coordinates.lat,
                            lng: selectedProperty.coordinates.lng,
                        });
                        // Zoom in to show property clearly
                        mapInstanceRef.current.setZoom(15);
                        
                        // Open info window for selected property after a brief delay to ensure marker is created
                        setTimeout(() => {
                            // Don't open if transitioning to globe
                            if (isTransitioningToGlobe) return;
                            
                            const marker = markersRef.current.find(m => {
                                const pos = m.getPosition();
                                return pos && 
                                       Math.abs(pos.lat() - selectedProperty.coordinates.lat) < 0.001 &&
                                       Math.abs(pos.lng() - selectedProperty.coordinates.lng) < 0.001;
                            });
                            if (marker && !isTransitioningToGlobe) {
                                const infoWindow = infoWindowsRef.current.get(marker);
                                if (infoWindow) {
                                    // Close all other info windows
                                    infoWindowsRef.current.forEach(iw => {
                                        if (iw && iw.close && iw !== infoWindow) {
                                            iw.close();
                                        }
                                    });
                                    infoWindow.open(mapInstanceRef.current, marker);
                                    setIsInfoWindowOpen(true);
                                }
                            }
                        }, 100);
                        
                        // Call onPropertySelect callback if provided
                        if (onPropertySelect) {
                            const fullProperty = properties.find(p => p.id === selectedPropertyId);
                            if (fullProperty) {
                                onPropertySelect(fullProperty);
                            }
                        }
                    } catch (error) {
                        console.error('Error moving to selected property:', error);
                    }
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPropertyId, mapLoaded]);

    useEffect(() => {
        if (mapLoaded && mapInstanceRef.current) {
            try {
                // Always update markers when properties are available (this will handle filtering)
                updateMarkers();
                
                // Check if center has changed
                const centerChanged = !prevCenterRef.current || 
                    Math.abs(prevCenterRef.current.lat - centerCoordinates.lat) > 0.0001 || 
                    Math.abs(prevCenterRef.current.lng - centerCoordinates.lng) > 0.0001;
                
                // Only update center/zoom if no specific property is selected
                if (!selectedPropertyId) {
                    if (centerChanged && prevCenterRef.current) {
                        // Smooth pan to new location when center changes (prevents white screen)
                        mapInstanceRef.current.panTo({
                            lat: centerCoordinates.lat,
                            lng: centerCoordinates.lng,
                        });
                    } else if (!prevCenterRef.current) {
                        // First load - set center immediately
                        mapInstanceRef.current.setCenter(centerCoordinates);
                    }
                    
                    const zoomLevel = selectedProperties.length > 0 
                        ? (selectedProperties.length === 1 ? 15 : selectedProperties.length <= 3 ? 12 : 10)
                        : (propertiesWithCoords.length === 1 ? 15 : propertiesWithCoords.length <= 5 ? 12 : 10);
                    
                    // Set zoom level smoothly
                    if (centerChanged || !prevCenterRef.current) {
                        mapInstanceRef.current.setZoom(zoomLevel);
                    }
                    
                    // Update previous center reference
                    prevCenterRef.current = { ...centerCoordinates };
                }
                
                // Ensure zoom listener is active (re-add if it was removed)
                if (!zoomListenerRef.current && mapInstanceRef.current) {
                    zoomListenerRef.current = mapInstanceRef.current.addListener('zoom_changed', () => {
                        if (mapInstanceRef.current) {
                            const currentZoom = mapInstanceRef.current.getZoom();
                            setCurrentZoom(currentZoom);
                            // If zoomed out to level 6 or below (about 4 zoom outs from typical starting zoom of 10)
                            // Return to globe view
                            if (currentZoom <= 6) {
                                // Close all info windows explicitly
                                infoWindowsRef.current.forEach(iw => {
                                    if (iw && iw.close) {
                                        iw.close();
                                    }
                                });
                                
                                // Close any open modals/clusters
                                setSelectedCluster(null);
                                setIsInfoWindowOpen(false);
                                
                                // Remove listener to prevent multiple calls
                                if (zoomListenerRef.current && window.google?.maps) {
                                    window.google.maps.event.removeListener(zoomListenerRef.current);
                                    zoomListenerRef.current = null;
                                }
                                
                                // Small delay to ensure all windows are closed before switching
                                setTimeout(() => {
                                    // Switch back to globe view immediately
                                    onToggleGlobe();
                                }, 50);
                            } else {
                                // Close cluster modal if open when zooming (but not info windows)
                                if (selectedCluster) {
                                    setSelectedCluster(null);
                                }
                                // Update markers when zoom changes to recalculate clusters
                                updateMarkers();
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('Error updating map view:', error);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapLoaded, propertiesWithCoords.length, selectedProperties.length, selectedPropertyId, centerCoordinates.lat, centerCoordinates.lng]);

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
        
        setCurrentZoom(initialZoom);

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
                mapInstanceRef.current.setCenter(center);
                mapInstanceRef.current.setZoom(initialZoom);
                // Set initial center reference
                prevCenterRef.current = { ...center };
                
                // Add zoom change listener to return to globe when zoomed out enough
                // Only add if not already added
                if (!zoomListenerRef.current) {
                    zoomListenerRef.current = mapInstanceRef.current.addListener('zoom_changed', () => {
                        if (mapInstanceRef.current) {
                            const currentZoom = mapInstanceRef.current.getZoom();
                            setCurrentZoom(currentZoom);
                            // If zoomed out to level 6 or below (about 4 zoom outs from typical starting zoom of 10)
                            // Return to globe view
                            if (currentZoom <= 6) {
                                // Set flag to prevent any modals from opening during transition
                                setIsTransitioningToGlobe(true);
                                
                                // Close all info windows explicitly
                                infoWindowsRef.current.forEach(iw => {
                                    if (iw && iw.close) {
                                        iw.close();
                                    }
                                });
                                
                                // Close any open modals/clusters
                                setSelectedCluster(null);
                                setIsInfoWindowOpen(false);
                                
                                // Remove listener to prevent multiple calls
                                if (zoomListenerRef.current && window.google?.maps) {
                                    window.google.maps.event.removeListener(zoomListenerRef.current);
                                    zoomListenerRef.current = null;
                                }
                                
                                // Switch back to globe view immediately (no delay)
                                onToggleGlobe();
                            } else {
                                // Reset transition flag if zooming back in
                                if (isTransitioningToGlobe) {
                                    setIsTransitioningToGlobe(false);
                                }
                                // Close cluster modal if open when zooming (but not info windows)
                                if (selectedCluster) {
                                    setSelectedCluster(null);
                                }
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
        clusterMarkersRef.current.forEach(marker => {
            if (marker && marker.setMap) {
                marker.setMap(null);
            }
        });
        markersRef.current = [];
        clusterMarkersRef.current = [];
        infoWindowsRef.current.clear();

        // Filter properties based on selectedPropertyId
        const filteredProperties = selectedPropertyId
            ? propertiesWithCoords.filter(p => p.id === selectedPropertyId)
            : propertiesWithCoords;

        // Filter clusters to only include filtered properties
        const filteredClusters = clusterProperties.clusters.map(cluster => ({
            ...cluster,
            properties: cluster.properties.filter(p => 
                filteredProperties.some(fp => fp.id === p.id)
            )
        })).filter(cluster => cluster.properties.length > 0);

        const filteredIndividual = clusterProperties.individualProperties.filter(p =>
            filteredProperties.some(fp => fp.id === p.id)
        );

        // Create bounds to fit all markers
        const bounds = new window.google.maps.LatLngBounds();

        // Add cluster markers for dense areas
        filteredClusters.forEach((cluster) => {
            if (cluster.properties.length === 0) return;

            // Create cluster marker with count
            const clusterMarker = new window.google.maps.Marker({
                position: cluster.center,
                map: mapInstanceRef.current,
                title: `${cluster.count} properties`,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: Math.min(20 + cluster.count * 2, 40), // Scale based on count
                    fillColor: '#4A7C4A',
                    fillOpacity: 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                },
                label: {
                    text: cluster.count.toString(),
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                },
                animation: window.google.maps.Animation.DROP,
            });

            clusterMarker.addListener('click', () => {
                // Prevent opening modal if transitioning to globe or zoom is too low
                if (isTransitioningToGlobe) return;
                
                if (mapInstanceRef.current) {
                    const zoom = mapInstanceRef.current.getZoom();
                    if (zoom > 6) {
                        setSelectedCluster(cluster);
                    }
                }
            });

            clusterMarkersRef.current.push(clusterMarker);
            bounds.extend(cluster.center);
        });

        // Add markers for individual properties (not in clusters)
        filteredIndividual.forEach((property) => {
            if (!property.coordinates) return;

            // Highlight selected properties with different color
            const isSelected = selectedProperties.some(p => p.id === property.id) || selectedPropertyId === property.id;
            
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
                // Close all other info windows first
                let wasAnyOpen = false;
                infoWindowsRef.current.forEach(iw => {
                    if (iw && iw.close) {
                        // Check if this info window is currently open
                        try {
                            const map = (iw as any).getMap?.();
                            if (map) {
                                wasAnyOpen = true;
                            }
                        } catch (e) {
                            // Ignore errors
                        }
                        iw.close();
                    }
                });
                // Small delay to ensure previous windows are closed
                setTimeout(() => {
                    infoWindow.open(mapInstanceRef.current, marker);
                    setIsInfoWindowOpen(true);
                }, 50);
            });
            
            // Listen for info window close events
            window.google.maps.event.addListener(infoWindow, 'closeclick', () => {
                setIsInfoWindowOpen(false);
            });
            
            // Listen for when info window is closed (any method)
            window.google.maps.event.addListener(infoWindow, 'close', () => {
                setIsInfoWindowOpen(false);
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
        if (selectedPropertyId && filteredProperties.length > 0) {
            // If a specific property is selected, center on it
            const selectedProp = filteredProperties[0];
            mapInstanceRef.current.setCenter({
                lat: selectedProp.coordinates.lat,
                lng: selectedProp.coordinates.lng,
            });
            mapInstanceRef.current.setZoom(15);
        } else if (selectedProperties.length > 0) {
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
        } else if (filteredIndividual.length > 0 || filteredClusters.length > 0) {
            // Fit to all markers (individual + clusters) with padding
            const allMarkersCount = filteredIndividual.length + filteredClusters.length;
            if (allMarkersCount > 1) {
                mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
            } else if (filteredIndividual.length === 1) {
                // Single property - center on it with appropriate zoom
                const singleProp = filteredIndividual[0];
                mapInstanceRef.current.setCenter({
                    lat: singleProp.coordinates.lat,
                    lng: singleProp.coordinates.lng,
                });
                mapInstanceRef.current.setZoom(15);
            } else if (filteredClusters.length === 1) {
                // Single cluster - center on it
                const singleCluster = filteredClusters[0];
                mapInstanceRef.current.setCenter(singleCluster.center);
                mapInstanceRef.current.setZoom(12);
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
            
            {/* Property Selector - Show when map is loaded, fade out when info window is open */}
            {mapLoaded && showPropertySelector && propertiesWithCoords.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ 
                        opacity: isInfoWindowOpen ? 0.3 : 1,
                        x: 0
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="absolute top-4 left-4 z-50 pointer-events-none"
                >
                    <div className="w-80 pointer-events-auto">
                        <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl p-4 border border-gray-200/50">
                            <div className="flex items-center justify-between mb-3">
                                <label htmlFor="property-select" className="block text-sm font-semibold text-gray-900">
                                    📍 Property
                                </label>
                                <button
                                    onClick={() => setShowPropertySelector(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Close property selector"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <select
                                id="property-select"
                                value={selectedPropertyId || ''}
                                onChange={(e) => {
                                    const propertyId = e.target.value;
                                    setSelectedPropertyId(propertyId || null);
                                }}
                                className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900 text-sm"
                                disabled={isInfoWindowOpen}
                            >
                                <option value="">Select a property...</option>
                                {propertiesWithCoords.map((property) => (
                                    <option key={property.id} value={property.id}>
                                        {property.name} - {property.location} (${property.price}/night)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </motion.div>
            )}
            
            {/* Show property selector button if hidden */}
            {mapLoaded && !showPropertySelector && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setShowPropertySelector(true)}
                    className="absolute top-4 left-4 z-50 bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-lg px-3 py-2 text-gray-900 hover:bg-gray-50 transition-all shadow-lg pointer-events-auto flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-sm font-medium">Filter</span>
                </motion.button>
            )}

            {/* Glassmorphism Modal for Cluster Properties */}
            <AnimatePresence>
                {selectedCluster && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                            onClick={() => setSelectedCluster(null)}
                        />
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div 
                                className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-6 border-b border-white/10">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-mist-100 mb-1">
                                            {selectedCluster.count} Properties Available
                                        </h2>
                                        <p className="text-sm text-mist-400">
                                            Select a property to view details
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedCluster(null)}
                                        className="text-mist-400 hover:text-mist-100 transition-colors p-2 hover:bg-white/10 rounded-lg"
                                        aria-label="Close"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Properties List */}
                                <div className="overflow-y-auto max-h-[60vh] p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedCluster.properties.map((property) => (
                                            <motion.div
                                                key={property.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group"
                                                onClick={() => {
                                                    setSelectedPropertyId(property.id);
                                                    setSelectedCluster(null);
                                                    if (onPropertySelect) {
                                                        onPropertySelect(property);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-start gap-4">
                                                    {property.image && (
                                                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-charcoal-800">
                                                            <img 
                                                                src={property.image} 
                                                                alt={property.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg font-semibold text-mist-100 mb-1 truncate group-hover:text-earth-500 transition-colors">
                                                            {property.name}
                                                        </h3>
                                                        <p className="text-sm text-earth-500 font-medium mb-2 uppercase tracking-wide">
                                                            {property.location}
                                                        </p>
                                                        <p className="text-sm text-mist-400 line-clamp-2 mb-3">
                                                            {property.description || 'No description available'}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xl font-bold text-earth-500">
                                                                ${property.price}
                                                                <span className="text-sm font-normal text-mist-400">/night</span>
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/listings/${property.id}`);
                                                                }}
                                                                className="px-4 py-2 bg-earth-500 text-white rounded-lg hover:bg-earth-600 transition-colors text-sm font-medium"
                                                            >
                                                                View
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

