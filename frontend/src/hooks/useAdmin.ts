import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import type { 
  ContentUpload, 
  FlaggedContent, 
  AdminDashboard, 
  ContentTag, 
  AuditLog,
  SystemAlert 
} from '../types/admin';

export const useUploadQueue = (status?: string, chapter?: string) => {
  const [uploads, setUploads] = useState<ContentUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchUploads = async (newPage: number = 1, newStatus?: string, newChapter?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminApi.getUploadQueue(
        newStatus || status,
        newChapter || chapter,
        newPage,
        20
      );
      
      if (response.success) {
        if (newPage === 1) {
          setUploads(response.data.uploads);
        } else {
          setUploads(prev => [...prev, ...response.data.uploads]);
        }
        
        setHasMore(response.data.uploads.length === 20);
        setPage(newPage);
      } else {
        setError('Failed to fetch upload queue');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch upload queue');
    } finally {
      setLoading(false);
    }
  };

  const approveUpload = async (uploadId: number, action: 'approve' | 'reject', rejectionReason?: string) => {
    try {
      const response = await adminApi.approveContent(uploadId, action, rejectionReason);
      
      if (response.success) {
        // Remove from local state
        setUploads(prev => prev.filter(upload => upload.id !== uploadId));
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to process upload');
    }
  };

  useEffect(() => {
    fetchUploads(1);
  }, [status, chapter]);

  return {
    uploads,
    loading,
    error,
    hasMore,
    fetchUploads,
    approveUpload,
    refetch: () => fetchUploads(1)
  };
};

export const useFlaggedContent = (status?: string) => {
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlaggedContent = async (newStatus?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminApi.getFlaggedContent(newStatus || status);
      
      if (response.success) {
        setFlaggedContent(response.data.flagged_content);
        setStats(response.data.stats);
      } else {
        setError('Failed to fetch flagged content');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch flagged content');
    } finally {
      setLoading(false);
    }
  };

  const reviewFlag = async (flagId: number, action: 'dismiss' | 'remove' | 'warn', notes?: string) => {
    try {
      const response = await adminApi.reviewFlaggedContent(flagId, { action, notes });
      
      if (response.success) {
        // Remove from local state
        setFlaggedContent(prev => prev.filter(flag => flag.id !== flagId));
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to review flag');
    }
  };

  useEffect(() => {
    fetchFlaggedContent();
  }, [status]);

  return {
    flaggedContent,
    stats,
    loading,
    error,
    fetchFlaggedContent,
    reviewFlag,
    refetch: () => fetchFlaggedContent()
  };
};

export const useAdminDashboard = (timeframe: string = '7days') => {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async (newTimeframe?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminApi.getAnalytics(newTimeframe || timeframe);
      
      if (response.success) {
        setDashboard(response.data);
      } else {
        setError('Failed to fetch dashboard data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [timeframe]);

  return {
    dashboard,
    loading,
    error,
    refetch: fetchDashboard
  };
};

export const useContentTags = (category?: string) => {
  const [tags, setTags] = useState<ContentTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = async (newCategory?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminApi.getTags(newCategory || category);
      
      if (response.success) {
        setTags(response.data.tags);
      } else {
        setError('Failed to fetch tags');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  };

  const createTag = async (tagData: { name: string; category?: string; color?: string }) => {
    try {
      const response = await adminApi.createTag(tagData);
      
      if (response.success) {
        await fetchTags(); // Refresh tags
        return response.data.tag;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create tag');
    }
  };

  useEffect(() => {
    fetchTags();
  }, [category]);

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    refetch: () => fetchTags()
  };
};

export const useAuditLogs = (filters: { adminId?: number; actionType?: string; startDate?: string; endDate?: string } = {}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = async (newPage: number = 1, newFilters?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const currentFilters = newFilters || filters;
      const response = await adminApi.getAuditLogs(
        currentFilters.adminId,
        currentFilters.actionType,
        currentFilters.startDate,
        currentFilters.endDate,
        newPage,
        50
      );
      
      if (response.success) {
        if (newPage === 1) {
          setLogs(response.data.logs);
        } else {
          setLogs(prev => [...prev, ...response.data.logs]);
        }
        
        setHasMore(response.data.logs.length === 50);
        setPage(newPage);
      } else {
        setError('Failed to fetch audit logs');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchLogs(page + 1);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filters.adminId, filters.actionType, filters.startDate, filters.endDate]);

  return {
    logs,
    loading,
    error,
    hasMore,
    fetchLogs,
    loadMore,
    refetch: () => fetchLogs(1)
  };
};