const axios = require('axios');

/**
 * Geocode an address using Google Maps Geocoding API.
 * Returns { lat, lng, formatted } or null on failure.
 */
async function geocodeAddress({ address, city, region, country }) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { error: 'missing_api_key' };
  }

  const parts = [address, city, region, country].filter(Boolean);
  if (parts.length === 0) return { error: 'no_input' };

  const query = parts.join(', ');

  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address: query, key: apiKey }
    });

    if (res.data?.status === 'OK' && res.data.results?.length) {
      const best = res.data.results[0];
      return {
        lat: best.geometry?.location?.lat,
        lng: best.geometry?.location?.lng,
        formatted: best.formatted_address || query
      };
    }

    const status = res.data?.status || 'no_result';
    const message = res.data?.error_message || 'No result';
    return { error: status, status, message };
  } catch (err) {
    console.error('Geocode error:', err.message);
    return { error: 'geocode_error', message: err.message };
  }
}

/**
 * Lightweight preview call to geocode (used for client preview).
 */
async function geocodePreview(payload) {
  return geocodeAddress(payload);
}

module.exports = { geocodeAddress, geocodePreview };

