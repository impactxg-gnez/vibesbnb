'use client';
// trigger redeploy

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamically import Globe to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4" />
                <p className="text-lg font-light tracking-widest">LOADING WORLD...</p>
            </div>
        </div>
    ),
});

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

export function PropertyGlobe() {
    // WebGL support check
    const isWebGLSupported = typeof window !== 'undefined' && !!(window.WebGLRenderingContext || (window as any).WebGL2RenderingContext);
    const router = useRouter();
    const globeEl = useRef<any>(undefined);
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [searchLocation, setSearchLocation] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLocating, setIsLocating] = useState(true);

    if (!isWebGLSupported) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
                WebGL is not supported in this browser. Please use a compatible browser.
            </div>
        );
    }

    // Initial load
    useEffect(() => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
        const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);

        const fetchProperties = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('properties')
                    .select('id, name, price, description, images, latitude, longitude, location')
                    .eq('status', 'active');
                if (error) throw error;
                const validProperties = (data || [])
                    .filter(p => p.latitude && p.longitude)
                    .map(p => ({
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        description: p.description || '',
                        location: p.location || 'Unknown Location',
                        latitude: Number(p.latitude),
                        longitude: Number(p.longitude),
                        image: (p.images && p.images.length > 0 && p.images[0]) ? p.images[0] : 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop',
                    }));
                setProperties(validProperties);

                // Calculate centroid for fallback
                if (validProperties.length > 0) {
                    const latSum = validProperties.reduce((sum, p) => sum + p.latitude, 0);
                    const lngSum = validProperties.reduce((sum, p) => sum + p.longitude, 0);
                    const centerLat = latSum / validProperties.length;
                    const centerLng = lngSum / validProperties.length;

                    // Try to get user location
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            if (globeEl.current) {
                                globeEl.current.pointOfView({
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude,
                                    altitude: 2.0
                                }, 1000);
                            }
                            setIsLocating(false);
                        },
                        (error) => {
                            console.log('Geolocation unavailable, using property centroid', error);
                            if (globeEl.current) {
                                globeEl.current.pointOfView({
                                    lat: centerLat,
                                    lng: centerLng,
                                    altitude: 2.0
                                }, 1000);
                            }
                            setIsLocating(false);
                        }
                    );
                }
            } catch (err) {
                console.error('Error fetching properties for globe:', err);
            } finally {
                // Done loading
            }
        };
        fetchProperties();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto‑rotate
    useEffect(() => {
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.5;
            globeEl.current.pointOfView({ altitude: 2.5 });
        }
    }, []);

    // Simple distance helper (degrees)
    const distance = (a: Property, b: Property) => {
        const dLat = a.latitude - b.latitude;
        const dLng = a.longitude - b.longitude;
        return Math.sqrt(dLat * dLat + dLng * dLng);
    };

    const handlePointClick = (point: any) => {
        console.log('Globe point clicked:', point);
        const clicked = point as Property;
        // Find properties within a small radius (≈0.1°) of the clicked point
        const nearby = properties.filter(p => distance(p, clicked) < 0.1);
        setSelectedProperties(nearby);
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = false;
            globeEl.current.pointOfView({ lat: clicked.latitude, lng: clicked.longitude, altitude: 1.5 }, 1000);
        }
    };

    const handleSearchClick = () => router.push('/search');

    const uniqueLocations = useMemo(() => {
        const locations = new Set(properties.map(p => p.location));
        return Array.from(locations).sort();
    }, [properties]);

    const filteredLocations = uniqueLocations.filter(loc =>
        searchLocation === '' ||
        loc.toLowerCase().includes(searchLocation.toLowerCase()) ||
        (uniqueLocations.includes(searchLocation) && loc !== searchLocation) // Keep other suggestions if match found
    );

    const handleLocationSelect = (location: string) => {
        setSearchLocation(location);
        // Do not close dropdown immediately if user wants to switch, or maybe better UX? 
        // User request: "other suggestions disappear unless selected location is removed"
        // Solution: Keep dropdown open but update value? Or clearer functionality.
        // Actually, simpler fix for user request: Don't filter list by strict match if it's an exact match?
        // Let's implement clearing on focus or keep showing all if exact match.

        setShowDropdown(false);
        const targetProp = properties.find(p => p.location === location);
        if (targetProp && globeEl.current) {
            globeEl.current.controls().autoRotate = false;
            // Fly to location smoothly
            globeEl.current.pointOfView({
                lat: targetProp.latitude,
                lng: targetProp.longitude,
                altitude: 1.5
            }, 2000); // Increased duration to 2s for smoother rotation effect
        }
    };

    const ringData = useMemo(() =>
        properties.map(p => ({
            lat: p.latitude,
            lng: p.longitude,
            maxR: 2,
            propagationSpeed: 2,
            repeatPeriod: 1000,
        })),
        [properties]
    );

    return (
        <div className="relative w-full min-h-screen bg-gray-950 flex flex-col">
            {/* Header */}
            {/* Header & Search */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4 z-50 pointer-events-none w-full max-w-md px-4">
                {/* Title Card */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 rounded-3xl shadow-lg text-center">
                    <h2 className="text-3xl font-bold text-white mb-1">Where to?</h2>
                    <p className="text-sm text-gray-200 font-medium">Book wellness‑friendly properties</p>
                </div>

                {/* Search Card */}
                <div className="relative w-full pointer-events-auto">
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center gap-3 px-4 py-3 text-left hover:bg-white/20 transition-all group"
                        >
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span className={`flex-1 ${searchLocation ? 'text-white' : 'text-gray-400'}`}>
                                {searchLocation || 'Search destinations...'}
                            </span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                                <div className="p-2">
                                    <input
                                        type="text"
                                        placeholder="Type to filter..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 mb-2"
                                        value={searchLocation}
                                        onChange={(e) => setSearchLocation(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                        onFocus={() => {
                                            if (uniqueLocations.includes(searchLocation)) {
                                                setSearchLocation(''); // Auto-clear on focus if a location was selected, to show all options again
                                            }
                                        }}
                                    />
                                    {filteredLocations.length > 0 ? (
                                        filteredLocations.map(loc => (
                                            <button
                                                key={loc}
                                                onClick={() => handleLocationSelect(loc)}
                                                className="w-full text-left px-3 py-2 text-gray-200 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-lg transition-colors text-sm"
                                            >
                                                {loc}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-gray-500 text-sm text-center">No locations found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Navigation */}
            <div className="absolute top-0 left-0 w-full z-30 p-6 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    <h1 className="text-2xl font-bold text-white tracking-tighter">
                        Vibes<span className="text-emerald-500">BNB</span>
                    </h1>
                </div>
                <button
                    onClick={handleSearchClick}
                    className="pointer-events-auto bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-6 py-2.5 rounded-full font-medium transition-all duration-300 hover:scale-105 group flex items-center gap-2"
                >
                    Enter Website
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>
            </div>

            {/* Globe */}
            <div className="flex-1 cursor-move relative z-40 pointer-events-auto">
                <Globe
                    ref={globeEl}
                    width={dimensions.width}
                    height={dimensions.height}
                    globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                    bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                    backgroundColor="#030712"
                    atmosphereColor="#10b981"
                    atmosphereAltitude={0.15}
                    pointsData={properties}
                    pointLat="latitude"
                    pointLng="longitude"
                    pointColor={() => '#34d399'}
                    pointAltitude={0.7}
                    pointRadius={0.05}
                    pointResolution={8}
                    pointsMerge={false}
                    ringsData={ringData}
                    ringColor={() => '#34d399'}
                    ringMaxRadius={3}
                    ringPropagationSpeed={2}
                    ringRepeatPeriod={800}
                    labelsData={properties}
                    labelLat="latitude"
                    labelLng="longitude"
                    labelText="location"
                    labelColor={() => 'rgba(255, 255, 255, 0.75)'}
                    labelSize={1.5}
                    labelDotRadius={0.5}
                    labelAltitude={0.01}
                    onPointClick={handlePointClick}
                    pointLabel={(p: any) => `
            <div class=\"bg-gray-900/90 text-white px-3 py-1.5 rounded border border-gray-700 shadow-xl backdrop-blur-sm text-sm\">
              <div class=\"font-bold text-emerald-400\">$${p.price}</div>
              <div class=\"text-xs text-gray-300\">${p.name}</div>
              <div class=\"text-xs text-gray-200\">${p.location}</div>
            </div>
          `}
                />
            </div>

            {/* Glassmorphism Modal */}
            <AnimatePresence>
                {selectedProperties.length > 0 && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-2xl max-w-3xl w-full pointer-events-auto"
                        >
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto">
                                {selectedProperties.map(prop => (
                                    <div key={prop.id} className="flex flex-col bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden border border-white/15">
                                        <div className="relative h-48 w-full bg-gray-800">
                                            <Image
                                                src={prop.image}
                                                alt={prop.name}
                                                fill
                                                className="object-cover"
                                                onError={(e: any) => {
                                                    e.target.src = 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop';
                                                }}
                                                unoptimized // Temporary: bypass optimization if domain issues persist
                                            />
                                        </div>
                                        <div className="p-3 text-white">
                                            <h3 className="text-lg font-bold mb-1 line-clamp-1">{prop.name}</h3>
                                            <p className="text-sm text-gray-300 mb-2 line-clamp-2">{prop.description}</p>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-emerald-400 font-medium">${prop.price}</span>
                                                <button
                                                    onClick={() => router.push(`/listings/${prop.id}`)}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedProperties([]);
                                    if (globeEl.current) globeEl.current.controls().autoRotate = true;
                                }}
                                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Instructional Hint */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-sm font-light tracking-widest pointer-events-none animate-pulse">
                DRAG TO EXPLORE • CLICK PINS
            </div>

            {/* Version Debug */}
            <div className="absolute bottom-2 right-2 text-white/30 text-xs font-mono pointer-events-none">
                v1.4.0 (beacons)
            </div>
        </div>
    );
}
