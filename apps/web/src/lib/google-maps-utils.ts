/**
 * Resolve Google Maps short URLs to full URLs
 * Supports: maps.app.goo.gl, goo.gl/maps
 */
async function resolveShortUrl(url: string): Promise<string> {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // Check if it's a short URL
  const isShortUrl = /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)\//.test(url);
  if (!isShortUrl) {
    return url;
  }

  try {
    // Normalize URL
    let normalizedUrl = url;
    if (!url.startsWith('http')) {
      normalizedUrl = 'https://' + url;
    }

    // Follow redirects to get the full URL
    // Note: This works in browser/client-side by following redirects
    // For server-side, we'd need to use a different approach
    const response = await fetch(normalizedUrl, {
      method: 'HEAD',
      redirect: 'follow',
    });

    if (response.ok && response.url && response.url !== normalizedUrl) {
      return response.url;
    }
  } catch (error) {
    console.error('[Google Maps Utils] Error resolving short URL:', error);
  }

  return url;
}

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
 * - https://maps.app.goo.gl/... (short links - will be resolved automatically)
 */
export async function extractCoordinatesFromGoogleMapsUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url || typeof url !== 'string') {
    console.log('[Google Maps Utils] Invalid URL input:', url);
    return null;
  }

  try {
    // Resolve short URLs first
    let resolvedUrl = await resolveShortUrl(url);
    console.log('[Google Maps Utils] Original URL:', url);
    console.log('[Google Maps Utils] Resolved URL:', resolvedUrl);
    
    // Normalize the URL - handle relative URLs
    let normalizedUrl = resolvedUrl;
    if (resolvedUrl.startsWith('//')) {
      normalizedUrl = 'https:' + resolvedUrl;
    } else if (resolvedUrl.startsWith('/')) {
      normalizedUrl = 'https://www.google.com' + resolvedUrl;
    }

    // Format 1: @lat,lng,zoom (most common in iframes)
    // Example: https://www.google.com/maps/@25.7616798,-80.1917902,15z
    const atMatch = normalizedUrl.match(/@([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      console.log('[Google Maps Utils] Extracted from @ format:', { lat, lng, raw: `${atMatch[1]},${atMatch[2]}` });
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      } else {
        console.warn('[Google Maps Utils] Invalid coordinate range:', { lat, lng });
      }
    }

    // Format 2: ?q=lat,lng or &q=lat,lng
    // Example: https://www.google.com/maps/search/?api=1&query=25.7616798,-80.1917902
    const qMatch = normalizedUrl.match(/[?&](?:q|query)=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      console.log('[Google Maps Utils] Extracted from q/query format:', { lat, lng, raw: `${qMatch[1]},${qMatch[2]}` });
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      } else {
        console.warn('[Google Maps Utils] Invalid coordinate range:', { lat, lng });
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

    console.warn('[Google Maps Utils] No coordinates found in URL:', normalizedUrl);
    return null;
  } catch (error) {
    console.error('[Google Maps Utils] Error extracting coordinates:', error, 'URL:', url);
    return null;
  }
}

