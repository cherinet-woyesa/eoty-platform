import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Users, Globe, GraduationCap, Search, Filter, AlertCircle, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { resourcesApi } from '@/services/api/resources';
import type { Resource } from '@/types/resources';
import { useAuth } from '@/context/AuthContext';
import { chaptersApi } from '@/services/api/chapters';

interface UnifiedResourceViewProps {
  courseId?: string;
  showCourseResources?: boolean;
  variant?: 'full' | 'embedded';
  activeTab?: 'course' | 'chapter' | 'platform';
  onTabChange?: (tab: 'course' | 'chapter' | 'platform') => void;
  hideTabs?: boolean;
  // When this value changes, the list reloads (e.g., after an upload)
  refreshToken?: number | string;
}

const UnifiedResourceView: React.FC<UnifiedResourceViewProps> = ({
  courseId,
  showCourseResources = false,
  variant = 'full',
  activeTab: controlledTab,
  onTabChange,
  hideTabs = false,
  refreshToken
}) => {
  const { user } = useAuth();
  const [internalTab, setInternalTab] = useState<'course' | 'chapter' | 'platform'>(showCourseResources ? 'course' : 'chapter');
  
  const activeTab = controlledTab || internalTab;
  const setActiveTab = (tab: 'course' | 'chapter' | 'platform') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [userChapterId, setUserChapterId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const tabs = showCourseResources && hideTabs
    ? [{
        id: 'course' as const,
        label: 'Course Resources',
        icon: GraduationCap,
        description: 'Resources specific to this course'
      }]
    : [
        ...(showCourseResources ? [{
          id: 'course' as const,
          label: 'Course Resources',
          icon: GraduationCap,
          description: 'Resources specific to this course'
        }] : []),
        {
          id: 'chapter' as const,
          label: 'Chapter Library',
          icon: Users,
          description: 'Resources shared within our chapter'
        },
        {
          id: 'platform' as const,
          label: 'Platform Library',
          icon: Globe,
          description: 'Resources available to all Orthodox communities'
        }
      ];

  useEffect(() => {
    const loadMembership = async () => {
      try {
        const resp = await chaptersApi.getUserChapters();
        const chapters = resp?.data?.chapters || [];
        const primary = chapters.find((c: any) => c.is_primary && c.status === 'approved');
        const anyChapter = chapters[0];
        const pick = primary || anyChapter;
        setUserChapterId(pick ? String(pick.chapter_id || pick.id) : null);
      } catch {
        setUserChapterId(null);
      }
    };
    loadMembership();
  }, [user?.id]);

  useEffect(() => {
    loadResources();
  }, [page, activeTab, searchTerm, selectedCategory, refreshToken, userChapterId]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm, selectedCategory, refreshToken, userChapterId]);

  const loadResources = async () => {
    try {
      setLoading(true);
      let response;
      setError(null);

      const commonParams = {
        search: searchTerm,
        category: selectedCategory,
        page,
        limit: ITEMS_PER_PAGE
      };

      // When showCourseResources + hideTabs, force course-only scope
      const scope = showCourseResources && hideTabs ? 'course' : activeTab;
      switch (scope) {
        case 'course':
          if (courseId) {
            response = await resourcesApi.getCourseResources(courseId, commonParams);
          }
          break;
        case 'chapter':
          if (!userChapterId) {
            setResources([]);
            setError('Join a chapter to view chapter resources.');
            setLoading(false);
            return;
          }
          response = await resourcesApi.getChapterResources(userChapterId, commonParams);
          break;
        case 'platform':
          response = await resourcesApi.getPlatformResources(commonParams);
          break;
      }

      if (response?.success) {
        setResources(response.data.resources || []);
        if (response.data.pagination) {
          setTotalPages(Math.ceil(response.data.pagination.total / ITEMS_PER_PAGE));
        }
      } else if (response?.message) {
        setError(response.message);
      }
    } catch (err: any) {
      console.error('Failed to load resources:', err);
      const status = err.response?.status;
      if (status === 403 || status === 401) {
        setError('Access denied. Join this chapter or switch to one you are a member of.');
        setResources([]);
      } else {
        setError(err.response?.data?.message || 'Failed to load resources.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getTabIcon = (IconComponent: any) => {
    return <IconComponent className="h-5 w-5" />;
  };

  const getResourceIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎬';
    if (fileType.includes('audio')) return '🎵';
    return '📝';
  };

  return (
    <div className="w-full space-y-6">
      {/* Header - Only show in full variant */}
      {variant === 'full' && (
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-[#27AE60]" />
            <h1 className="text-3xl font-bold text-stone-800">Educational Resources</h1>
          </div>
          <p className="text-stone-600">
            Access faith-based learning materials across different contexts
          </p>
        </div>
      )}

      {/* Search and Filters */}
      <div className={`${
        variant === 'full' 
          ? 'bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-6 shadow-md' 
          : 'bg-gray-50 rounded-lg border border-gray-200 p-4'
      }`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search resources..."
              className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                variant === 'embedded' ? 'bg-white text-sm' : ''
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              variant === 'embedded' ? 'bg-white text-sm' : ''
            }`}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="bible">Bible Study</option>
            <option value="theology">Theology</option>
            <option value="liturgy">Liturgy</option>
            <option value="spiritual">Spiritual Growth</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      {!hideTabs && (
        <div className={`${
          variant === 'full'
            ? 'bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden'
            : 'bg-white rounded-lg border border-gray-200 overflow-hidden'
        }`}>
          <nav className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {getTabIcon(tab.icon)}
                <div className="text-center">
                  <div className={`font-semibold ${variant === 'embedded' ? 'text-xs sm:text-sm' : 'text-sm'}`}>{tab.label}</div>
                  {variant === 'full' && <div className="text-xs opacity-75">{tab.description}</div>}
                </div>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Content Container */}
      <div className={`${
        !hideTabs 
          ? (variant === 'full' ? 'bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-6 mt-6' : 'bg-white rounded-lg border border-gray-200 p-4 mt-4')
          : ''
      }`}>
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27AE60]"></div>
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
            <p className="text-gray-600">
              {activeTab === 'course'
                ? 'No course-specific resources have been shared yet.'
                : activeTab === 'chapter'
                ? (userChapterId ? 'No chapter resources are available at the moment.' : 'Join a chapter to view chapter resources.')
                : 'No platform resources are currently available.'}
            </p>
          </div>
        ) : (
          <>
            <div className={`grid gap-4 ${
              variant === 'full' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1 sm:grid-cols-2'
            }`}>
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer group relative"
                  onClick={() => window.open(`/resources/${resource.id}`, '_blank')}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {getResourceIcon(resource.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate mb-1 pr-8">
                        {resource.title}
                      </h3>
                      {resource.category && (
                        <span className="inline-block px-2 py-1 text-xs bg-[#27AE60]/10 text-[#27AE60] rounded-full mb-2">
                          {resource.category}
                        </span>
                      )}
                      {resource.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {resource.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{resource.author}</span>
                        <span>{new Date(resource.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* Direct Download/View Button */}
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          const url = resource.file_url || resource.file_path;
                          if (url) window.open(url, '_blank');
                      }}
                      className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-[#27AE60] hover:bg-[#27AE60]/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      title="Download / View Direct"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UnifiedResourceView;
