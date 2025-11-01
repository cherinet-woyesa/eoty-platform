import { useState, useEffect } from 'react';

export const useAuthenticatedVideoUrl = (videoUrl: string) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!videoUrl) {
      setLoading(false);
      return;
    }

    let objectUrlToRevoke: string | null = null;
    const fetchVideo = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('Authentication token not found.');
          setError('Authentication token not found.');
          setLoading(false);
          return;
        }

        const response = await fetch(videoUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        objectUrlToRevoke = URL.createObjectURL(blob);
        setObjectUrl(objectUrlToRevoke);
      } catch (error: any) {
        console.error('Error fetching authenticated video:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();

    return () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [videoUrl]);

  return { objectUrl, loading, error };
};
