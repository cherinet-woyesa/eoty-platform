import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Users, Globe, Plus, FolderOpen, Search,
  FileText, Image as ImageIcon, Video, Music, MoreVertical, Download, X,
  LayoutGrid, List as ListIcon, Clock, HardDrive
} from 'lucide-react';
import { resourcesApi } from '@/services/api/resources';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { Resource } from '@/types/resources';
import { useQuery } from '@tanstack/react-query';
import { Filter } from 'lucide-react';

const TeacherResourcePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'platform_wide' | 'chapter_wide' | 'course_specific' | 'mine'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

  // Persist filters locally for convenience
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
    refetch
  } = useQuery(
    ['teacher-resources', debouncedSearch, scopeFilter, categoryFilter, languageFilter, typeFilter],
    async () => {
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
    {
      enabled: activeTab === 'manage',
      keepPreviousData: true,
      staleTime: 60_000,
      retry: 1,
      onError: (err: any) => setError(err?.message || 'Failed to load resources')
    }
  );

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

  // Mock stats
  const stats = [
    { label: t('teacher_resources.stats.total'), value: filteredResources.length, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: t('teacher_resources.stats.storage'), value: '2.4 GB', icon: HardDrive, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: t('teacher_resources.stats.this_month'), value: '+12', icon: Clock, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (type.includes('image')) return <ImageIcon className="h-6 w-6 text-blue-500" />;
    if (type.includes('video')) return <Video className="h-6 w-6 text-purple-500" />;
    if (type.includes('audio')) return <Music className="h-6 w-6 text-amber-500" />;
    return <FileText className="h-6 w-6 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('teacher_resources.title')}</h1>
            <p className="text-slate-500 mt-1">{t('teacher_resources.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/teacher/dashboard"
              className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all text-sm font-medium shadow-sm"
            >
              {t('teacher_resources.back_dashboard')}
            </Link>
            <button 
              onClick={() => setActiveTab('upload')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('teacher_resources.new_resource')}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
          {/* Tabs Navigation */}
          <div className="border-b border-slate-200 px-6 pt-6">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('upload')}
                className={`pb-4 text-sm font-medium transition-all relative ${
                  activeTab === 'upload' 
                    ? 'text-blue-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('teacher_resources.tabs.upload')}
                {activeTab === 'upload' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`pb-4 text-sm font-medium transition-all relative ${
                  activeTab === 'manage' 
                    ? 'text-blue-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('teacher_resources.tabs.browse')}
                {activeTab === 'manage' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </button>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            {activeTab === 'upload' ? (
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-bold text-slate-900">{t('teacher_resources.upload_center.title')}</h2>
                  <p className="text-slate-500 mt-2">{t('teacher_resources.upload_center.subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Platform Card */}
                  <div 
                    onClick={() => navigate('/teacher/resources/upload?scope=platform')}
                    className="group relative bg-gradient-to-b from-blue-50 to-white p-6 rounded-2xl border border-blue-100 hover:border-blue-300 hover:shadow-xl transition-all cursor-pointer text-center"
                  >
                    <div className="w-16 h-16 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Globe className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{t('teacher_resources.upload_center.platform.title')}</h3>
                    <p className="text-sm text-slate-500 mb-6">
                      {t('teacher_resources.upload_center.platform.description')}
                    </p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {t('teacher_resources.upload_center.platform.badge')}
                    </span>
                  </div>

                  {/* Chapter Card */}
                  <div 
                    onClick={() => navigate('/teacher/resources/upload?scope=chapter')}
                    className="group relative bg-gradient-to-b from-emerald-50 to-white p-6 rounded-2xl border border-emerald-100 hover:border-emerald-300 hover:shadow-xl transition-all cursor-pointer text-center"
                  >
                    <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{t('teacher_resources.upload_center.chapter.title')}</h3>
                    <p className="text-sm text-slate-500 mb-6">
                      {t('teacher_resources.upload_center.chapter.description')}
                    </p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      {t('teacher_resources.upload_center.chapter.badge')}
                    </span>
                  </div>

                  {/* Course Card */}
                  <div 
                    onClick={() => navigate('/teacher/resources/upload?scope=course')}
                    className="group relative bg-gradient-to-b from-purple-50 to-white p-6 rounded-2xl border border-purple-100 hover:border-purple-300 hover:shadow-xl transition-all cursor-pointer text-center"
                  >
                    <div className="w-16 h-16 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="h-8 w-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{t('teacher_resources.upload_center.course.title')}</h3>
                    <p className="text-sm text-slate-500 mb-6">
                      {t('teacher_resources.upload_center.course.description')}
                    </p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {t('teacher_resources.upload_center.course.badge')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t('teacher_resources.browse.search_placeholder')}
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div className="h-8 w-px bg-slate-300 hidden md:block" />
                    <div className="flex items-center gap-2 flex-wrap">
                      {['all','platform_wide','chapter_wide','course_specific','mine'].map((key) => (
                        <button
                          key={key}
                          onClick={() => setScopeFilter(key as any)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                            scopeFilter === key
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {key === 'all' ? t('teacher_resources.filters.all') : key.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <ListIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Secondary filters */}
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">{t('teacher_resources.filters.category') || 'Category'}</option>
                      {filterOptions.categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      value={languageFilter}
                      onChange={(e) => setLanguageFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">{t('teacher_resources.filters.language') || 'Language'}</option>
                      {filterOptions.languages.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">{t('teacher_resources.filters.type') || 'Type'}</option>
                      {filterOptions.fileTypes.map((ft) => (
                        <option key={ft} value={ft}>{ft}</option>
                      ))}
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="newest">{t('teacher_resources.filters.sort_newest') || 'Newest'}</option>
                      <option value="oldest">{t('teacher_resources.filters.sort_oldest') || 'Oldest'}</option>
                      <option value="title">{t('teacher_resources.filters.sort_title') || 'Title'}</option>
                    </select>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(parseInt(e.target.value, 10));
                        setPage(1);
                      }}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {[12, 24, 48].map((s) => (
                        <option key={s} value={s}>{t('teacher_resources.filters.page_size', { count: s }) || `${s} / page`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Active filter chips */}
                    {[categoryFilter && { label: categoryFilter, onClear: () => setCategoryFilter('') },
                      languageFilter && { label: languageFilter, onClear: () => setLanguageFilter('') },
                      typeFilter && { label: typeFilter, onClear: () => setTypeFilter('') },
                      scopeFilter !== 'all' && { label: scopeFilter.replace('_', ' '), onClear: () => setScopeFilter('all') }
                    ].filter(Boolean).map((chip: any, idx: number) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">
                        {chip.label}
                        <button onClick={chip.onClear} className="text-slate-400 hover:text-slate-600">✕</button>
                      </span>
                    ))}
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
                      className="px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {t('teacher_resources.filters.reset') || 'Reset filters'}
                    </button>
                  </div>
                </div>

                {/* Content Grid/List */}
                {isLoading ? (
                  <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`group bg-white border border-slate-200 rounded-xl animate-pulse ${
                          viewMode === 'list' ? 'flex items-center p-4 gap-4' : 'p-4 flex flex-col'
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
                  <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{t('teacher_resources.browse.empty.title')}</h3>
                    <p className="text-slate-500 mt-1 mb-6">{error || t('teacher_resources.browse.empty.subtitle')}</p>
                    <button
                      onClick={() => refetch()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
                    >
                      {t('teacher_resources.actions.manage')}
                    </button>
                  </div>
                ) : filteredResources.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{t('teacher_resources.browse.empty.title')}</h3>
                    <p className="text-slate-500 mt-1 mb-6">{t('teacher_resources.browse.empty.subtitle')}</p>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
                    >
                      {t('teacher_resources.browse.empty.btn')}
                    </button>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
                    {pagedResources.map((resource) => (
                      <div
                        key={resource.id}
                        className={`group bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer ${
                          viewMode === 'list' ? 'flex items-center p-4 gap-4' : 'p-4 flex flex-col'
                        }`}
                        onClick={() => openPreview(resource.id)}
                      >
                        <div className={`flex items-start justify-between ${viewMode === 'list' ? 'order-2 flex-1' : 'mb-3'}`}>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                              {getFileIcon(resource.file_type || '')}
                            </div>
                            {viewMode === 'list' && (
                              <div>
                                <h3 className="font-semibold text-slate-900">{resource.title}</h3>
                                <p className="text-sm text-slate-500">{resource.category || t('teacher_resources.browse.uncategorized')}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                                  {resource.resource_scope && (
                                    <span className="px-2 py-1 rounded-full bg-violet-50 text-violet-700 font-medium">
                                      {resource.resource_scope.replace('_', ' ')}
                                    </span>
                                  )}
                                  {!resource.is_public && (
                                    <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
                                      Private
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <button className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>

                        {viewMode === 'grid' && (
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 line-clamp-1 mb-1">{resource.title}</h3>
                            <p className="text-sm text-slate-500 line-clamp-2 mb-3 h-10">
                              {resource.description || t('teacher_resources.browse.no_description')}
                            </p>
                            <div className="flex items-center gap-2 mb-4 flex-wrap text-[11px]">
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                                {resource.category || t('teacher_resources.browse.general')}
                              </span>
                              {resource.resource_scope && (
                                <span className="px-2 py-1 rounded-full bg-violet-50 text-violet-700 font-medium">
                                  {resource.resource_scope.replace('_', ' ')}
                                </span>
                              )}
                              {!resource.is_public && (
                                <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
                                  Private
                                </span>
                              )}
                              {resource.language && (
                                <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                                  {resource.language.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className={`flex items-center gap-2 ${viewMode === 'list' ? 'order-3' : 'mt-auto pt-3 border-t border-slate-100'}`}>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : '—'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Download className="h-3.5 w-3.5" />
                              {resource.file_size ? `${Math.round(parseInt(resource.file_size) / 1024)} KB` : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <button 
                              className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(resource.file_url || resource.url, '_blank');
                              }}
                            >
                              <Download className="h-3 w-3" />
                              {t('teacher_resources.browse.download')}
                            </button>
                            <button 
                              className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/resources/${resource.id}`);
                              }}
                            >
                              {t('teacher_resources.actions.manage')}
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
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
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
