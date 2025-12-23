import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, Plus, Search, Video, Users,
  Sparkles,
  AlertCircle, RefreshCw, Grid, List,
  SortAsc, SortDesc, Edit, Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { coursesApi } from '@/services/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { BulkActions } from '@/components/shared/courses/BulkActions';
import type { Course } from '@/types/courses';
import { brandColors } from '@/theme/brand';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

interface CourseStats {
  totalCourses: number;
  activeStudents: number;
  recordedVideos: number;
  hoursTaught: number;
  publishedCourses: number;
  averageRating: number;
  completionRate: number;
  draftCourses: number;
  archivedCourses: number;
}

interface MyCoursesProps {
  hideHeader?: boolean;
  onCreateClick?: () => void;
}

interface TeacherCoursesResponse {
  courses: Course[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  counts?: {
    total?: number;
    published?: number;
    draft?: number;
    archived?: number;
  };
}

const MyCourses: React.FC<MyCoursesProps> = ({ hideHeader = false, onCreateClick }) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() => searchParams.get('q') || '');
  const [filterCategory, setFilterCategory] = useState(() => searchParams.get('cat') || 'all');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => (searchParams.get('order') as 'asc' | 'desc') || 'desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (searchParams.get('view') as 'grid' | 'list') || 'grid');
  const [activeTab, setActiveTab] = useState(() => {
    const status = searchParams.get('status');
    return status === 'drafts' ? 'draft' : (status || 'all');
  });
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get('page')) || 1);
  const itemsPerPage = 12;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, activeTab, sortBy, sortOrder]);

  // Persist filters/sort/view/page to URL for deep links
  useEffect(() => {
    const next = new URLSearchParams();
    if (searchTerm) next.set('q', searchTerm);
    if (filterCategory && filterCategory !== 'all') next.set('cat', filterCategory);
    if (sortBy && sortBy !== 'created_at') next.set('sort', sortBy);
    if (sortOrder !== 'desc') next.set('order', sortOrder);
    if (viewMode !== 'grid') next.set('view', viewMode);
    if (activeTab && activeTab !== 'all') next.set('status', activeTab);
    if (currentPage > 1) next.set('page', String(currentPage));
    setSearchParams(next, { replace: true });
  }, [searchTerm, filterCategory, sortBy, sortOrder, viewMode, activeTab, currentPage, setSearchParams]);

  // Memoize categories and sort options to prevent re-creation on each render
  const categories = useMemo(() => [
    { value: 'all', label: t('teacher_courses.all_categories_filter') },
    { value: 'faith', label: t('teacher_courses.faith_doctrine_filter') },
    { value: 'history', label: t('teacher_courses.church_history_filter') },
    { value: 'spiritual', label: t('teacher_courses.spiritual_development_filter') },
    { value: 'bible', label: t('teacher_courses.bible_study_filter') },
    { value: 'liturgical', label: t('teacher_courses.liturgical_studies_filter') },
    { value: 'youth', label: t('teacher_courses.youth_ministry_filter') }
  ], [t]);

  const sortOptions = useMemo(() => [
    { value: 'created_at', label: t('teacher_courses.sort_by_date_created') },
    { value: 'updated_at', label: t('teacher_courses.sort_by_last_updated') },
    { value: 'title', label: t('teacher_courses.sort_by_title') },
    { value: 'lesson_count', label: t('teacher_courses.sort_by_lesson_count') },
    { value: 'student_count', label: t('teacher_courses.sort_by_student_count') },
    { value: 'total_duration', label: t('teacher_courses.sort_by_duration') }
  ], [t]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const {
    data: coursesPayload,
    isLoading,
    isFetching,
    isError,
    error: queryError,
    refetch
  } = useQuery<TeacherCoursesResponse>({
    queryKey: ['teacher-courses', debouncedSearchTerm, filterCategory, activeTab, sortBy, sortOrder, currentPage],
    queryFn: async () => {
      const response = await coursesApi.getCourses({
        q: debouncedSearchTerm || undefined,
        category: filterCategory !== 'all' ? filterCategory : undefined,
        status: activeTab !== 'all' ? activeTab : undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        perPage: itemsPerPage
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to load courses');
      }

      return response.data || response;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000
  });

  const courses: Course[] = coursesPayload?.courses ?? [];
  const paginationMeta = coursesPayload?.pagination ?? {
    page: currentPage,
    perPage: itemsPerPage,
    total: courses.length,
    totalPages: Math.max(1, Math.ceil(Math.max(courses.length, 1) / itemsPerPage))
  };
  const counts = coursesPayload?.counts;
  const totalAvailable = paginationMeta.total ?? courses.length;

  const stats = useMemo<CourseStats | null>(() => {
    if (!courses.length && !counts) {
      return null;
    }

    const totalCourses = counts?.total ?? courses.length;
    const activeStudents = courses.reduce((sum, course) => sum + (course.student_count || 0), 0);
    const recordedVideos = courses.reduce((sum, course) => sum + (course.lesson_count || 0), 0);
    const hoursTaught = Math.round(courses.reduce((sum, course) => sum + (course.total_duration || 0), 0) / 60);
    const publishedCourses = counts?.published ?? courses.filter(course => course.is_published || course.status === 'published').length;
    const averageRating = courses.length ? Math.round((courses.reduce((sum, course) => sum + (course.average_rating || 4.8), 0) / courses.length) * 10) / 10 : 0;
    const completionRate = courses.length ? Math.round(courses.reduce((sum, course) => sum + (course.completion_rate || 0), 0) / courses.length) : 0;
    const draftCourses = counts?.draft ?? courses.filter(course => (!course.is_published && course.status !== 'archived') || course.status === 'draft').length;
    const archivedCourses = counts?.archived ?? courses.filter(course => course.status === 'archived').length;

    return {
      totalCourses,
      activeStudents,
      recordedVideos,
      hoursTaught,
      publishedCourses,
      averageRating,
      completionRate,
      draftCourses,
      archivedCourses
    };
  }, [courses, counts]);

  // Use backend-filtered/paginated courses directly
  const filteredAndSortedCourses = useMemo(() => courses, [courses]);

  const getCategoryColor = useCallback((category: string) => {
    const colors: { [key: string]: string } = {
      faith: 'from-blue-500 to-blue-700',
      history: 'from-emerald-500 to-emerald-700',
      spiritual: 'from-purple-500 to-purple-700',
      bible: 'from-amber-500 to-amber-700',
      liturgical: 'from-rose-500 to-rose-700',
      youth: 'from-cyan-500 to-cyan-700'
    };
    return colors[category] || 'from-gray-500 to-gray-700';
  }, []);

  const paginatedCourses = useMemo(() => filteredAndSortedCourses, [filteredAndSortedCourses]);

  const totalPages = paginationMeta.totalPages ?? Math.max(1, Math.ceil((totalAvailable || courses.length) / itemsPerPage));

  useEffect(() => {
    setSelectedCourses([]);
  }, [debouncedSearchTerm, filterCategory, activeTab, sortBy, sortOrder, currentPage, paginationMeta.total]);

  const getStatus = useCallback((course: Course) => {
    const now = new Date();
    if (course.status === 'archived') return 'archived';
    if (course.scheduled_publish_at && new Date(course.scheduled_publish_at) > now) return 'scheduled';
    if (course.is_published || course.status === 'published') return 'published';
    return 'draft';
  }, []);

  const formatDuration = useCallback((minutes: number) => {
    if (!minutes) return t('teacher_courses.duration_minutes', { minutes: 0 });
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? t('teacher_courses.duration_hours_minutes', { hours, minutes: mins }) : t('teacher_courses.duration_minutes', { minutes: mins });
  }, [t]);

  const getTimeAgo = useCallback((date: string | Date) => {
    const now = new Date();
    const courseDate = typeof date === 'string' ? new Date(date) : date;
    const diffInHours = Math.floor((now.getTime() - courseDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('teacher_courses.just_now');
    if (diffInHours < 24) return t('teacher_courses.hours_ago', { count: diffInHours });
    if (diffInHours < 168) return t('teacher_courses.days_ago', { count: Math.floor(diffInHours / 24) });
    return courseDate.toLocaleDateString();
  }, [t]);

  // Memoize compact course rendering to prevent unnecessary re-renders
  const renderCourseCard = useCallback((course: Course) => (
    <div key={course.id} className={`relative group ${viewMode === 'grid'
      ? "bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200"
      : "bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-200"
    }`} style={selectedCourses.includes(course.id) ? { borderColor: brandColors.primaryHex, backgroundColor: brandColors.primaryHex + '05' } : {}}>
      
      {/* Selection Checkbox - Improved visibility */}
      <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selectedCourses.includes(course.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedCourses([...selectedCourses, course.id]);
            } else {
              setSelectedCourses(selectedCourses.filter(id => id !== course.id));
            }
          }}
          className="rounded border-gray-300 w-4 h-4 cursor-pointer shadow-sm focus:ring-offset-0"
          style={{ color: brandColors.primaryHex, '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
        />
      </div>

      {/* Quick Actions Overlay - Visible on Hover */}
      <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Link 
          to={`/teacher/courses/${course.id}/edit`}
          className="p-1.5 bg-white text-gray-600 rounded-full shadow-md hover:bg-gray-50 transition-colors"
          style={{ ':hover': { color: brandColors.primaryHex } } as React.CSSProperties}
          title={t('common.edit')}
          onClick={(e) => e.stopPropagation()}
        >
          <Edit className="h-4 w-4" />
        </Link>
      </div>

      {viewMode === 'grid' ? (
        // Compact Grid View
        <Link to={`/teacher/courses/${course.id}`} className="block h-full">
          <div className="relative overflow-hidden bg-gray-900 rounded-t-xl aspect-[5/3]">
            {course.cover_image ? (
              <>
                <img
                  src={course.cover_image}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 opacity-60"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={course.cover_image}
                    alt={course.title}
                    className="max-w-full max-h-full object-contain drop-shadow"
                    loading="lazy"
                  />
                </div>
              </>
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryColor(course.category)} flex items-center justify-center`}>
                <BookOpen className="h-10 w-10 text-white/60" />
              </div>
            )}
            <div className="absolute bottom-3 right-3">
              <span className={`px-2 py-1 text-xs font-bold rounded-full shadow-sm ${
                getStatus(course) === 'published'
                  ? 'bg-green-100 text-green-800'
                  : getStatus(course) === 'scheduled'
                  ? 'bg-amber-100 text-amber-800'
                  : getStatus(course) === 'archived'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {getStatus(course) === 'published' && t('common.published')}
                {getStatus(course) === 'scheduled' && t('teacher_courses.status_scheduled')}
                {getStatus(course) === 'archived' && t('teacher_courses.status_archived')}
                {getStatus(course) === 'draft' && t('common.draft')}
              </span>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-gray-900 truncate mb-2 text-base group-hover:text-blue-900 transition-colors">{course.title}</h3>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center bg-gray-50 px-2 py-1 rounded-md">
                <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                <span>{course.student_count || 0} {t('common.students', 'Students')}</span>
              </div>
              <div className="flex items-center bg-gray-50 px-2 py-1 rounded-md">
                <Video className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                <span>{course.lesson_count || 0} {t('common.lessons', 'Lessons')}</span>
              </div>
            </div>
          </div>
        </Link>
      ) : (
        // List View
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900 relative">
             {course.cover_image ? (
              <>
                <img
                  src={course.cover_image}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-60"
                  loading="lazy"
                />
                <img src={course.cover_image} alt={course.title} className="relative w-full h-full object-contain drop-shadow-sm" loading="lazy" />
              </>
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${getCategoryColor(course.category)} flex items-center justify-center`}>
                <BookOpen className="h-5 w-5 text-white/60" />
              </div>
            )}
          </div>
          <div className="flex-grow min-w-0">
            <Link to={`/teacher/courses/${course.id}`} className="font-semibold text-gray-900 hover:text-blue-900 truncate block text-base">{course.title}</Link>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              <span>{t('common.student_count', { count: course.student_count || 0 })}</span>
              <span>•</span>
              <span>{formatDuration(course.total_duration || 0)}</span>
              <span>•</span>
              <span>{getTimeAgo(course.updated_at)}</span>
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center gap-3">
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
              getStatus(course) === 'published'
                ? 'bg-green-100 text-green-800'
                : getStatus(course) === 'scheduled'
                ? 'bg-amber-100 text-amber-800'
                : getStatus(course) === 'archived'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {getStatus(course) === 'published' && t('common.published')}
              {getStatus(course) === 'scheduled' && t('teacher_courses.status_scheduled')}
              {getStatus(course) === 'archived' && t('teacher_courses.status_archived')}
              {getStatus(course) === 'draft' && t('common.draft')}
            </span>
            <Link 
              to={`/teacher/courses/${course.id}/edit`}
              className="p-2 text-gray-400 hover:text-blue-900 hover:bg-gray-50 rounded-full transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Edit className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  ), [viewMode, selectedCourses, getCategoryColor, formatDuration, getTimeAgo, t]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCourses(filteredAndSortedCourses.map(c => c.id));
    } else {
      setSelectedCourses([]);
    }
  };

  if (isLoading && !coursesPayload) {
    return <div className="flex items-center justify-center h-96"><LoadingSpinner text={t('common.loading')} /></div>;
  }

  if (isError) {
    const friendlyMessage = queryError instanceof Error ? queryError.message : t('teacher_courses.generic_error', 'Something went wrong.');
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-red-50 text-red-700 rounded-lg p-4">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="font-semibold">{t('common.error')}</p>
        <p>{friendlyMessage}</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.try_again')}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      {!hideHeader && (
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('teacher_courses.title')}</h1>
          <p className="text-sm mt-1 text-gray-600">{t('teacher_courses.description')}</p>
        </div>
        <div className="flex items-center gap-3">
          {onCreateClick ? (
            <button 
              onClick={onCreateClick}
              className="px-4 py-2 rounded-lg flex items-center font-medium text-sm transition-all shadow-sm hover:shadow-md text-white" 
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('teacher_courses.new_course_btn')}
            </button>
          ) : (
            <Link 
              to="/teacher/courses/new" 
              className="px-4 py-2 rounded-lg flex items-center font-medium text-sm transition-all shadow-sm hover:shadow-md text-white" 
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('teacher_courses.new_course_btn')}
            </Link>
          )}
          <button 
            onClick={() => setShowTemplates(true)} 
            className="px-4 py-2 rounded-lg flex items-center font-medium text-sm border bg-white transition-colors hover:bg-gray-50" 
            style={{ color: brandColors.primaryHex, borderColor: brandColors.primaryHex + '40' }}
          >
            <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
            {t('teacher_courses.use_template_btn')}
          </button>
        </div>
      </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-xl border bg-white shadow-sm" style={{ borderColor: brandColors.primaryHex + '20' }}>
            <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: brandColors.primaryHex }}>{t('teacher_courses.stats_total_courses')}</p>
            <p className="font-bold text-2xl mt-2 text-gray-900">{stats.totalCourses}</p>
          </div>
          <div className="p-4 rounded-xl border bg-white shadow-sm" style={{ borderColor: brandColors.primaryHex + '20' }}>
            <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: brandColors.primaryHex }}>{t('teacher_courses.stats_published_courses')}</p>
            <p className="font-bold text-2xl mt-2 text-gray-900">{stats.publishedCourses}</p>
          </div>
          <div className="p-4 rounded-xl border bg-white shadow-sm" style={{ borderColor: brandColors.primaryHex + '20' }}>
            <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: brandColors.primaryHex }}>{t('teacher_courses.stats_draft_courses')}</p>
            <p className="font-bold text-2xl mt-2 text-gray-900">{stats.draftCourses || 0}</p>
          </div>
          <div className="p-4 rounded-xl border bg-white shadow-sm" style={{ borderColor: brandColors.primaryHex + '20' }}>
            <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: brandColors.primaryHex }}>{t('teacher_courses.stats_archived_courses')}</p>
            <p className="font-bold text-2xl mt-2 text-gray-900">{stats.archivedCourses || 0}</p>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex-grow sm:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-60"
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Grid className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><List className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setSortOrder('asc')} className={`p-1.5 rounded-md transition-all ${sortOrder === 'asc' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><SortAsc className="h-4 w-4" /></button>
              <button onClick={() => setSortOrder('desc')} className={`p-1.5 rounded-md transition-all ${sortOrder === 'desc' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><SortDesc className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('all')} 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('teacher_courses.all_tab')}
            </button>
            <button 
              onClick={() => setActiveTab('published')} 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'published' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('teacher_courses.published_tab')}
            </button>
            <button 
              onClick={() => setActiveTab('draft')} 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'draft' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('teacher_courses.drafts_tab')}
            </button>
          </div>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)} 
            className="border border-gray-300 rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
          >
            {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </select>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)} 
            className="border border-gray-300 rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
          >
            {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCourses.length > 0 && (
        <BulkActions
          courses={courses}
          selectedCourses={selectedCourses}
          onActionComplete={() => {
            setSelectedCourses([]);
            refetch();
          }}
          onClearSelection={() => setSelectedCourses([])}
        />
      )}

      {/* Courses Grid/List */}
      {filteredAndSortedCourses.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedCourses.map(renderCourseCard)}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200">
              <div className="flex items-center p-2 border-b border-stone-200 text-xs font-semibold text-stone-500">
                <div className="w-1/12 pl-6"><input type="checkbox" onChange={handleSelectAll} className="rounded border-gray-300 text-[color:#1e1b4b] focus:ring-[color:#1e1b4b] w-4 h-4" /></div>
                <div className="w-4/12">{t('common.title')}</div>
                <div className="w-2/12">{t('common.students')}</div>
                <div className="w-2/12">{t('common.duration')}</div>
                <div className="w-2/12">{t('common.last_updated')}</div>
                <div className="w-1/12">{t('common.status')}</div>
              </div>
              <div className="divide-y divide-stone-100">
                {paginatedCourses.map(renderCourseCard)}
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md border border-stone-300 text-stone-600 disabled:opacity-50 hover:bg-stone-50"
              >
                Previous
              </button>
              <span className="text-sm text-stone-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md border border-stone-300 text-stone-600 disabled:opacity-50 hover:bg-stone-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 bg-white/50 rounded-lg border border-dashed border-stone-200">
          <BookOpen className="mx-auto h-12 w-12 text-stone-400" />
          <h3 className="mt-2 text-lg font-medium text-stone-800">
            {courses.length === 0 ? t('teacher_courses.empty_all_title') : t('teacher_courses.empty_filtered_title')}
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            {courses.length === 0 ? t('teacher_courses.empty_all_desc') : t('teacher_courses.empty_filtered_desc')}
          </p>
          {!(searchTerm || filterCategory !== 'all' || activeTab !== 'all') && (
            <div className="mt-6">
              {onCreateClick ? (
                <button 
                  onClick={onCreateClick}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white"
                  style={{ backgroundColor: brandColors.primaryHex }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('teacher_courses.create_first_course_btn')}
                </button>
              ) : (
                <Link to="/teacher/courses/new" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white" style={{ backgroundColor: brandColors.primaryHex }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('teacher_courses.create_first_course_btn')}
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Course Templates Modal. */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowTemplates(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{t('teacher_courses.templates_modal_title')}</h2>
            <p className="text-stone-600 mb-4">{t('teacher_courses.templates_modal_description')}</p>
            {/* Template options would be listed here */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border p-4 rounded-md hover:bg-stone-50 cursor-pointer">
                <h3 className="font-semibold">{t('teacher_courses.template_intro_faith_title')}</h3>
                <p className="text-sm text-stone-500">{t('teacher_courses.template_intro_faith_desc')}</p>
              </div>
              <div className="border p-4 rounded-md hover:bg-stone-50 cursor-pointer">
                <h3 className="font-semibold">{t('teacher_courses.template_church_history_title')}</h3>
                <p className="text-sm text-stone-500">{t('teacher_courses.template_church_history_desc')}</p>
              </div>
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => setShowTemplates(false)} className="px-4 py-2 bg-stone-200 text-stone-800 rounded-md hover:bg-stone-300">{t('teacher_courses.templates_modal_close_btn')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;