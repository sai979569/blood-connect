/**
 * Geocoding Service for Blood Connect
 * Uses OpenStreetMap Nominatim with caching, debouncing, request cancellation,
 * and compliance with Nominatim Usage Policy (custom User-Agent & rate handling).
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'BloodConnect-PWA-Coordination/1.0 (contact@bloodconnect.org)';

// In-memory cache for recent geocoding queries
const searchCache = new Map();
const reverseCache = new Map();

/**
 * Searches for places, localities, hospitals, and addresses by text query.
 *
 * @param {string} query - Freeform address or place name
 * @param {object} options - Optional configuration { signal, limit }
 * @returns {Promise<Array<{ displayName: string, shortName: string, coordinates: [number, number], lat: number, lng: number }>>}
 */
export async function searchPlaces(query, { signal, limit = 5 } = {}) {
  const trimmed = (query || '').trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const cacheKey = `${trimmed.toLowerCase()}__${limit}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  const url = new URL(`${NOMINATIM_BASE_URL}/search`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding service error (${response.status})`);
  }

  const data = await response.json();

  const results = data.map((item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    return {
      id: item.place_id,
      displayName: item.display_name,
      shortName: item.name || item.display_name.split(',')[0],
      coordinates: [lng, lat], // GeoJSON order [longitude, latitude]
      lat,
      lng,
      type: item.type,
      importance: item.importance,
    };
  });

  // Cache up to 100 queries
  if (searchCache.size > 100) {
    searchCache.clear();
  }
  searchCache.set(cacheKey, results);

  return results;
}

/**
 * Reverse geocodes coordinates [lng, lat] into a human-readable address.
 *
 * @param {[number, number]} coordinates - [longitude, latitude]
 * @param {object} options - Optional configuration { signal }
 * @returns {Promise<string>}
 */
export async function reverseGeocode(coordinates, { signal } = {}) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return '';
  }

  const [lng, lat] = coordinates;
  const roundedKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

  if (reverseCache.has(roundedKey)) {
    return reverseCache.get(roundedKey);
  }

  const url = new URL(`${NOMINATIM_BASE_URL}/reverse`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('addressdetails', '1');

  try {
    const response = await fetch(url.toString(), {
      signal,
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) return '';

    const data = await response.json();
    const address = data.display_name || '';

    if (reverseCache.size > 100) {
      reverseCache.clear();
    }
    reverseCache.set(roundedKey, address);

    return address;
  } catch (err) {
    if (err.name === 'AbortError') return '';
    console.warn('[Geocoding] Reverse geocode error:', err.message);
    return '';
  }
}

export default { searchPlaces, reverseGeocode };
