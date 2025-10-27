import { useState, useEffect } from 'react';
import { resourcesApi } from '../services/api';
import type { Resource, ResourceFilters, UserNote, AISummary } from '../types/resources';

export const useResources = (initialFilters: ResourceFilters = {}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ResourceFilters>(initialFilters);

  const fetchResources = async (newFilters?: ResourceFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const currentFilters = newFilters || filters;
      const response = await resourcesApi.getResources(currentFilters);
      
      if (response.success) {
        setResources(response.data.resources);
      } else {
        setError('Failed to fetch resources');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const updateFilters = (newFilters: ResourceFilters) => {
    setFilters(newFilters);
    fetchResources(newFilters);
  };

  return {
    resources,
    loading,
    error,
    filters,
    updateFilters,
    refetch: () => fetchResources()
  };
};

export const useResourceNotes = (resourceId: number) => {
  const [notes, setNotes] = useState<{ user: UserNote[]; public: UserNote[] }>({ user: [], public: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await resourcesApi.getNotes(resourceId);
      
      if (response.success) {
        setNotes({
          user: response.data.user_notes,
          public: response.data.public_notes
        });
      } else {
        setError('Failed to fetch notes');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (content: string, isPublic: boolean = false, anchorPoint?: string) => {
    try {
      const response = await resourcesApi.createNote({
        resourceId,
        content,
        anchorPoint,
        isPublic
      });

      if (response.success) {
        await fetchNotes(); // Refresh notes
        return response.data.note;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create note');
    }
  };

  useEffect(() => {
    if (resourceId) {
      fetchNotes();
    }
  }, [resourceId]);

  return {
    notes,
    loading,
    error,
    addNote,
    refetch: fetchNotes
  };
};

export const useAISummary = (resourceId: number) => {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (type: string = 'brief') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await resourcesApi.getSummary(resourceId, type);
      
      if (response.success) {
        setSummary(response.data.summary);
      } else {
        setError('Failed to fetch summary');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return {
    summary,
    loading,
    error,
    fetchSummary
  };
};