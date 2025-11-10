import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, apiUtils } from '../services/api/apiClient';

interface UseRealTimeDataOptions<T> {
  initialData: T;
  refetchInterval?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
  cacheKey?: string;
  staleTime?: number;
  useMockData?: boolean;
}

interface UseRealTimeDataReturn<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isFetching: boolean;
  lastUpdated: Date | null;
  isStale: boolean;
  clearCache: () => void;
  usingMockData: boolean;
  isOnline: boolean;
  optimisticUpdate: (updater: (currentData: T) => T) => void;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleAt: number;
}

// Enhanced cache with persistence
const dataCache = new Map<string, CacheEntry<any>>();

export function useRealTimeData<T>(
  endpoint: string, 
  options: UseRealTimeDataOptions<T>
): UseRealTimeDataReturn<T> {
  const { 
    initialData, 
    refetchInterval, 
    enabled = true,
    onError,
    onSuccess,
    cacheKey,
    staleTime = 30000,
    useMockData = false
  } = options;
  
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const refetchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cache management
  const checkStaleData = useCallback((cacheEntry: CacheEntry<T> | undefined) => {
    if (!cacheEntry) return true;
    return Date.now() > cacheEntry.staleAt;
  }, []);

  const getCachedData = useCallback((): T | null => {
    if (!cacheKey) return null;
    const cached = dataCache.get(cacheKey);
    return cached && !checkStaleData(cached) ? cached.data : null;
  }, [cacheKey, checkStaleData]);

  const setCachedData = useCallback((newData: T) => {
    if (!cacheKey) return;
    const now = Date.now();
    dataCache.set(cacheKey, {
      data: newData,
      timestamp: now,
      staleAt: now + staleTime
    });
  }, [cacheKey, staleTime]);

  const clearCache = useCallback(() => {
    if (cacheKey) {
      dataCache.delete(cacheKey);
    }
  }, [cacheKey]);

  // Mock data generator
  const getMockData = useCallback((): T => {
    const mockEndpoints: { [key: string]: any } = {
      '/students/dashboard': {
        progress: {
          totalCourses: 5,
          completedCourses: 2,
          totalLessons: 48,
          completedLessons: 23,
          studyStreak: 7,
          totalPoints: 1250,
          nextGoal: 'Complete 5 more lessons',
          weeklyGoal: 10,
          weeklyProgress: 7,
          level: 'Intermediate',
          xp: 750,
          nextLevelXp: 1000,
          monthlyProgress: 15,
          monthlyGoal: 20,
          averageScore: 85,
          timeSpent: 1250,
          certificatesEarned: 3,
          rank: 'Top 15%',
          percentile: 15
        },
        enrolledCourses: [
          {
            id: '1',
            title: 'Advanced React Patterns',
            description: 'Learn advanced React patterns and best practices for building scalable applications.',
            progress: 75,
            totalLessons: 12,
            completedLessons: 9,
            lastAccessed: new Date().toISOString(),
            instructor: 'Sarah Johnson',
            rating: 4.8,
            studentCount: 1247,
            duration: 360,
            thumbnail: '/api/placeholder/300/200',
            category: 'Web Development',
            difficulty: 'intermediate',
            tags: ['React', 'JavaScript', 'Frontend'],
            isBookmarked: true,
            isFeatured: true
          }
        ],
        recentActivity: [
          {
            id: '1',
            type: 'lesson_completed',
            title: 'Completed Lesson',
            description: 'Finished React Hooks Deep Dive',
            timestamp: new Date(),
            metadata: {
              courseTitle: 'Advanced React Patterns',
              points: 50,
              progress: 75
            },
            read: false,
            importance: 'medium',
            category: 'learning'
          }
        ],
        recommendations: [
          {
            id: '1',
            type: 'course',
            title: 'React Performance Optimization',
            description: 'Learn techniques to optimize React application performance and reduce bundle size.',
            difficulty: 'intermediate',
            duration: 240,
            rating: 4.7,
            students: 1560,
            matchScore: 92,
            tags: ['React', 'Performance', 'Optimization'],
            reason: 'Based on your React learning pattern',
            isNew: true,
            pointsReward: 200
          }
        ]
      }
    };

    return mockEndpoints[endpoint] || initialData;
  }, [endpoint, initialData]);

  // Enhanced fetch function
  const fetchData = useCallback(async (isBackgroundRefetch = false) => {
    if (!enabled) return;

    // Use mock data if explicitly requested or in demo mode
    if (useMockData || import.meta.env.VITE_DEMO_MODE === 'true') {
      console.log('🎭 Using mock data for:', endpoint);
      const mockData = getMockData();
      setData(mockData);
      setUsingMockData(true);
      setLastUpdated(new Date());
      setIsLoading(false);
      onSuccess?.(mockData);
      return;
    }

    // Check cache first for background refetches
    if (isBackgroundRefetch && cacheKey) {
      const cached = getCachedData();
      if (cached) {
        setData(cached);
        setLastUpdated(new Date());
        return;
      }
    }

    if (!isBackgroundRefetch) {
      setIsLoading(true);
    }
    
    setIsFetching(true);
    setError(null);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await apiClient.get(endpoint, {
        signal: abortControllerRef.current.signal,
        timeout: 10000,
      });
      
      const responseData = response.data;
      
      // Handle both response formats: { success: true, data: ... } and direct data
      const finalData = responseData.success !== undefined ? responseData.data : responseData;
      
      setData(finalData);
      setLastUpdated(new Date());
      setCachedData(finalData);
      setUsingMockData(false);
      setIsStale(false);
      onSuccess?.(finalData);
      
      console.log(`✅ Data fetched from ${endpoint}`, {
        timestamp: new Date().toISOString(),
        fromCache: false
      });
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled
      }
      
      console.error(`❌ Fetch error for ${endpoint}:`, err);
      
      // Try to use cached data on error
      const cached = getCachedData();
      if (cached) {
        setData(cached);
        setIsStale(true);
        setError('Using cached data - network error occurred');
        console.warn('🔄 Using cached data due to fetch error');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        
        // Fallback to mock data if no cache available
        if (useMockData) {
          const mockData = getMockData();
          setData(mockData);
          setUsingMockData(true);
          setError('Using demo data - server unavailable');
        }
      }
      
    } finally {
      setIsLoading(false);
      setIsFetching(false);
      abortControllerRef.current = null;
    }
  }, [
    endpoint, enabled, onError, onSuccess, cacheKey, 
    getCachedData, setCachedData, useMockData, getMockData
  ]);

  // Initial fetch with smart caching
  useEffect(() => {
    if (enabled) {
      // Check cache first
      const cached = getCachedData();
      if (cached && !useMockData) {
        setData(cached);
        setLastUpdated(new Date());
        setIsLoading(false);
        setIsStale(checkStaleData(dataCache.get(cacheKey!)));
        
        // Fetch fresh data in background
        setTimeout(() => fetchData(true), 100);
      } else {
        fetchData();
      }
    }

    // Set up refetch interval
    let intervalId: NodeJS.Timeout | null = null;
    if (refetchInterval && enabled && !useMockData) {
      intervalId = setInterval(() => {
        fetchData(true);
      }, refetchInterval);
      refetchIntervalRef.current = intervalId;
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, refetchInterval, enabled, getCachedData, checkStaleData, cacheKey, useMockData]);

  // Monitor staleness
  useEffect(() => {
    if (!cacheKey || !lastUpdated || useMockData) return;

    const checkStale = () => {
      const cached = dataCache.get(cacheKey);
      setIsStale(checkStaleData(cached));
    };

    const interval = setInterval(checkStale, 5000);
    return () => clearInterval(interval);
  }, [cacheKey, lastUpdated, checkStaleData, useMockData]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Optimistic updates
  const optimisticUpdate = useCallback((updater: (currentData: T) => T) => {
    setData(prevData => {
      const newData = updater(prevData);
      if (cacheKey) {
        setCachedData(newData);
      }
      return newData;
    });
  }, [cacheKey, setCachedData]);

  return { 
    data, 
    isLoading, 
    error, 
    refetch, 
    isFetching, 
    lastUpdated,
    isStale,
    clearCache,
    usingMockData,
    isOnline,
    optimisticUpdate
  };
}

// Specialized hook for dashboard data
export function useDashboardData() {
  return useRealTimeData('/students/dashboard', {
    initialData: {
      progress: {
        totalCourses: 0,
        completedCourses: 0,
        totalLessons: 0,
        completedLessons: 0,
        studyStreak: 0,
        totalPoints: 0,
        nextGoal: '',
        weeklyGoal: 0,
        weeklyProgress: 0,
        level: 'Beginner',
        xp: 0,
        nextLevelXp: 1000,
        monthlyProgress: 0,
        monthlyGoal: 0,
        averageScore: 0,
        timeSpent: 0,
        certificatesEarned: 0,
        rank: '',
        percentile: 0
      },
      enrolledCourses: [],
      recentActivity: [],
      recommendations: []
    },
    refetchInterval: 30000,
    cacheKey: 'dashboard_data',
    staleTime: 60000,
    useMockData: import.meta.env.VITE_DEMO_MODE === 'true',
    onError: (error) => {
      console.error('Dashboard data fetch failed:', error);
    },
    onSuccess: (data) => {
      console.log('Dashboard data updated successfully');
    }
  });
}

// Hook for course data
export function useCourseData(courseId?: string) {
  return useRealTimeData(courseId ? `/courses/${courseId}` : '', {
    initialData: null,
    cacheKey: courseId ? `course_${courseId}` : undefined,
    staleTime: 120000,
    enabled: !!courseId,
    useMockData: import.meta.env.VITE_DEMO_MODE === 'true'
  });
}

// Hook for user progress
export function useUserProgress(userId?: string) {
  return useRealTimeData(userId ? `/students/${userId}/progress` : '', {
    initialData: {
      completedLessons: 0,
      totalLessons: 0,
      averageScore: 0,
      timeSpent: 0
    },
    cacheKey: userId ? `user_progress_${userId}` : undefined,
    staleTime: 60000,
    enabled: !!userId,
    useMockData: import.meta.env.VITE_DEMO_MODE === 'true'
  });
}