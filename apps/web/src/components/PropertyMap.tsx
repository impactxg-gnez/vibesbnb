'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

/** Approximate stay area shown on the listing map (meters). Public default ~450m. */
export const PROPERTY_MAP_APPROX_RADIUS_METERS = 450;

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  propertyName: string;
  /** Circle radius in meters; defaults to ~450m privacy buffer. */
  approximateRadiusMeters?: number;
}

const DARK_MAP_STYLES: Array<{
  featureType?: string;
  elementType?: string;
  stylers: Array<Record<string, string>>;
}> = [
  { elementType: 'geometry', stylers: [{ color: '#1e1e1e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#b0b0b0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1e1e1e' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#444444' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#252525' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3a3a3a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9a9a9a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4a4a4a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
];

function isFiniteCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function ensureGoogleMapsScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.maps) return Promise.resolve(true);

  const existing = document.querySelector<HTMLScriptElement>('script[data-vibesbnb-maps="1"]');
  if (existing) {
    return new Promise((resolve) => {
      let n = 0;
      const id = window.setInterval(() => {
        n += 1;
        if (window.google?.maps) {
          window.clearInterval(id);
          resolve(true);
        } else if (n >= 100) {
          window.clearInterval(id);
          resolve(false);
        }
      }, 100);
    });
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.resolve(false);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.vibesbnbMaps = '1';
    script.onload = () => resolve(!!window.google?.maps);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function PropertyMap({
  latitude,
  longitude,
  propertyName,
  approximateRadiusMeters = PROPERTY_MAP_APPROX_RADIUS_METERS,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const initStartedRef = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let visibilityObserver: IntersectionObserver | null = null;
    let pollId: number | null = null;

    if (!isFiniteCoord(latitude, longitude)) {
      setFailed(true);
      return;
    }

    setFailed(false);

    const center = { lat: latitude, lng: longitude };

    const applyCircle = (map: google.maps.Map) => {
      if (circleRef.current) {
        circleRef.current.setCenter(center);
        circleRef.current.setRadius(approximateRadiusMeters);
        circleRef.current.setMap(map);
      } else {
        circleRef.current = new window.google.maps.Circle({
          map,
          center,
          radius: approximateRadiusMeters,
          strokeColor: '#4ADE80',
          strokeOpacity: 0.95,
          strokeWeight: 2,
          fillColor: '#22C55E',
          fillOpacity: 0.28,
          clickable: false,
        });
      }

      map.setCenter(center);
      const bounds = circleRef.current.getBounds();
      if (bounds) {
        map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
      }
    };

    const refreshLayout = (map: google.maps.Map) => {
      window.google.maps.event.trigger(map, 'resize');
      applyCircle(map);
    };

    const initializeMap = () => {
      if (cancelled || !mapRef.current || !window.google?.maps) return;
      if (!isFiniteCoord(latitude, longitude)) {
        setFailed(true);
        return;
      }

      try {
        // Remounting into a leftover Maps DOM leaves a blank charcoal panel.
        if (mapInstanceRef.current) {
          refreshLayout(mapInstanceRef.current);
          return;
        }
        if (initStartedRef.current) return;
        initStartedRef.current = true;

        mapRef.current.innerHTML = '';

        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          gestureHandling: 'greedy',
          disableDefaultUI: false,
          draggable: true,
          scrollwheel: true,
          disableDoubleClickZoom: false,
          minZoom: 13,
          maxZoom: 18,
          styles: DARK_MAP_STYLES,
          backgroundColor: '#1e1e1e',
        });

        mapInstanceRef.current = map;
        applyCircle(map);

        // Layout can settle after paint (grid / mobile stack) — force a resize.
        requestAnimationFrame(() => {
          if (!cancelled && mapInstanceRef.current === map) refreshLayout(map);
        });
        window.setTimeout(() => {
          if (!cancelled && mapInstanceRef.current === map) refreshLayout(map);
        }, 250);

        if (typeof ResizeObserver !== 'undefined' && mapRef.current) {
          resizeObserver = new ResizeObserver(() => {
            if (!cancelled && mapInstanceRef.current === map) refreshLayout(map);
          });
          resizeObserver.observe(mapRef.current);
        }
      } catch (error) {
        console.error('Error initializing property map:', error);
        initStartedRef.current = false;
        setFailed(true);
      }
    };

    const start = async () => {
      const ready = window.google?.maps ? true : await ensureGoogleMapsScript();
      if (cancelled) return;

      if (!ready && !window.google?.maps) {
        // Wait for layout.tsx script briefly before giving up.
        let checks = 0;
        pollId = window.setInterval(() => {
          checks += 1;
          if (window.google?.maps) {
            if (pollId != null) window.clearInterval(pollId);
            pollId = null;
            initializeMap();
          } else if (checks >= 80) {
            if (pollId != null) window.clearInterval(pollId);
            pollId = null;
            if (!cancelled) setFailed(true);
          }
        }, 100);
        return;
      }

      // Defer init until the container is on-screen with a real size (avoids blank tiles).
      if (typeof IntersectionObserver !== 'undefined' && mapRef.current) {
        visibilityObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry?.isIntersecting) return;
            const el = mapRef.current;
            if (!el || el.offsetWidth < 8 || el.offsetHeight < 8) return;
            visibilityObserver?.disconnect();
            visibilityObserver = null;
            initializeMap();
          },
          { root: null, threshold: 0.01 }
        );
        visibilityObserver.observe(mapRef.current);
        // If already visible, observer fires async — also try immediately.
        if (mapRef.current.offsetWidth >= 8 && mapRef.current.offsetHeight >= 8) {
          initializeMap();
        }
      } else {
        initializeMap();
      }
    };

    void start();

    return () => {
      cancelled = true;
      initStartedRef.current = false;
      if (pollId != null) window.clearInterval(pollId);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      mapInstanceRef.current = null;
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
    };
  }, [latitude, longitude, propertyName, approximateRadiusMeters]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  if (failed) {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-center gap-3 bg-charcoal-900 px-6 text-center"
        role="img"
        aria-label={`Map unavailable for ${propertyName}`}
      >
        <MapPin className="h-8 w-8 text-emerald-500" aria-hidden />
        <p className="text-sm text-gray-300">Map could not load for this listing.</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
        >
          Open approximate area in Google Maps
        </a>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="h-full w-full bg-charcoal-900"
      role="img"
      aria-label={`Approximate map location for ${propertyName} (${approximateRadiusMeters} meter area)`}
    />
  );
}
