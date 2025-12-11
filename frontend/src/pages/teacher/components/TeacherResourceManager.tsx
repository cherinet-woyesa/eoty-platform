import React, { useState, useEffect } from 'react';
import { Upload, BookOpen, Search, Filter, Plus, FolderOpen, ArrowLeft, CheckCircle, X, Link as LinkIcon, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { resourcesApi } from '@/services/api/resources';
import { coursesApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { Resource } from '@/types/resources';
import UploadResource from '../UploadResource';
import EditResourceModal from './EditResourceModal';

interface TeacherResourceManagerProps {
  lessonId?: string;
  courseId?: string;
}

const TeacherResourceManager: React.FC<TeacherResourceManagerProps> = ({ lessonId, courseId }) => {
  const { user } = useAuth();
  const [view, setView] = useState<'list' | 'upload'>('list');
  const [resources, setResources] = useState<Resource[]>([]);
  const [attachedResources, setAttachedResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScope, setSelectedScope] = useState<'chapter_wide' | 'platform_wide'>('chapter_wide');
  const [attaching, setAttaching] = useState<number | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 9;

  // Edit State
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadResources();
    if (lessonId) {
      loadAttachedResources();
    }
  }, [selectedScope, lessonId, page]);

  const loadResources = async () => {
    try {
      setLoading(true);
      let response;
      const filters = { 
        search: searchTerm,
        page,
        limit: LIMIT
      };

      if (selectedScope === 'platform_wide' || !user?.chapter_id) {
        response = await resourcesApi.getPlatformResources(filters);
      } else {
        response = await resourcesApi.getChapterResources(user.chapter_id.toString(), filters);
      }

      if (response.success) {
        setResources(response.data.resources || []);
        if (response.data.pagination) {
          setTotalPages(Math.ceil(response.data.pagination.total / LIMIT));
        }
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttachedResources = async () => {
    if (!lessonId) return;
    try {
      const response = await coursesApi.getLesson(parseInt(lessonId));
      if (response.success && response.data.lesson.resources) {
        setAttachedResources(response.data.lesson.resources);
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
      await coursesApi.addResourceToLesson(parseInt(lessonId), resourceId);
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
      await coursesApi.removeResourceFromLesson(parseInt(lessonId), resourceId);
      await loadAttachedResources();
    } catch (error) {
      console.error('Failed to detach resource:', error);
    }
  };

  const handleDeleteResource = async (resourceId: number) => {
    if (!window.confirm('Are you sure you want to delete this resource? This action cannot be undone.')) return;
    
    try {
      await resourcesApi.deleteResource(resourceId);
      loadResources();
      if (lessonId) loadAttachedResources();
    } catch (error) {
      console.error('Failed to delete resource:', error);
      alert('Failed to delete resource');
    }
  };

  const isAttached = (resourceId: number) => {
    return attachedResources.some(r => r.id === resourceId);
  };

  if (view === 'upload') {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-800">Upload New Resource</h2>
          <button 
            onClick={() => setView('list')}
            className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#27AE60]" />
            Resource Library
          </h2>
          <p className="text-sm text-stone-500">
            {lessonId ? 'Manage resources for this lesson' : 'Manage your educational materials'}
          </p>
        </div>
        <button
          onClick={() => setView('upload')}
          className="flex items-center gap-2 px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#219150] transition-colors shadow-sm hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          Upload New
        </button>
      </div>

      {/* Attached Resources (Only if lessonId is present) */}
      {lessonId && (
        <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-4">
          <h3 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Attached to Current Lesson
          </h3>
          {attachedResources.length === 0 ? (
            <p className="text-sm text-emerald-600/70 italic">No resources attached to this lesson yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {attachedResources.map(resource => (
                <div key={resource.id} className="bg-white p-3 rounded-lg border border-emerald-200 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {resource.file_type?.includes('pdf') ? '📄' : '📝'}
                    </div>
                    <span className="text-sm font-medium text-stone-700 truncate">{resource.title}</span>
                  </div>
                  <button 
                    onClick={() => handleDetachResource(resource.id)}
                    className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove from lesson"
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
      <div className="flex-1 bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-stone-200 bg-stone-50/50">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search library..."
                  className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] text-sm"
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
              <select
                className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] text-sm bg-white"
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value as 'chapter_wide' | 'platform_wide')}
              >
                <option value="chapter_wide">Chapter Library</option>
                {isAdmin && <option value="platform_wide">Platform Library</option>}
              </select>
            </div>
            <div className="text-xs text-stone-500 font-medium">
              {resources.length} items shown
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27AE60]"></div>
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-stone-900 font-medium">Library is empty</h3>
              <p className="text-stone-500 text-sm mt-1">Upload resources to see them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((resource) => {
                const attached = isAttached(resource.id);
                return (
                  <div
                    key={resource.id}
                    className={`group relative bg-white rounded-xl border transition-all duration-200 ${
                      attached 
                        ? 'border-emerald-200 bg-emerald-50/30' 
                        : 'border-stone-200 hover:border-[#27AE60]/50 hover:shadow-md'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-xl">
                          {resource.file_type?.includes('pdf') ? '📄' :
                           resource.file_type?.includes('image') ? '🖼️' :
                           resource.file_type?.includes('video') ? '🎬' :
                           resource.file_type?.includes('audio') ? '🎵' : '📝'}
                        </div>
                        <div className="flex items-center gap-2">
                          {lessonId && (
                            <button
                              onClick={() => attached ? handleDetachResource(resource.id) : handleAttachResource(resource.id)}
                              disabled={attaching === resource.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                attached
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700'
                                  : 'bg-stone-100 text-stone-600 hover:bg-[#27AE60] hover:text-white'
                              }`}
                            >
                              {attaching === resource.id ? (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : attached ? (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  Attached
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3" />
                                  Attach
                                </>
                              )}
                            </button>
                          )}
                          
                          {/* Edit/Delete Actions */}
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => setEditingResource(resource)}
                              className="p-1.5 text-stone-400 hover:text-[#27AE60] hover:bg-stone-100 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteResource(resource.id)}
                              className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-stone-900 truncate mb-1" title={resource.title}>
                        {resource.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 mb-3">
                        {resource.category && (
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] uppercase tracking-wider font-medium">
                            {resource.category}
                          </span>
                        )}
                        <span className="text-xs text-stone-400">•</span>
                        <span className="text-xs text-stone-500">
                          {new Date(resource.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {resource.description && (
                        <p className="text-sm text-stone-600 line-clamp-2 mb-4 h-10">
                          {resource.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-600">
                            {resource.author?.charAt(0) || 'U'}
                          </div>
                          <span className="text-xs text-stone-500 truncate max-w-[80px]">
                            {resource.author}
                          </span>
                        </div>
                        <a 
                          href={resource.file_path} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-[#27AE60] hover:text-[#219150] flex items-center gap-1"
                        >
                          View File
                          <ArrowLeft className="h-3 w-3 rotate-180" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5 text-stone-600" />
            </button>
            <span className="text-sm font-medium text-stone-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5 text-stone-600" />
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
