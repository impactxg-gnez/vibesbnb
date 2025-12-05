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
    const [loading, setLoading] = useState(true);

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
                        image: p.images?.[0] || 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop',
                    }));
                setProperties(validProperties);
            } catch (err) {
                console.error('Error fetching properties for globe:', err);
            } finally {
                setLoading(false);
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
    }, [loading]);

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
            {/* Header */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center z-50 pointer-events-none">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 rounded-3xl shadow-lg">
                    <h2 className="text-3xl font-bold text-white mb-1">Where to?</h2>
                    <p className="text-sm text-gray-200 font-medium">Book wellness‑friendly properties</p>
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
                    pointColor={() => '#10b981'}
                    pointAltitude={0.05}
                    pointRadius={1.0}
                    pointsMerge={false}
                    ringsData={ringData}
                    ringColor={() => '#34d399'}
                    ringMaxRadius={3}
                    ringPropagationSpeed={2}
                    ringRepeatPeriod={800}
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
                                        <div className="relative h-48 w-full">
                                            <Image src={prop.image} alt={prop.name} fill className="object-cover" />
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
                v1.2.0-debug (pointsMerge: false)
            </div>
        </div>
    );
}
