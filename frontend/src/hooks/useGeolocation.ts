import { useCallback, useState } from 'react';

interface Coordinates {
  lat: number;
  lng: number;
}

interface GeolocationOptions {
  highAccuracy?: boolean;
  timeoutMs?: number;
  maximumAgeMs?: number;
}

/**
 * Shared geolocation helper with consistent UX and error handling.
 */
export function useGeolocation(options: GeolocationOptions = {}) {
  const { highAccuracy = true, timeoutMs = 8000, maximumAgeMs = 60000 } = options;
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setCoords(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLoading(false);
      },
      (geoErr) => {
        let message = 'Unable to get your location. Please allow location access.';
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          message = 'Location access denied. Please enable location permissions.';
        } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          message = 'Location information is unavailable.';
        } else if (geoErr.code === geoErr.TIMEOUT) {
          message = 'Location request timed out. Try again.';
        }
        setError(message);
        setIsLoading(false);
        setCoords(null);
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs
      }
    );
  }, [highAccuracy, maximumAgeMs, timeoutMs]);

  const clearError = useCallback(() => setError(null), []);

  return { coords, isLoading, error, requestLocation, clearError };
}

export default useGeolocation;

