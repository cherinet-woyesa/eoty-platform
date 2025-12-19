import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, Plus, FolderOpen, ArrowLeft, CheckCircle, X, Link as LinkIcon, Trash2, Edit2, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Video as VideoIcon, Music } from 'lucide-react';
import { resourcesApi } from '@/services/api/resources';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';
import type { Resource } from '@/types/resources';
import UploadResource from '../UploadResource';
import EditResourceModal from './EditResourceModal';
import { brandColors } from '@/theme/brand';

interface TeacherResourceManagerProps {
  lessonId?: string;
}

const TeacherResourceManager: React.FC<TeacherResourceManagerProps> = ({ lessonId }) => {
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

  const isAttached = (resourceId: number) => {
    return attachedResources.some(r => r.id === resourceId);
  };

  const getFileIcon = (fileType: string = '') => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('image')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('video')) return <VideoIcon className="h-5 w-5 text-purple-500" />;
    if (fileType.includes('audio')) return <Music className="h-5 w-5 text-amber-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
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
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header & Actions */}
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

      {/* Attached Resources (Only if lessonId is present) */}
      {lessonId && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-6">
          <h3 className="text-sm font-bold text-emerald-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
            <LinkIcon className="h-4 w-4" />
            {t('teacher_content.resources.attached_title', 'Attached to Current Lesson')}
          </h3>
          {attachedResources.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-emerald-200/50 rounded-xl bg-white/50">
              <p className="text-sm text-emerald-600/70 italic">{t('teacher_content.resources.no_attached', 'No resources attached to this lesson yet.')}</p>
              <p className="text-xs text-emerald-500 mt-1">{t('teacher_content.resources.attach_hint', 'Select resources from the library below to attach them.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {attachedResources.map(resource => (
                <div key={resource.id} className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-100">
                      {getFileIcon(resource.file_type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{resource.title}</p>
                      <p className="text-xs text-gray-500 truncate">{resource.file_type?.split('/')[1] || 'file'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDetachResource(resource.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title={t('teacher_content.resources.remove_from_lesson', 'Remove from lesson')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Library Browser */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder={t('teacher_content.resources.search_placeholder', 'Search library...')}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent text-sm transition-shadow"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
              <select
                className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 text-sm bg-white cursor-pointer hover:border-gray-400 transition-colors"
                style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value as 'all' | 'mine')}
              >
                <option value="all">{t('teacher_content.resources.filter_all', 'All Resources')}</option>
                <option value="mine">{t('teacher_content.resources.filter_mine', 'My Uploads')}</option>
              </select>
            </div>
            <div className="text-xs font-medium px-3 py-1 bg-gray-100 rounded-full text-gray-600 border border-gray-200">
              {resources.length} {t('teacher_content.resources.items', 'items')}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: brandColors.primaryHex }}></div>
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t('teacher_content.resources.empty_title', 'Library is empty')}</h3>
              <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">{t('teacher_content.resources.empty_desc', 'Upload resources to build your library and share materials with students.')}</p>
              <button
                onClick={() => setView('upload')}
                className="mt-6 inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('teacher_content.resources.upload_first', 'Upload First Resource')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {resources.map((resource) => {
                const attached = isAttached(resource.id);
                return (
                  <div
                    key={resource.id}
                    className={`group relative bg-white rounded-xl border transition-all duration-200 flex flex-col ${attached
                        ? 'border-emerald-200 ring-1 ring-emerald-100 shadow-sm'
                        : 'border-gray-200 hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                    style={!attached ? { borderColor: 'transparent', boxShadow: `0 0 0 1px ${brandColors.primaryHex}20` } : {}}
                  >
                    <div className="p-5 flex-1">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm">
                          {getFileIcon(resource.file_type)}
                        </div>
                        <div className="flex items-center gap-2">
                          {lessonId && (
                            <button
                              onClick={() => attached ? handleDetachResource(resource.id) : handleAttachResource(resource.id)}
                              disabled={attaching === resource.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${attached
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-red-50 hover:text-red-700 hover:border-red-100'
                                  : 'bg-gray-50 text-gray-600 border border-gray-200'
                                }`}
                              style={!attached ? {
                                ':hover': {
                                  backgroundColor: `${brandColors.primaryHex}1A`,
                                  color: brandColors.primaryHex,
                                  borderColor: `${brandColors.primaryHex}33`
                                }
                              } as React.CSSProperties : {}}
                            >
                              {attaching === resource.id ? (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : attached ? (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  {t('teacher_content.resources.attached', 'Attached')}
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3" />
                                  {t('teacher_content.resources.attach', 'Attach')}
                                </>
                              )}
                            </button>
                          )}

                          {/* Edit/Delete Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingResource(resource)}
                              className="p-1.5 text-gray-400 hover:bg-opacity-10 rounded-lg transition-colors"
                              style={{ ':hover': { color: brandColors.primaryHex, backgroundColor: `${brandColors.primaryHex}1A` } } as React.CSSProperties}
                              title={t('common.edit', 'Edit')}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteResource(resource.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('common.delete', 'Delete')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <h3 className="font-bold text-gray-900 truncate mb-1 text-base" title={resource.title}>
                        {resource.title}
                      </h3>

                      <div className="flex items-center gap-2 mb-3">
                        {resource.is_public && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] uppercase tracking-wider font-bold border border-blue-100">
                            {t('common.public', 'Public')}
                          </span>
                        )}
                        {resource.category && (
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] uppercase tracking-wider font-bold border border-gray-200">
                            {resource.category}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {new Date(resource.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {resource.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-4 h-10 leading-relaxed">
                          {resource.description}
                        </p>
                      )}
                    </div>

                    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border"
                          style={{
                            backgroundColor: `${brandColors.primaryHex}1A`,
                            color: brandColors.primaryHex,
                            borderColor: `${brandColors.primaryHex}33`
                          }}>
                          {resource.author?.charAt(0) || 'U'}
                        </div>
                        <span className="text-xs font-medium text-gray-500 truncate max-w-[80px]">
                          {resource.author}
                        </span>
                      </div>
                      <a
                        href={resource.file_url || resource.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold flex items-center gap-1 group/link"
                        style={{ color: brandColors.primaryHex }}
                      >
                        {t('teacher_content.resources.view_file', 'View File')}
                        <ArrowLeft className="h-3 w-3 rotate-180 transition-transform group-hover/link:translate-x-0.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-gray-200 transition-all"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {t('common.pagination', { page, total: totalPages, defaultValue: `Page ${page} of ${totalPages}` })}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-gray-200 transition-all"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingResource && (
        <EditResourceModal
          resource={editingResource}
          isOpen={!!editingResource}
          onClose={() => setEditingResource(null)}
          onUpdate={loadResources}
        />
      )}
    </div>
  );
};

export default TeacherResourceManager;
