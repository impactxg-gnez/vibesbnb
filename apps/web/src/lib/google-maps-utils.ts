/**
 * Extract coordinates from various Google Maps URL formats
 * Supports:
 * - https://www.google.com/maps/@25.7616798,-80.1917902,15z
 * - https://www.google.com/maps/place/.../@25.7616798,-80.1917902,15z
 * - https://www.google.com/maps/search/?api=1&query=25.7616798,-80.1917902
 * - https://maps.google.com/?q=25.7616798,-80.1917902
 * - https://www.google.com/maps?q=25.7616798,-80.1917902
 * - https://www.google.com/maps/embed?pb=...&q=25.7616798,-80.1917902
 * - https://www.google.com/maps?ll=25.7616798,-80.1917902
 * - https://www.google.com/maps?center=25.7616798,-80.1917902
 */
export function extractCoordinatesFromGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    // Normalize the URL - handle relative URLs
    let normalizedUrl = url;
    if (url.startsWith('//')) {
      normalizedUrl = 'https:' + url;
    } else if (url.startsWith('/')) {
      normalizedUrl = 'https://www.google.com' + url;
    }

    // Format 1: @lat,lng,zoom (most common in iframes)
    // Example: https://www.google.com/maps/@25.7616798,-80.1917902,15z
    const atMatch = normalizedUrl.match(/@([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    // Format 2: ?q=lat,lng or &q=lat,lng
    // Example: https://www.google.com/maps/search/?api=1&query=25.7616798,-80.1917902
    const qMatch = normalizedUrl.match(/[?&](?:q|query)=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    // Format 3: ?ll=lat,lng or &ll=lat,lng
    const llMatch = normalizedUrl.match(/[?&]ll=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    if (llMatch) {
      const lat = parseFloat(llMatch[1]);
      const lng = parseFloat(llMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    // Format 4: ?center=lat,lng or &center=lat,lng
    const centerMatch = normalizedUrl.match(/[?&]center=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    if (centerMatch) {
      const lat = parseFloat(centerMatch[1]);
      const lng = parseFloat(centerMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    // Format 5: Embed format with pb parameter (encoded)
    // Try to decode or extract from embed URLs
    const embedMatch = normalizedUrl.match(/maps\/embed[^"']*[?&](?:q|ll|center)=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    if (embedMatch) {
      const lat = parseFloat(embedMatch[1]);
      const lng = parseFloat(embedMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    return null;
  } catch (error) {
    console.error('[Google Maps Utils] Error extracting coordinates:', error);
    return null;
  }
}

