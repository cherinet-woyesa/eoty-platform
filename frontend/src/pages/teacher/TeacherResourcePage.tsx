import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  BookOpen, Users, Globe, Plus, FolderOpen, Search,
  FileText, Image as ImageIcon, Video, Music, MoreVertical, Download, X,
  LayoutGrid, List as ListIcon, Clock, HardDrive, ArrowLeft, Upload, Filter
} from 'lucide-react';
import { brandColors } from '@/theme/brand';
import { resourcesApi } from '@/services/api/resources';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { Resource } from '@/types/resources';
import { useQuery } from '@tanstack/react-query';
import UploadResource from './UploadResource';

const TeacherResourcePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize active view from URL or localStorage
  const [activeView, setActiveView] = useState<'browse' | 'upload'>(
    () => {
      const viewParam = searchParams.get('view');
      if (viewParam === 'upload' || viewParam === 'browse') return viewParam;
      
      // Check pathname for direct links
      if (location.pathname.includes('/upload')) return 'upload';

      return (localStorage.getItem('teacher_resource_active_view') as any) || 'browse';
    }
  );

  // Sync URL and localStorage with active view
  useEffect(() => {
    setSearchParams({ view: activeView });
    localStorage.setItem('teacher_resource_active_view', activeView);
  }, [activeView, setSearchParams]);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'platform_wide' | 'chapter_wide' | 'course_specific' | 'mine'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<{ categories: string[]; languages: string[]; fileTypes: string[] }>({
    categories: [],
    languages: [],
    fileTypes: []
  });
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<Resource | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset pagination when filters change (except page)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, scopeFilter, categoryFilter, languageFilter, typeFilter]);

  // Persist filters locally
  useEffect(() => {
    const stored = localStorage.getItem('teacherResourceFilters');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.scopeFilter) setScopeFilter(parsed.scopeFilter);
        if (parsed.categoryFilter) setCategoryFilter(parsed.categoryFilter);
        if (parsed.languageFilter) setLanguageFilter(parsed.languageFilter);
        if (parsed.typeFilter) setTypeFilter(parsed.typeFilter);
        if (parsed.viewMode) setViewMode(parsed.viewMode);
      } catch (err) {
        console.warn('Failed to parse cached filters', err);
      }
    }
  }, []);

  useEffect(() => {
    const payload = {
      scopeFilter,
      categoryFilter,
      languageFilter,
      typeFilter,
      viewMode
    };
    localStorage.setItem('teacherResourceFilters', JSON.stringify(payload));
  }, [scopeFilter, categoryFilter, languageFilter, typeFilter, viewMode]);

  // Load filter options once
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await resourcesApi.getFilters();
        if (response.success) {
          setFilterOptions({
            categories: response.data.categories || [],
            languages: response.data.languages || [],
            fileTypes: response.data.fileTypes || response.data.types || []
          });
        }
      } catch (err) {
        console.error('Failed to load filter options', err);
      }
    };
    loadFilters();
  }, []);

  const {
    data,
    isLoading,
    isError,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['teacher-resources', debouncedSearch, scopeFilter, categoryFilter, languageFilter, typeFilter],
    queryFn: async () => {
      setError(null);
      const response = await resourcesApi.searchResources({
        search: debouncedSearch || undefined,
        resource_scope: scopeFilter !== 'all' && scopeFilter !== 'mine' ? scopeFilter : undefined,
        category: categoryFilter || undefined,
        language: languageFilter || undefined,
        type: typeFilter || undefined
      } as any);
      if (!response.success) throw new Error(response.message || 'Failed to load resources');
      return response.data.resources || [];
    },
    enabled: activeView === 'browse',
    staleTime: 60_000,
    retry: 1
  });

  useEffect(() => {
    if (isError && queryError) {
      setError((queryError as Error).message || 'Failed to load resources');
    }
  }, [isError, queryError]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const resources: Resource[] = data || [];

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (scopeFilter === 'all') return true;
      if (scopeFilter === 'mine') return r.author === user?.id;
      return r.resource_scope === scopeFilter;
    });
  }, [resources, scopeFilter, user?.id]);

  const sortedResources = useMemo(() => {
    const arr = [...filteredResources];
    switch (sortBy) {
      case 'oldest':
        return arr.sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
      case 'title':
        return arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'newest':
      default:
        return arr.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }
  }, [filteredResources, sortBy]);

  const pagedResources = useMemo(() => {
    const end = page * pageSize;
    return sortedResources.slice(0, end);
  }, [sortedResources, page, pageSize]);

  const openPreview = async (id: number) => {
    setPreviewId(id);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await resourcesApi.getResource(id);
      if (res.success) {
        setPreviewData(res.data.resource);
      } else {
        setError(res.message || 'Failed to load resource');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load resource');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewId(null);
    setPreviewData(null);
    setPreviewLoading(false);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-6 w-6" style={{ color: brandColors.primaryHex }} />;
    if (type.includes('image')) return <ImageIcon className="h-6 w-6" style={{ color: brandColors.accentHex }} />;
    if (type.includes('video')) return <Video className="h-6 w-6" style={{ color: brandColors.primaryHoverHex }} />;
    if (type.includes('audio')) return <Music className="h-6 w-6" style={{ color: brandColors.primaryText }} />;
    return <FileText className="h-6 w-6" style={{ color: brandColors.primaryText + '99' }} />;
  };

  const tabs = [
    { id: 'browse', label: t('teacher_resources.tabs.browse', 'Browse Resources'), icon: FolderOpen },
    { id: 'upload', label: t('teacher_resources.tabs.upload', 'Upload Resource'), icon: Upload },
  ];

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-6 p-6 lg:p-8">
        {/* Compact Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-stone-800 mb-2 flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-[color:#1e1b4b]" />
            {t('teacher_resources.title', 'Teacher Resources')}
          </h1>
          <p className="text-base text-stone-600">{t('teacher_resources.subtitle', 'Manage and share your educational materials')}</p>
        </div>

        {/* Compact Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <nav className="flex border-b border-stone-200 flex-shrink-0">
            {tabs.map((tab) => {
              const isActive = activeView === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all border-b-2 text-sm ${
                    isActive
                      ? 'border-[color:#1e1b4b] text-[color:#1e1b4b] bg-[color:rgba(30,27,75,0.08)]'
                      : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>

          {/* Tab Content */}
          <div className="bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex-1 overflow-y-auto p-6">
            {activeView === 'browse' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* Unified Toolbar */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative flex-1 w-full md:max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t('teacher_resources.browse.search_placeholder', 'Search resources...')}
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[color:#1e1b4b] focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
                      {['all', 'mine'].map((key) => (
                        <button
                          key={key}
                          onClick={() => setScopeFilter(key as any)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all whitespace-nowrap ${
                            scopeFilter === key
                              ? 'bg-[color:rgba(30,27,75,0.08)] border-[color:#1e1b4b] text-[color:#1e1b4b]'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {key === 'all' ? t('teacher_resources.filters.all', 'All Resources') : t('teacher_resources.filters.mine', 'My Uploads')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Filter className="h-4 w-4 text-slate-400" />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[color:#1e1b4b] outline-none hover:bg-white transition-colors"
                      >
                        <option value="">{t('teacher_resources.filters.category', 'Category')}</option>
                        {filterOptions.categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[color:#1e1b4b] outline-none hover:bg-white transition-colors"
                      >
                        <option value="newest">{t('teacher_resources.filters.sort_newest', 'Newest')}</option>
                        <option value="oldest">{t('teacher_resources.filters.sort_oldest', 'Oldest')}</option>
                        <option value="title">{t('teacher_resources.filters.sort_title', 'Title')}</option>
                      </select>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(parseInt(e.target.value, 10));
                          setPage(1);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[color:#1e1b4b] outline-none hover:bg-white transition-colors"
                      >
                        {[12, 24, 48].map((s) => (
                          <option key={s} value={s}>{t('teacher_resources.filters.page_size', { count: s, defaultValue: `${s} per page` })}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      {(categoryFilter || languageFilter || typeFilter || scopeFilter !== 'all' || searchTerm) && (
                        <button
                          onClick={() => {
                            setCategoryFilter('');
                            setLanguageFilter('');
                            setTypeFilter('');
                            setScopeFilter('all');
                            setSearchTerm('');
                            setSortBy('newest');
                            setPage(1);
                          }}
                          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {t('teacher_resources.filters.reset', 'Reset')}
                        </button>
                      )}
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          <ListIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Grid/List */}
                {isLoading ? (
                  <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`group bg-white border border-slate-200 rounded-xl animate-pulse ${
                          viewMode === 'list' ? 'flex items-center p-5 gap-5' : 'p-5 flex flex-col'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="p-3 bg-slate-100 rounded-lg w-12 h-12" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-100 rounded w-32" />
                            <div className="h-3 bg-slate-100 rounded w-48" />
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="h-3 bg-slate-100 rounded w-24" />
                          <div className="h-3 bg-slate-100 rounded w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isError ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{t('teacher_resources.browse.empty.title', 'No resources found')}</h3>
                    <p className="text-slate-500 mt-1 mb-6">{error || t('teacher_resources.browse.empty.subtitle', 'Try adjusting your filters or upload a new resource.')}</p>
                    <button
                      onClick={() => refetch()}
                      className="px-4 py-2 bg-[color:#1e1b4b] text-white rounded-lg hover:bg-[color:#1e1b4b]/90 transition-all text-sm font-medium"
                    >
                      {t('teacher_resources.actions.retry', 'Retry')}
                    </button>
                  </div>
                ) : filteredResources.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{t('teacher_resources.browse.empty.title', 'No resources found')}</h3>
                    <p className="text-slate-500 mt-1 mb-6">{t('teacher_resources.browse.empty.subtitle', 'Get started by uploading your first resource.')}</p>
                    <button
                      onClick={() => setActiveView('upload')}
                      className="px-4 py-2 bg-[color:#1e1b4b] text-white rounded-lg hover:bg-[color:#1e1b4b]/90 transition-all text-sm font-medium"
                    >
                      {t('teacher_resources.browse.empty.btn', 'Upload Resource')}
                    </button>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
                    {pagedResources.map((resource) => (
                      <div
                        key={resource.id}
                        className={`group bg-white border border-slate-200 rounded-xl hover:border-[color:#1e1b4b]/30 hover:shadow-md transition-all cursor-pointer ${
                          viewMode === 'list' ? 'flex items-center p-5 gap-5' : 'p-5 flex flex-col'
                        }`}
                        onClick={() => openPreview(resource.id)}
                      >
                        <div className={`flex items-start justify-between ${viewMode === 'list' ? 'order-2 flex-1' : 'mb-4'}`}>
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-slate-50 rounded-lg group-hover:bg-[color:rgba(30,27,75,0.05)] transition-colors">
                              {getFileIcon(resource.file_type || '')}
                            </div>
                            {viewMode === 'list' && (
                              <div>
                                <h3 className="font-semibold text-slate-900 text-base">{resource.title}</h3>
                                <p className="text-sm text-slate-500">{resource.category || t('teacher_resources.browse.uncategorized', 'Uncategorized')}</p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
                                  {resource.resource_scope && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium border border-violet-100">
                                      {resource.resource_scope.replace('_', ' ')}
                                    </span>
                                  )}
                                  {!resource.is_public && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-100">
                                      Private
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100">
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </div>

                        {viewMode === 'grid' && (
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 line-clamp-1 mb-1.5 text-base" title={resource.title}>{resource.title}</h3>
                            <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">
                              {resource.description || t('teacher_resources.browse.no_description', 'No description provided.')}
                            </p>
                            <div className="flex items-center gap-2 mb-5 flex-wrap text-xs">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md font-medium border border-slate-200">
                                {resource.category || t('teacher_resources.browse.general', 'General')}
                              </span>
                              {resource.resource_scope && (
                                <span className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-medium border border-violet-100">
                                  {resource.resource_scope.replace('_', ' ')}
                                </span>
                              )}
                              {!resource.is_public && (
                                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-100">
                                  Private
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className={`flex items-center gap-3 ${viewMode === 'list' ? 'order-3' : 'mt-auto pt-4 border-t border-slate-100'}`}>
                          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : '—'}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Download className="h-3.5 w-3.5" />
                              {resource.file_size ? `${Math.round(parseInt(resource.file_size) / 1024)} KB` : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <button 
                              className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                              title={t('teacher_resources.browse.download', 'Download')}
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(resource.file_url || resource.url, '_blank');
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button 
                              className="px-3 py-2 text-xs font-medium text-[color:#1e1b4b] bg-[color:rgba(30,27,75,0.08)] hover:bg-[color:rgba(30,27,75,0.15)] rounded-lg transition-colors whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/resources/${resource.id}`);
                              }}
                            >
                              {t('teacher_resources.actions.manage', 'Manage')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredResources.length > pagedResources.length && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                      {t('teacher_resources.actions.load_more') || 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {activeView === 'upload' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-in fade-in duration-300">
                 <UploadResource 
                   variant="embedded" 
                   onUploadComplete={() => setActiveView('browse')}
                 />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Drawer / Modal */}
      {previewId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Quick Preview</p>
                <h3 className="text-lg font-semibold text-slate-900">
                  {previewData?.title || 'Loading...'}
                </h3>
              </div>
              <button
                onClick={closePreview}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2 p-6 space-y-4">
                {previewLoading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-32 bg-slate-100 rounded" />
                  </div>
                ) : previewData ? (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden min-h-[240px] flex items-center justify-center">
                      {(() => {
                        if (!previewData.file_url) {
                          return <p className="text-sm text-slate-500 px-4 py-6">File not available.</p>;
                        }
                        const ft = (previewData.file_type || '').toLowerCase();
                        if (ft.includes('pdf')) {
                          return (
                            <iframe
                              title="Resource preview"
                              src={previewData.file_url}
                              className="w-full h-[360px] bg-white"
                            />
                          );
                        }
                        if (ft.startsWith('image')) {
                          return (
                            <img
                              src={previewData.file_url}
                              alt={previewData.title || 'Resource'}
                              className="max-h-[360px] w-full object-contain bg-white"
                            />
                          );
                        }
                        if (ft.includes('video')) {
                          return (
                            <video
                              className="w-full max-h-[360px] bg-black rounded"
                              src={previewData.file_url}
                              controls
                              preload="metadata"
                            >
                              Your browser does not support the video tag.
                            </video>
                          );
                        }
                        if (ft.includes('audio')) {
                          return (
                            <div className="w-full p-4 bg-white">
                              <audio controls className="w-full" src={previewData.file_url}>
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          );
                        }
                        return (
                          <p className="text-sm text-slate-500 px-4 py-6 text-center">
                            Preview not available for this file type. Download or manage to view.
                          </p>
                        );
                      })()}
                    </div>
                    <p className="text-slate-600 text-sm">{previewData.description || 'No description provided.'}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {previewData.category && (
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {previewData.category}
                        </span>
                      )}
                      {previewData.resource_scope && (
                        <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 font-medium">
                          {previewData.resource_scope.replace('_', ' ')}
                        </span>
                      )}
                      {!previewData.is_public && (
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
                          Private
                        </span>
                      )}
                      {previewData.language && (
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                          {previewData.language.toUpperCase()}
                        </span>
                      )}
                      {previewData.file_type && (
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                          {previewData.file_type}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Failed to load resource.</p>
                )}
              </div>

              <div className="p-6 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase">Actions</p>
                <div className="flex flex-col gap-2">
                  <button
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[color:#1e1b4b] text-white text-sm font-medium hover:bg-[color:#1e1b4b]/90"
                    onClick={() => {
                      if (previewData?.file_url) window.open(previewData.file_url, '_blank');
                    }}
                    disabled={!previewData?.file_url}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    onClick={() => navigate(`/resources/${previewId}`)}
                  >
                    {t('teacher_resources.actions.manage')}
                  </button>
                </div>
                {previewData?.created_at && (
                  <div className="text-xs text-slate-500 mt-2">
                    Added {new Date(previewData.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherResourcePage;
