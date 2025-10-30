import { useState, useEffect, useCallback } from 'react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
  color?: string;
}

export function useSidebar() {
  const [favorites, setFavorites] = useState<NavigationItem[]>([]);
  const [recentItems, setRecentItems] = useState<NavigationItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('sidebarFavorites');
    const savedRecent = localStorage.getItem('sidebarRecent');

    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (error) {
        console.error('Error parsing favorites:', error);
      }
    }

    if (savedRecent) {
      try {
        setRecentItems(JSON.parse(savedRecent).slice(0, 5)); // Keep only 5 most recent
      } catch (error) {
        console.error('Error parsing recent items:', error);
      }
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('sidebarFavorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('sidebarRecent', JSON.stringify(recentItems));
  }, [recentItems]);

  const addFavorite = useCallback((item: NavigationItem) => {
    setFavorites(prev => {
      // Avoid duplicates
      if (prev.some(fav => fav.href === item.href)) {
        return prev;
      }
      return [...prev, item].slice(0, 10); // Limit to 10 favorites
    });
  }, []);

  const removeFavorite = useCallback((href: string) => {
    setFavorites(prev => prev.filter(item => item.href !== href));
  }, []);

  const addRecent = useCallback((item: NavigationItem) => {
    setRecentItems(prev => {
      // Remove if already exists and add to beginning
      const filtered = prev.filter(recent => recent.href !== item.href);
      return [item, ...filtered].slice(0, 5); // Keep only 5 most recent
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecentItems([]);
  }, []);

  return {
    favorites,
    recentItems,
    addFavorite,
    removeFavorite,
    addRecent,
    clearRecent
  };
}