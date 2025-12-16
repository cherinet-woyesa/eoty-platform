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

    // Initial success handler
    const handleSuccess = (pos: GeolocationPosition) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setIsLoading(false);
    };

    // Helper for final error messages
    const handleError = (geoErr: GeolocationPositionError) => {
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
    };

    // Fallback handler if high accuracy fails
    const handleFallback = (err: GeolocationPositionError) => {
      if (highAccuracy && (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE)) {
        // Try again with low accuracy
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          handleError, // If fallback also fails, show error
          {
            enableHighAccuracy: false,
            timeout: timeoutMs,
            maximumAge: maximumAgeMs
          }
        );
      } else {
        handleError(err);
      }
    };

    // Try with requested settings first
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleFallback,
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

