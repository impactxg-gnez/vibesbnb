/** Google Maps styles aligned with the 420BNB palette. */

export type GoogleMapStyle = {
  featureType?: string;
  elementType?: string;
  stylers: Array<Record<string, string>>;
};

export const LIGHT_MAP_STYLES: GoogleMapStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#F4E6D4' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#51372B' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FAF3EA' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#B8A487' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#193F25' }] },
  { featureType: 'administrative.province', elementType: 'labels.text.fill', stylers: [{ color: '#6B5346' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#51372B' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#F4E6D4' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#ECD5BB' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#ECD5BB' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#D4C4A0' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#193F25' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FAF3EA' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E0C9A8' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6B5346' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#E8D4B8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#B8A487' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#ECD5BB' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#B8C9B4' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#193F25' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#FAF3EA' }] },
];

export const DARK_MAP_STYLES: GoogleMapStyle[] = [
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

export function mapStylesForTheme(theme: 'light' | 'dark'): GoogleMapStyle[] {
  return theme === 'dark' ? DARK_MAP_STYLES : LIGHT_MAP_STYLES;
}

export const MAP_BACKGROUND = {
  light: '#FAF3EA',
  dark: '#1e1e1e',
} as const;

export function markerColors(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? { active: '#10b981', hover: '#059669', draft: '#f59e0b', stroke: '#ffffff' }
    : { active: '#193F25', hover: '#122B1A', draft: '#B78438', stroke: '#FAF3EA' };
}
