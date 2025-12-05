import { useState, useEffect, useCallback } from 'react';

export function useSidebar() {
  const [favoriteHrefs, setFavoriteHrefs] = useState<string[]>([]);
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('sidebarFavorites');
    const savedRecent = localStorage.getItem('sidebarRecent');

    if (savedFavorites) {
      try {
        const parsed = JSON.parse(savedFavorites);
        // Handle migration from old format (array of objects) to new format (array of strings)
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
          setFavoriteHrefs(parsed.map((item: any) => item.href).filter(Boolean));
        } else {
          setFavoriteHrefs(parsed || []);
        }
      } catch (error) {
        console.error('Error parsing favorites:', error);
      }
    }

    if (savedRecent) {
      try {
        const parsed = JSON.parse(savedRecent);
        // Handle migration
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
          setRecentHrefs(parsed.map((item: any) => item.href).filter(Boolean));
        } else {
          setRecentHrefs(parsed || []);
        }
      } catch (error) {
        console.error('Error parsing recent items:', error);
      }
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('sidebarFavorites', JSON.stringify(favoriteHrefs));
  }, [favoriteHrefs]);

  useEffect(() => {
    localStorage.setItem('sidebarRecent', JSON.stringify(recentHrefs));
  }, [recentHrefs]);

  const toggleFavorite = useCallback((href: string) => {
    setFavoriteHrefs(prev => {
      if (prev.includes(href)) {
        return prev.filter(h => h !== href);
      }
      return [...prev, href].slice(0, 10); // Limit to 10 favorites
    });
  }, []);

  const addRecent = useCallback((href: string) => {
    setRecentHrefs(prev => {
      const filtered = prev.filter(h => h !== href);
      return [href, ...filtered].slice(0, 5); // Keep only 5 most recent
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecentHrefs([]);
  }, []);

  const isFavorite = useCallback((href: string) => {
    return favoriteHrefs.includes(href);
  }, [favoriteHrefs]);

  return {
    favoriteHrefs,
    recentHrefs,
    toggleFavorite,
    addRecent,
    clearRecent,
    isFavorite
  };
}