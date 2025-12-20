import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Plus, ArrowLeft } from 'lucide-react';
import { resourcesApi } from '@/services/api/resources';
import { apiClient } from '@/services/api/apiClient';
import type { Resource } from '@/types/resources';
import { brandColors } from '@/theme/brand';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import AttachedResourcesList from './resources/AttachedResourcesList';
import ResourceLibraryBrowser from './resources/ResourceLibraryBrowser';

// Lazy load components
const UploadResource = lazy(() => import('../UploadResource'));
const EditResourceModal = lazy(() => import('./EditResourceModal'));

interface TeacherResourceManagerProps {
  lessonId?: string;
  hideAttachedList?: boolean;
  hideHeader?: boolean;
  onAttach?: () => void;
}

const TeacherResourceManager: React.FC<TeacherResourceManagerProps> = ({ 
  lessonId, 
  hideAttachedList = false,
  hideHeader = false,
  onAttach
}) => {
  const { t } = useTranslation();
  // const { user } = useAuth();
  const [view, setView] = useState<'list' | 'upload'>('list');
  const [resources, setResources] = useState<Resource[]>([]);
  const [attachedResources, setAttachedResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine'>('all');
  const [attaching, setAttaching] = useState<number | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 9;

  // Edit State
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  useEffect(() => {
    loadResources();
    if (lessonId) {
      loadAttachedResources();
    }
  }, [scopeFilter, lessonId, page]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const response = await resourcesApi.searchResources({
        search: searchTerm,
        page,
        limit: LIMIT,
        resource_scope: scopeFilter === 'mine' ? 'mine' : undefined
      } as any);

      if (response.success) {
        setResources(response.data.resources || []);
        if (response.data.pagination) {
          setTotalPages(Math.ceil(response.data.pagination.total / LIMIT));
        }
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
      // Don't crash the UI if API fails
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAttachedResources = async () => {
    if (!lessonId) return;
    try {
      const res = await apiClient.get(`/lessons/${lessonId}`);
      if (res.data?.success) {
        const data = res.data.data;
        if (data?.lesson?.resources) {
          setAttachedResources(data.lesson.resources);
        }
      }
    } catch (error) {
      console.error('Failed to load attached resources:', error);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to first page on search
    // Debounce search
    setTimeout(() => loadResources(), 300);
  };

  const handleAttachResource = async (resourceId: number) => {
    if (!lessonId) return;
    setAttaching(resourceId);
    try {
      await apiClient.post('/resources/attach-to-lesson', { resourceId, lessonId: parseInt(lessonId) });
      await loadAttachedResources();
      if (onAttach) onAttach();
    } catch (error) {
      console.error('Failed to attach resource:', error);
    } finally {
      setAttaching(null);
    }
  };

  const handleDetachResource = async (resourceId: number) => {
    if (!lessonId) return;
    try {
      await apiClient.post('/resources/detach-from-lesson', { resourceId });
      await loadAttachedResources();
    } catch (error) {
      console.error('Failed to detach resource:', error);
    }
  };

  const handleDeleteResource = async (resourceId: number) => {
    if (!window.confirm(t('teacher_content.resources.delete_confirm', 'Are you sure you want to delete this resource? This action cannot be undone.'))) return;

    try {
      await resourcesApi.deleteResource(resourceId);
      loadResources();
      if (lessonId) loadAttachedResources();
    } catch (error) {
      console.error('Failed to delete resource:', error);
      alert(t('teacher_content.resources.delete_error', 'Failed to delete resource'));
    }
  };

  if (view === 'upload') {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('teacher_content.resources.upload_new_title', 'Upload New Resource')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('teacher_content.resources.upload_new_description', 'Add content to your library')}</p>
          </div>
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('teacher_content.resources.back_to_library', 'Back to Library')}
          </button>
        </div>
        <Suspense fallback={<div className="flex justify-center p-12"><LoadingSpinner /></div>}>
          <UploadResource
            variant="embedded"
            lessonId={lessonId}
            onUploadComplete={() => {
              setView('list');
              loadResources();
              if (lessonId) {
                loadAttachedResources();
              }
            }}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header & Actions */}
      {!hideHeader && (
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColors.primaryHex}0D` }}>
              <BookOpen className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
            </div>
            {t('teacher_content.resources.library_title', 'Resource Library')}
          </h2>
          <p className="text-sm text-gray-500 mt-1 ml-11">
            {lessonId ? t('teacher_content.resources.library_description_lesson', 'Select resources to attach to this lesson') : t('teacher_content.resources.library_description_general', 'Manage your educational materials')}
          </p>
        </div>
        <button
          onClick={() => setView('upload')}
          className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium"
          style={{ backgroundColor: brandColors.primaryHex }}
        >
          <Plus className="h-4 w-4" />
          {t('teacher_content.resources.upload_new', 'Upload New')}
        </button>
      </div>
      )}

      {/* Attached Resources (Only if lessonId is present) */}
      {lessonId && !hideAttachedList && (
        <AttachedResourcesList
          lessonId={lessonId}
          attachedResources={attachedResources}
          handleDetachResource={handleDetachResource}
          t={t as any}
        />
      )}


      {/* Library Browser */}
      <ResourceLibraryBrowser
        resources={resources}
        loading={loading}
        searchTerm={searchTerm}
        scopeFilter={scopeFilter}
        page={page}
        totalPages={totalPages}
        lessonId={lessonId}
        isAttached={(id) => attachedResources.some(r => r.id === id)}
        attaching={attaching}
        handleSearch={handleSearch}
        setScopeFilter={setScopeFilter}
        setPage={setPage}
        handleAttachResource={handleAttachResource}
        handleDetachResource={handleDetachResource}
        handleDeleteResource={handleDeleteResource}
        setEditingResource={setEditingResource}
        setView={setView}
        t={t as any}
      />

      {/* Edit Modal */}
      {editingResource && (
        <Suspense fallback={null}>
          <EditResourceModal
            resource={editingResource}
            isOpen={!!editingResource}
            onClose={() => setEditingResource(null)}
            onUpdate={loadResources}
          />
        </Suspense>
      )}
    </div>
  );
};

export default TeacherResourceManager;
