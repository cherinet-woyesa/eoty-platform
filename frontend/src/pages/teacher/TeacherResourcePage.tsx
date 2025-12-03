import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Upload, BookOpen, Users, Globe, ArrowLeft, Plus, FolderOpen, Search, Filter,
  FileText, Image as ImageIcon, Video, Music, MoreVertical, Download, Trash2, Edit,
  LayoutGrid, List as ListIcon, Clock, HardDrive
} from 'lucide-react';
import { resourcesApi } from '@/services/api/resources';
import { coursesApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { Resource } from '@/types/resources';

const TeacherResourcePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScope, setSelectedScope] = useState<'chapter_wide' | 'platform_wide'>('chapter_wide');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (activeTab === 'manage') {
      loadResources();
    }
  }, [activeTab, selectedScope]);

  const loadResources = async () => {
    try {
      setLoading(true);
      let response;

      if (selectedScope === 'platform_wide' || !user?.chapter_id) {
        // Fallback to platform-wide if chapter is not set
        response = await resourcesApi.getPlatformResources({ search: searchTerm });
      } else {
        response = await resourcesApi.getChapterResources(user.chapter_id.toString(), { search: searchTerm });
      }

      if (response.success) {
        setResources(response.data.resources || []);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Debounce search would go here
  };

  // Mock stats
  const stats = [
    { label: t('teacher_resources.stats.total'), value: resources.length, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-100' },
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
                    <select
                      value={selectedScope}
                      onChange={(e) => setSelectedScope(e.target.value as any)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="chapter_wide">{t('teacher_resources.browse.scope.chapter')}</option>
                      {isAdmin && <option value="platform_wide">{t('teacher_resources.browse.scope.platform')}</option>}
                    </select>
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

                {/* Content Grid/List */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <LoadingSpinner size="lg" text={t('teacher_resources.browse.loading')} variant="logo" />
                  </div>
                ) : resources.length === 0 ? (
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
                    {resources.map((resource) => (
                      <div
                        key={resource.id}
                        className={`group bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer ${
                          viewMode === 'list' ? 'flex items-center p-4 gap-4' : 'p-4 flex flex-col'
                        }`}
                      >
                        <div className={`flex items-start justify-between ${viewMode === 'list' ? 'order-2 flex-1' : 'mb-3'}`}>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                              {getFileIcon(resource.file_type)}
                            </div>
                            {viewMode === 'list' && (
                              <div>
                                <h3 className="font-semibold text-slate-900">{resource.title}</h3>
                                <p className="text-sm text-slate-500">{resource.category || t('teacher_resources.browse.uncategorized')}</p>
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
                            <div className="flex items-center gap-2 mb-4">
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                                {resource.category || t('teacher_resources.browse.general')}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(resource.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className={`flex items-center gap-2 ${viewMode === 'list' ? 'order-3' : 'mt-auto pt-3 border-t border-slate-100'}`}>
                          <button 
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(resource.url, '_blank');
                            }}
                          >
                            <Download className="h-3 w-3" />
                            {t('teacher_resources.browse.download')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherResourcePage;
