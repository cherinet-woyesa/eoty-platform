import React from 'react';
import { 
  Search, FolderOpen, Plus, CheckCircle, Edit2, Trash2, 
  ArrowLeft, ChevronLeft, ChevronRight, FileText, 
  Image as ImageIcon, Video as VideoIcon, Music 
} from 'lucide-react';
import type { Resource } from '@/types/resources';
import { brandColors } from '@/theme/brand';

interface ResourceLibraryBrowserProps {
  searchTerm: string;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  scopeFilter: 'all' | 'mine';
  setScopeFilter: (filter: 'all' | 'mine') => void;
  resources: Resource[];
  loading: boolean;
  setView: (view: 'list' | 'upload') => void;
  lessonId?: string;
  isAttached: (resourceId: number) => boolean;
  handleAttachResource: (resourceId: number) => void;
  handleDetachResource: (resourceId: number) => void;
  attaching: number | null;
  setEditingResource: (resource: Resource) => void;
  handleDeleteResource: (resourceId: number) => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  t: (key: string, params?: any) => string;
}

const ResourceLibraryBrowser: React.FC<ResourceLibraryBrowserProps> = ({
  searchTerm,
  handleSearch,
  scopeFilter,
  setScopeFilter,
  resources,
  loading,
  setView,
  lessonId,
  isAttached,
  handleAttachResource,
  handleDetachResource,
  attaching,
  setEditingResource,
  handleDeleteResource,
  page,
  setPage,
  totalPages,
  t
}) => {
  const getFileIcon = (fileType: string = '') => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('image')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('video')) return <VideoIcon className="h-5 w-5 text-purple-500" />;
    if (fileType.includes('audio')) return <Music className="h-5 w-5 text-amber-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  return (
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
  );
};

export default ResourceLibraryBrowser;
