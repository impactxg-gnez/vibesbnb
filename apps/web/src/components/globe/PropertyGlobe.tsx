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
        <div className="flex items-center justify-center h-screen bg-charcoal-950 text-mist-100">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full border-t-2 border-r-2 border-earth-500 animate-spin" />
                <p className="text-xl font-light tracking-[0.3em] font-serif italic text-mist-400">LOADING VIBES...</p>
            </div>
        </div>
    ),
});

// Fonts
import { Cormorant_Garamond, Inter } from 'next/font/google';
const serifFont = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '600', '700'], style: ['normal', 'italic'] });
const sansFont = Inter({ subsets: ['latin'], weight: ['300', '400', '500'] });

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
    const [muted, setMuted] = useState(true);

    const whisperWords = ["Unwind", "Restore", "Flow", "Breathe", "Reset", "Explore", "Elevate", "Vibe"];

    if (!isWebGLSupported) {
        return (
            <div className="flex items-center justify-center h-screen bg-charcoal-950 text-white">
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
            }, 4000); // Smoother 4s transition
        }
    };

    const [currentAltitude, setCurrentAltitude] = useState(2.5);

    // Track zoom level reliability
    useEffect(() => {
        let checkInterval: NodeJS.Timeout;

        const initControlsListener = () => {
            if (globeEl.current) {
                const controls = globeEl.current.controls();
                if (controls) {
                    const onChange = () => {
                        const pov = globeEl.current.pointOfView();
                        setCurrentAltitude(pov.altitude);
                    };
                    controls.addEventListener('change', onChange);

                    // Cleanup
                    return () => controls.removeEventListener('change', onChange);
                }
            }
            return undefined;
        };

        const cleanup = initControlsListener();

        // If not ready yet, poll for it
        if (!cleanup) {
            checkInterval = setInterval(() => {
                const retryCleanup = initControlsListener();
                if (retryCleanup) {
                    clearInterval(checkInterval);
                }
            }, 500);
        }

        return () => {
            if (cleanup) cleanup();
            if (checkInterval) clearInterval(checkInterval);
        };
    }, []);

    // Aggregate Labels Logic
    const dynamicLabels = useMemo(() => {
        if (properties.length === 0) return [];

        // Level 1: Country (High Altitude > 1.0)
        // Showing "USA" at average center
        if (currentAltitude > 1.0) {
            const latSum = properties.reduce((sum, p) => sum + p.latitude, 0);
            const lngSum = properties.reduce((sum, p) => sum + p.longitude, 0);
                return [{
                text: "USA",
                latitude: latSum / properties.length,
                longitude: lngSum / properties.length,
                size: 3.5,
                color: 'rgba(74, 124, 74, 0.9)' // Earth Green
            }];
        }

        // Level 2: States (Mid Altitude 0.4 - 1.2)
        // Group by State (e.g., "Joshua Tree, CA" -> "CA")
        if (currentAltitude > 0.4) {
            const stateGroups: { [key: string]: { latSum: number, lngSum: number, count: number } } = {};

            properties.forEach(p => {
                const parts = p.location.split(',');
                // Assume format "City, State" - take the last part trimmed, or whole if no comma
                const state = parts.length > 1 ? parts[parts.length - 1].trim() : "Other";

                if (!stateGroups[state]) stateGroups[state] = { latSum: 0, lngSum: 0, count: 0 };
                stateGroups[state].latSum += p.latitude;
                stateGroups[state].lngSum += p.longitude;
                stateGroups[state].count += 1;
            });

            return Object.keys(stateGroups).map(state => ({
                text: state,
                latitude: stateGroups[state].latSum / stateGroups[state].count,
                longitude: stateGroups[state].lngSum / stateGroups[state].count,
                size: 1.5,
                color: 'rgba(74, 124, 74, 0.9)' // Earth Green
            }));
        }

        // Level 3: Cities (Low Altitude < 0.4)
        // Group by unique location name
        const cityGroups: { [key: string]: { latSum: number, lngSum: number, count: number } } = {};

        properties.forEach(p => {
            if (!cityGroups[p.location]) cityGroups[p.location] = { latSum: 0, lngSum: 0, count: 0 };
            cityGroups[p.location].latSum += p.latitude;
            cityGroups[p.location].lngSum += p.longitude;
            cityGroups[p.location].count += 1;
        });

        return Object.keys(cityGroups).map(city => ({
            text: city,
            latitude: cityGroups[city].latSum / cityGroups[city].count,
            longitude: cityGroups[city].lngSum / cityGroups[city].count,
            size: 1.0,
            color: 'rgba(255, 255, 255, 0.8)'
        }));

    }, [properties, currentAltitude]);

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
        <div className={`relative w-full min-h-screen bg-charcoal-950 flex flex-col overflow-hidden ${sansFont.className}`}>
            {/* Header */}
            {/* Atmosphere: Gradient & Glow */}
            <div className="absolute inset-0 z-0 bg-radial-gradient from-earth-500/20 via-charcoal-950/80 to-charcoal-950 pointer-events-none" />
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-earth-500/10 via-transparent to-transparent opacity-60 pointer-events-none mix-blend-screen" />

            {/* Floating Whisper Words */}
            <div className={`absolute inset-0 z-0 overflow-hidden pointer-events-none ${serifFont.className}`}>
                {whisperWords.map((word, i) => (
                    <motion.div
                        key={word}
                        initial={{ opacity: 0, x: Math.random() * 100 - 50, y: Math.random() * 100 - 50 }}
                        animate={{
                            opacity: [0, 0.4, 0],
                            x: [0, Math.random() * 200 - 100],
                            y: [0, Math.random() * 200 - 100]
                        }}
                        transition={{
                            duration: 15 + Math.random() * 10,
                            repeat: Infinity,
                            delay: i * 3,
                            ease: "easeInOut"
                        }}
                        className="absolute text-mist-100/10 text-4xl italic font-light tracking-widest select-none"
                        style={{
                            left: `${10 + Math.random() * 80}%`,
                            top: `${10 + Math.random() * 80}%`
                        }}
                    >
                        {word}
                    </motion.div>
                ))}
            </div>

            {/* Header & Search */}
            <div className={`absolute top-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-6 z-50 pointer-events-none w-full max-w-md px-4 transition-all duration-1000 ${serifFont.className}`}>
                {/* Title Card */}
                <div className="text-center group">
                    <h2 className="text-5xl md:text-6xl font-medium text-mist-100 mb-2 tracking-wide drop-shadow-[0_0_15px_rgba(74,124,74,0.3)]">
                        Travel for the soul.
                    </h2>
                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-earth-500/50 to-transparent mx-auto mb-3" />
                    <p className={`text-sm text-mist-400 font-light tracking-[0.2em] uppercase ${sansFont.className}`}>
                        Curated spaces for deep rest
                    </p>
                </div>

                {/* Search Card */}
                <div className={`relative w-full pointer-events-auto ${sansFont.className}`}>
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="w-full bg-earth-500/30 backdrop-blur-xl border border-white/10 rounded-full flex items-center gap-4 px-6 py-4 text-left hover:bg-earth-500/50 hover:border-earth-500/30 transition-all duration-500 group shadow-lg shadow-black/20"
                        >
                            <svg className="w-5 h-5 text-earth-500 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span className={`flex-1 text-sm tracking-wide ${searchLocation ? 'text-mist-100' : 'text-mist-400/80'}`}>
                                {searchLocation || 'Find your next vibe...'}
                            </span>
                            <div className="w-px h-4 bg-white/10 mx-2" />
                            <svg className={`w-4 h-4 text-mist-400 transition-transform duration-500 ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-4 bg-charcoal-950/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar p-2">
                                <div className="p-1">
                                    <input
                                        type="text"
                                        placeholder="Type to filter..."
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-mist-100 text-sm placeholder-mist-400/50 focus:outline-none focus:border-earth-500/30 focus:bg-white/10 transition-all mb-2 font-light"
                                        value={searchLocation}
                                        onChange={(e) => setSearchLocation(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                        onFocus={() => {
                                            if (uniqueLocations.includes(searchLocation)) {
                                                setSearchLocation('');
                                            }
                                        }}
                                    />
                                    {filteredLocations.length > 0 ? (
                                        filteredLocations.map(loc => (
                                            <button
                                                key={loc}
                                                onClick={() => handleLocationSelect(loc)}
                                                className="w-full text-left px-4 py-3 text-mist-400 hover:bg-earth-500/40 hover:text-mist-100 rounded-xl transition-all duration-300 text-sm font-light tracking-wide flex items-center justify-between group"
                                            >
                                                <span>{loc}</span>
                                                <span className="opacity-0 group-hover:opacity-100 text-earth-500 text-xs transition-opacity">Fly to</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-mist-400/50 text-sm text-center italic">No vibes found here...</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Navigation */}
            <div className="absolute top-0 left-0 w-full z-30 p-8 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    {/* Minimal Brand */}
                </div>
            </div>

            {/* Bottom Controls (Right) */}
            <div className="absolute bottom-12 right-8 z-40 flex flex-col items-end gap-6 pointer-events-none">
                {/* Audio Toggle */}
                <button
                    onClick={() => setMuted(!muted)}
                    className="pointer-events-auto w-12 h-12 rounded-full border border-white/10 bg-charcoal-950/50 backdrop-blur-md hover:bg-earth-500/50 flex items-center justify-center text-mist-400 transition-all hover:scale-110 hover:text-earth-500 hover:border-earth-500/30 shadow-lg group"
                >
                    {muted ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                    ) : (
                        <div className="relative">
                            <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        </div>
                    )}
                </button>

                <button
                    onClick={handleSearchClick}
                    className={`pointer-events-auto bg-earth-500 text-white px-8 py-4 rounded-full text-base font-medium tracking-widest uppercase transition-all duration-300 hover:bg-earth-600 hover:scale-105 shadow-[0_0_20px_rgba(74,124,74,0.4)] hover:shadow-[0_0_40px_rgba(74,124,74,0.6)] flex items-center gap-2 ${sansFont.className}`}
                >
                    Enter Website
                </button>
            </div>

            {/* Globe */}
            <div className="flex-1 cursor-move relative z-10 pointer-events-auto">
                <Globe
                    ref={globeEl}
                    width={dimensions.width}
                    height={dimensions.height}
                    // Darker, seamless dark map
                    globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                    bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                    // Colors
                    backgroundColor="rgba(0,0,0,0)" // Transparent for gradient bg
                    atmosphereColor="#4A7C4A" // Earth Green
                    atmosphereAltitude={0.25} // More glow

                    pointsData={properties}
                    pointLat="latitude"
                    pointLng="longitude"
                    pointColor={() => 'transparent'}
                    pointAltitude={0}
                    pointRadius={0.1}
                    pointResolution={12}
                    pointsMerge={false}

                    ringsData={ringData}
                    ringColor={() => '#4A7C4A'} // Earth Green
                    ringMaxRadius={3}
                    ringPropagationSpeed={2}
                    ringRepeatPeriod={800}

                    htmlElementsData={properties}
                    htmlLat="latitude"
                    htmlLng="longitude"
                    htmlElement={(d: any) => {
                        const el = document.createElement('div');
                        el.innerHTML = `
                            <div class="relative flex items-center justify-center group cursor-pointer">
                                <div class="absolute w-8 h-8 bg-[#4A7C4A]/20 rounded-full animate-[ping_3s_ease-in-out_infinite]"></div>
                                <div class="absolute w-12 h-12 bg-[#4A7C4A]/10 rounded-full animate-[ping_4s_ease-in-out_infinite_delay-1000]"></div>
                                <div class="relative w-2 h-2 bg-[#4A7C4A] border border-white/80 rounded-full shadow-[0_0_15px_rgba(74,124,74,0.8)] transition-transform duration-500 group-hover:scale-150"></div>
                            </div>
                        `;
                        el.onclick = () => handlePointClick(d);
                        return el;
                    }}

                    labelsData={dynamicLabels}
                    labelLat="latitude"
                    labelLng="longitude"
                    labelText="text"
                    labelColor={(d: any) => 'rgba(245, 245, 243, 0.85)'} // mist-white
                    labelSize={(d: any) => d.size}
                    labelDotRadius={0.2}
                    labelAltitude={0.02}
                    // labelTypeFace removed to avoid font loading blanking issues, fallback to default font


                    onPointClick={handlePointClick}
                    pointLabel={(p: any) => `
                        <div class="bg-charcoal-950/95 border border-white/10 px-4 py-3 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md min-w-[150px]">
                          <div class="text-sm text-[#4A7C4A] tracking-widest font-bold uppercase mb-1">${p.location}</div>
                          <div class="text-xs text-mist-400 line-clamp-1 mb-1 font-light">${p.name}</div>
                          <div class="text-sm text-mist-100 font-medium">$${p.price} <span class="text-xs text-white/40">/ night</span></div>
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
                                        <div className="relative h-48 w-full bg-charcoal-800">
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
                                            <p className="text-sm text-mist-300 mb-2 line-clamp-2">{prop.description}</p>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-earth-400 font-medium">${prop.price}</span>
                                                <button
                                                    onClick={() => router.push(`/listings/${prop.id}`)}
                                                    className="bg-earth-600 hover:bg-earth-500 text-white px-3 py-1 rounded"
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
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 1 }}
                        className={`absolute bottom-12 left-1/2 -translate-x-1/2 text-mist-400 text-xs tracking-[0.3em] font-light pointer-events-none uppercase ${sansFont.className}`}
            >
                Rotate to explore
            </motion.div>

            {/* Version Debug */}
            <div className="absolute bottom-2 right-2 text-white/5 text-[10px] font-mono pointer-events-none">
                v2.0.0 (premium-ui-overhaul)
            </div>
        </div>
    );
}
