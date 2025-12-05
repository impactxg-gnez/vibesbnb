'use client';

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
                <div className="h-12 w-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
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
    const router = useRouter();
    const globeEl = useRef<any>(undefined);
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [loading, setLoading] = useState(true);

    // Initial load
    useEffect(() => {
        // Set dimensions
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight
        });

        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);

        // Fetch properties
        const fetchProperties = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('properties')
                    .select('id, name, price, description, images, location_lat, location_lng, location')
                    .eq('status', 'active');

                if (error) throw error;

                // Map and validate data
                const validProperties = (data || [])
                    .filter(p => p.location_lat && p.location_lng) // Ensure valid coordinates
                    .map(p => ({
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        description: p.description || '',
                        location: p.location || 'Unknown Location',
                        latitude: Number(p.location_lat),
                        longitude: Number(p.location_lng),
                        image: p.images?.[0] || 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop'
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

    // Auto-rotate
    useEffect(() => {
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.5;
            globeEl.current.pointOfView({ altitude: 2.5 });
        }
    }, [loading]);

    const handlePointClick = (point: object) => {
        const property = point as Property;
        setSelectedProperty(property);

        // Stop rotation when interacting
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = false;

            // Fly to location
            globeEl.current.pointOfView({
                lat: property.latitude,
                lng: property.longitude,
                altitude: 1.5
            }, 1000);
        }
    };

    const handleSearchClick = () => {
        router.push('/search');
    };

    const ringData = useMemo(() => {
        return properties.map(p => ({
            lat: p.latitude,
            lng: p.longitude,
            maxR: 2,
            propagationSpeed: 2,
            repeatPeriod: 1000
        }));
    }, [properties]);

    return (
        <div className="relative w-full h-screen bg-gray-950 overflow-hidden">
            {/* Top Navigation */}
            <div className="absolute top-0 left-0 w-full z-50 p-6 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    {/* Logo placeholder or simple text */}
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
            <div className="cursor-move">
                <Globe
                    ref={globeEl}
                    width={dimensions.width}
                    height={dimensions.height}
                    globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                    bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                    backgroundColor="#030712" // gray-950
                    atmosphereColor="#10b981" // emerald-500
                    atmosphereAltitude={0.15}

                    // Points (Hotspots)
                    pointsData={properties}
                    pointLat="latitude"
                    pointLng="longitude"
                    pointColor={() => '#10b981'} // Emerald green
                    pointAltitude={0.05}
                    pointRadius={0.5}
                    pointsMerge={true} // Performance optimization

                    // Rings (Pulse effect)
                    ringsData={ringData}
                    ringColor={() => '#34d399'}
                    ringMaxRadius={3}
                    ringPropagationSpeed={2}
                    ringRepeatPeriod={800}

                    // Interaction
                    onPointClick={handlePointClick}
                    pointLabel={(p: any) => `
            <div class="bg-gray-900/90 text-white px-3 py-1.5 rounded border border-gray-700 shadow-xl backdrop-blur-sm text-sm">
              <div class="font-bold text-emerald-400">$${p.price}</div>
              <div class="text-xs text-gray-300">${p.name}</div>
            </div>
          `}
                />
            </div>

            {/* Property Modal */}
            <AnimatePresence>
                {selectedProperty && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full pointer-events-auto"
                        >
                            <div className="relative h-48 w-full">
                                <Image
                                    src={selectedProperty.image}
                                    alt={selectedProperty.name}
                                    fill
                                    className="object-cover"
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProperty(null);
                                        if (globeEl.current) {
                                            globeEl.current.controls().autoRotate = true;
                                        }
                                    }}
                                    className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                                    <span className="text-emerald-400 font-bold">${selectedProperty.price}</span>
                                    <span className="text-white/80 text-xs"> / night</span>
                                </div>
                            </div>

                            <div className="p-5">
                                <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{selectedProperty.name}</h3>
                                <div className="flex items-center text-gray-400 text-sm mb-3">
                                    <svg className="w-4 h-4 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    <span className="line-clamp-1">{selectedProperty.location}</span>
                                </div>

                                <p className="text-gray-300 text-sm mb-5 line-clamp-2 leading-relaxed">
                                    {selectedProperty.description || "Experience a unique stay at this verified 420-friendly property. Enjoy comfort, privacy, and good vibes."}
                                </p>

                                <button
                                    onClick={() => router.push(`/listings/${selectedProperty.id}`)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors duration-300 flex items-center justify-center gap-2"
                                >
                                    View Full Listing
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Instructional Hint */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-sm font-light tracking-widest pointer-events-none animate-pulse">
                DRAG TO EXPLORE • CLICK PINS
            </div>
        </div>
    );
}
