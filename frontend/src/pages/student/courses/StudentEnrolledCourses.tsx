import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen, Search, Users, Clock, Star, 
  TrendingUp, PlayCircle, Award, AlertCircle,
  Loader2, Heart, HeartOff, LogOut, Filter,
  CheckCircle, BarChart3, Calendar, Bookmark
} from 'lucide-react';
import { brandColors } from '@/theme/brand';
import { apiClient } from '@/services/api/apiClient';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';

interface EnrolledCourse {
  id: number;
  title: string;
  description: string;
  cover_image: string | null;
  category: string;
  level: string;
  lesson_count: number;
  student_count: number;
  progress_percentage: number;
  enrollment_status: string;
  enrolled_at: string;
  last_accessed_at: string;
  completed_at: string | null;
  created_by_name: string;
  user_rating?: number;
  is_favorite?: boolean;
  is_bookmarked?: boolean;
}

interface CourseStats {
  total: number;
  inProgress: number;
  completed: number;
  favorites: number;
  avgProgress: number;
}

const StudentEnrolledCourses: React.FC = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'completed' | 'favorites'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'progress' | 'last_accessed'>('last_accessed');
  const [showRatingModal, setShowRatingModal] = useState<number | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [compact, setCompact] = useState(false);
  const [nextLessonMap, setNextLessonMap] = useState<Record<number, { id: number; title: string }>>({});
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState<CourseStats>({
    total: 0,
    inProgress: 0,
    completed: 0,
    favorites: 0,
    avgProgress: 0
  });
  
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Debounce searchTerm
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Reset and reload when filters change
  useEffect(() => {
    setPage(1);
    setCourses([]);
    setHasMore(true);
    loadEnrolledCourses(1, true);
  }, [debouncedSearch, filterStatus, sortBy]);

  const loadEnrolledCourses = async (pageNum: number, reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/students/enrolled-courses', {
        params: {
          page: pageNum,
          limit: 12,
          search: debouncedSearch,
          status: filterStatus,
          sort: sortBy
        }
      });
      
      if (response.data.success) {
        const { courses: newCourses, pagination, nextLessons, stats: newStats } = response.data.data;
        
        setCourses(prev => reset ? newCourses : [...prev, ...newCourses]);
        setNextLessonMap(prev => ({ ...prev, ...nextLessons }));
        setStats(newStats);
        setHasMore(pagination.page < pagination.pages);
      }
    } catch (err) {
      console.error('Failed to load enrolled courses:', err);
      setError(t('enrolled_courses.error.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll observer
  const lastCourseElementRef = React.useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => {
          const nextPage = prevPage + 1;
          loadEnrolledCourses(nextPage, false);
          return nextPage;
        });
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore]);

  const handleUnenroll = async (courseId: number, courseTitle: string) => {
    const confirmed = await confirm({
      title: t('enrolled_courses.unenroll.title'),
      message: t('enrolled_courses.unenroll.message', { title: courseTitle }),
      confirmText: t('enrolled_courses.unenroll.confirm'),
      cancelText: t('common.cancel')
    });
    if (!confirmed) return;

    try {
      await apiClient.post(`/courses/${courseId}/unenroll`);
      // Reload current view
      loadEnrolledCourses(1, true);
      setPage(1);
      
      // Notify other parts of the app (catalog) to refresh enrollment badges
      window.dispatchEvent(new CustomEvent('student-enrollment-updated'));
      showNotification({ 
        type: 'success', 
        title: t('enrolled_courses.unenrolled_title'), 
        message: t('enrolled_courses.unenrolled_message') 
      });
    } catch (err: any) {
      console.error('Failed to unenroll:', err);
      showNotification({ 
        type: 'error', 
        title: t('common.error'), 
        message: err.response?.data?.message || t('enrolled_courses.unenrolled_error') 
      });
    }
  };

  const handleToggleFavorite = async (courseId: number, title: string) => {
    const target = courses.find(c => c.id === courseId);
    const currentlyFav = Boolean(target?.is_favorite);

    // Optimistic toggle for immediate UI feedback
    setCourses(prev =>
      prev.map(c => c.id === courseId ? { ...c, is_favorite: !currentlyFav } : c)
    );

    try {
      const endpoint = currentlyFav ? 'unfavorite' : 'favorite';
      const res = await apiClient.post(`/courses/${courseId}/${endpoint}`);

      showNotification({ 
        type: 'success', 
        title: t('common.success'), 
        message: res?.data?.message || (currentlyFav ? t('enrolled_courses.favorite_removed') : t('enrolled_courses.favorite_added')) 
      });
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err);
      // Revert optimistic update
      setCourses(prev =>
        prev.map(c => c.id === courseId ? { ...c, is_favorite: currentlyFav } : c)
      );
      const message = err.response?.data?.message || '';

      // Revert optimistic change on failure
      setCourses(prev =>
        prev.map(c => c.id === courseId ? { ...c, is_favorite: currentlyFav } : c)
      );
      showNotification({ type: 'error', title: t('common.error'), message: message || t('enrolled_courses.favorite_error') });
    }
  };

  const handleToggleBookmark = async (courseId: number, title: string) => {
    const target = courses.find(c => c.id === courseId);
    const currentlyBookmarked = Boolean(target?.is_bookmarked);

    const ok = await confirm({
      title: currentlyBookmarked ? t('enrolled_courses.bookmark_remove_title') : t('enrolled_courses.bookmark_add_title'),
      message: currentlyBookmarked
        ? t('enrolled_courses.bookmark_remove_message', { title })
        : t('enrolled_courses.bookmark_add_message', { title }),
      confirmText: currentlyBookmarked ? t('enrolled_courses.remove_bookmark') : t('enrolled_courses.add_bookmark'),
      cancelText: t('common.cancel')
    });
    if (!ok) return;

    // Optimistic toggle
    setCourses(prev =>
      prev.map(c => c.id === courseId ? { ...c, is_bookmarked: !currentlyBookmarked } : c)
    );
    try {
      await apiClient.post('/bookmarks/toggle', {
        entityType: 'course',
        entityId: courseId
      });
      showNotification({
        type: 'success',
        title: t('common.success'),
        message: currentlyBookmarked ? t('enrolled_courses.bookmark_removed') : t('enrolled_courses.bookmark_added')
      });
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      // Revert on error
      setCourses(prev =>
        prev.map(c => c.id === courseId ? { ...c, is_bookmarked: currentlyBookmarked } : c)
      );
      showNotification({ type: 'error', title: t('common.error'), message: t('enrolled_courses.bookmark_error') });
    }
  };

  const handleSubmitRating = async () => {
    if (!showRatingModal || ratingValue === 0) return;

    try {
      await apiClient.post(`/courses/${showRatingModal}/rate`, {
        rating: ratingValue,
        review: reviewText
      });

      setCourses(courses.map(c => 
        c.id === showRatingModal ? { ...c, user_rating: ratingValue } : c
      ));

      setShowRatingModal(null);
      setRatingValue(0);
      setReviewText('');
      showNotification({ type: 'success', title: t('common.success'), message: t('enrolled_courses.rating_thanks') });
    } catch (err: any) {
      console.error('Failed to submit rating:', err);
      showNotification({ type: 'error', title: t('common.error'), message: err.response?.data?.message || t('enrolled_courses.rating_error') });
    }
  };

  if (error && courses.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-[#EF5350] mx-auto mb-3" />
            <p className="text-stone-700 text-sm mb-3">{error}</p>
            <button
              onClick={() => loadEnrolledCourses(1, true)}
              className="px-3 py-1.5 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors font-medium text-xs shadow-sm"
            >
              {t('enrolled_courses.error.try_again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 p-3">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: t('enrolled_courses.stats.total'), value: stats.total, icon: BookOpen, color: 'from-[#2f3f82]/15 to-[#3a4c94]/10', iconColor: 'text-[#2f3f82]' },
            { label: t('enrolled_courses.stats.in_progress'), value: stats.inProgress, icon: TrendingUp, color: 'from-[#cfa15a]/15 to-[#d8b26d]/10', iconColor: 'text-[#cfa15a]' },
            { label: t('enrolled_courses.stats.completed'), value: stats.completed, icon: CheckCircle, color: 'from-[#2980B9]/15 to-[#16A085]/10', iconColor: 'text-[#2980B9]' },
            { label: t('enrolled_courses.stats.favorites'), value: stats.favorites, icon: Heart, color: 'from-[#E74C3C]/15 to-[#E67E22]/10', iconColor: 'text-[#E74C3C]' },
            { label: t('enrolled_courses.stats.avg_progress'), value: `${stats.avgProgress}%`, icon: BarChart3, color: 'from-[#2f3f82]/15 to-[#34495E]/10', iconColor: 'text-[#2f3f82]' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-stone-200 shadow-sm hover:shadow-md transition-all" style={{ borderColor: 'transparent' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} rounded-md blur-md`}></div>
                  <div className={`relative p-1.5 bg-gradient-to-br ${stat.color} rounded-md border border-white/50`}>
                    <stat.icon className={`h-3 w-3 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-stone-800 mb-0.5">{stat.value}</p>
                <p className="text-stone-600 text-xs font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search, Filters & Sort */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-stone-200 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder={t('enrolled_courses.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2f3f82]/50 focus:border-[#2f3f82]/50 text-sm bg-stone-50/50 text-stone-700"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCompact(prev => !prev)}
                className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                  compact
                    ? 'border-[#2f3f82]/50 bg-[#2f3f82]/10 text-[#1f2e6e]'
                    : 'border-stone-300 bg-stone-50/50 text-stone-700 hover:border-[#2f3f82]/30'
                }`}
              >
                {compact ? t('enrolled_courses.view_dense') : t('enrolled_courses.view_comfy')}
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2f3f82]/50 focus:border-[#2f3f82]/50 bg-stone-50/50 text-stone-700 text-sm"
              >
                <option value="last_accessed">{t('enrolled_courses.sort.last_accessed')}</option>
                <option value="progress">{t('enrolled_courses.sort.progress')}</option>
                <option value="title">{t('enrolled_courses.sort.title')}</option>
              </select>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'all', count: stats.total, label: t('enrolled_courses.filter.all') },
              { key: 'in-progress', count: stats.inProgress, label: t('enrolled_courses.filter.in_progress') },
              { key: 'completed', count: stats.completed, label: t('enrolled_courses.filter.completed') },
              { key: 'favorites', count: stats.favorites, label: t('enrolled_courses.filter.favorites') },
            ] as const).map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilterStatus(chip.key)}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  filterStatus === chip.key
                    ? 'border-[#2f3f82] bg-[#2f3f82]/10 text-[#1f2e6e] font-semibold'
                    : 'border-stone-300 bg-white text-stone-700 hover:border-[#2f3f82]/30'
                }`}
              >
                {chip.label} ({chip.count})
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setFilterStatus('all');
                setSearchTerm('');
                setSortBy('last_accessed');
              }}
              className="px-3 py-1.5 rounded-full border border-stone-300 text-sm text-stone-600 hover:border-[#2f3f82]/30 hover:text-[#1f2e6e] transition-colors"
            >
              {t('enrolled_courses.filter.clear')}
            </button>
          </div>
        </div>

        {/* Courses Grid - Light cards */}
        {courses.length > 0 ? (
          <>
          <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${compact ? 'sm:grid-cols-2 xl:grid-cols-3' : ''}`}>
            {courses.map((course, index) => (
              <div 
                key={course.id} 
                ref={index === courses.length - 1 ? lastCourseElementRef : null}
                className={`bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/40 shadow-sm hover:shadow-md hover:border-slate-300/50 transition-all duration-200 overflow-hidden ${compact ? 'p-0' : ''}`}
              >
                {/* Course Header */}
                <div className="relative">
                  {course.cover_image ? (
                    <img src={course.cover_image} alt={course.title} className="w-full h-36 md:h-40 object-cover" />
                  ) : (
                    <div className="w-full h-36 md:h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-slate-400" />
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {course.progress_percentage >= 100 && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/90 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm">
                        {t('enrolled_courses.status.completed')}
                      </span>
                    )}
                    {course.is_favorite && (
                      <span className="p-1 rounded-full bg-red-500/90 text-white shadow-sm backdrop-blur-sm">
                        <Heart className="h-3 w-3 fill-current" />
                      </span>
                    )}
                  </div>

                  {/* Actions Overlay */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleBookmark(course.id, course.title);
                      }}
                      className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                        course.is_bookmarked 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white/80 text-slate-600 hover:bg-white hover:text-blue-600'
                      }`}
                      title={course.is_bookmarked ? t('enrolled_courses.remove_bookmark') : t('enrolled_courses.add_bookmark')}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${course.is_bookmarked ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleFavorite(course.id, course.title);
                      }}
                      className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                        course.is_favorite 
                          ? 'bg-red-500 text-white' 
                          : 'bg-white/80 text-slate-600 hover:bg-white hover:text-red-500'
                      }`}
                      title={course.is_favorite ? t('enrolled_courses.remove_favorite') : t('enrolled_courses.add_favorite')}
                    >
                      <Heart className={`h-3.5 w-3.5 ${course.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className={compact ? "p-4" : "p-5"}>
                  <h3 className={`font-bold text-slate-700 mb-2 line-clamp-2 ${compact ? 'text-base' : 'text-lg'}`}>{course.title}</h3>
                  <p className={`text-slate-600 line-clamp-2 ${compact ? 'text-xs mb-3' : 'text-sm mb-4'}`}>{course.description}</p>

                  {/* Progress Bar */}
                  <div className={compact ? "mb-3" : "mb-4"}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{t('common.progress')}</span>
                      <span className="font-semibold text-slate-700">{Math.round(course.progress_percentage || 0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300 shadow-sm"
                        style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})`, width: `${course.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className={`flex items-center justify-between text-sm text-slate-600 ${compact ? 'mb-3' : 'mb-4'}`}>
                    <div className="flex items-center gap-1">
                      <PlayCircle className="h-4 w-4" />
                      <span>{course.lesson_count} {t('student_courses.lessons_label')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.student_count} {t('student_courses.students_label')}</span>
                    </div>
                  </div>

                  {/* Next lesson */}
                  <div className={`flex items-center justify-between text-xs text-slate-600 ${compact ? 'mb-3' : 'mb-4'}`}>
                    <span className="font-medium text-slate-700">{t('enrolled_courses.next_lesson')}</span>
                    <span className="text-slate-500 line-clamp-1">
                      {nextLessonMap[course.id]?.title || t('enrolled_courses.next_lesson_default')}
                    </span>
                  </div>

                  {/* Rating */}
                  {course.user_rating ? (
                    <div className="flex items-center gap-1 mb-4">
                      <span className="text-sm text-slate-600">{t('enrolled_courses.rating_label')}</span>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${star <= course.user_rating! ? 'text-[#FFD700] fill-current' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowRatingModal(course.id)}
                      className={`${compact ? 'text-xs' : 'text-sm'} text-[#FFD700] hover:text-[#FFC107] mb-4 flex items-center gap-1 transition-colors`}
                    >
                      <Star className="h-4 w-4" />
                      {t('enrolled_courses.rate_course')}
                    </button>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-slate-200/50">
                    <Link
                      to={nextLessonMap[course.id]?.id ? `/member/courses/${course.id}?lesson=${nextLessonMap[course.id].id}` : `/member/courses/${course.id}`}
                      className={`flex-1 inline-flex items-center justify-center px-4 ${compact ? 'py-2 text-xs' : 'py-2.5 text-sm'} text-white rounded-lg transition-all duration-200 text-center font-semibold shadow-md hover:shadow-lg backdrop-blur-sm`}
                      style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
                    >
                      {course.progress_percentage > 0 ? (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          {t('student.course_grid.action_continue')}
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          {t('student.course_grid.action_start')}
                        </>
                      )}
                    </Link>
                    <button
                      onClick={() => handleUnenroll(course.id, course.title)}
                      className={`${compact ? 'p-2' : 'p-2.5'} border border-slate-300/50 text-slate-600 rounded-lg hover:bg-slate-50/50 transition-colors`}
                      title={t('enrolled_courses.unenroll.title')}
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Loading indicator for infinite scroll */}
          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#2f3f82]" />
            </div>
          )}
          </>
        ) : (
          !loading && (
            <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/40 p-12 text-center shadow-sm">
              <BookOpen className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">{t('enrolled_courses.empty_title')}</h3>
              <p className="text-slate-600 mb-6">
                {courses.length === 0 && !searchTerm && filterStatus === 'all'
                  ? t('enrolled_courses.empty_no_enrollment')
                  : t('enrolled_courses.empty_no_match')
                }
              </p>
              <Link
                to="/member/all-courses?tab=browse"
                className="inline-flex items-center px-6 py-3 text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg backdrop-blur-sm"
                style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
              >
                {t('enrolled_courses.browse_catalog')}
              </Link>
            </div>
          )
        )}

        {/* Rating Modal - Light theme */}
        {showRatingModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 max-w-md w-full border border-slate-200/50 shadow-xl">
              <h3 className="text-xl font-bold text-slate-700 mb-4">{t('enrolled_courses.rate_course')}</h3>
              
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRatingValue(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${star <= ratingValue ? 'text-[#FFD700] fill-current' : 'text-slate-300'}`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={t('enrolled_courses.rating_placeholder')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700]/50 text-slate-700 bg-slate-50/50"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowRatingModal(null);
                    setRatingValue(0);
                    setReviewText('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300/50 rounded-lg hover:bg-slate-50/50 text-slate-700 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSubmitRating}
                  disabled={ratingValue === 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 disabled:opacity-50 transition-all duration-200 font-semibold shadow-sm hover:shadow-md backdrop-blur-sm border border-[#27AE60]/30"
                >
                  {t('enrolled_courses.rating_submit')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
   
  );
};

export default StudentEnrolledCourses;
