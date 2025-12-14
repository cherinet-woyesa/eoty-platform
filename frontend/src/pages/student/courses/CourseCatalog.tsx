import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, Users, CheckCircle, Loader2, AlertCircle, Mail } from 'lucide-react';
import { brandColors } from '@/theme/brand';
import { studentsApi } from '@/services/api/students';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';

interface CatalogCourse {
  id: number;
  title: string;
  description: string;
  cover_image: string | null;
  category: string;
  level: string;
  lesson_count: number;
  student_count: number;
  is_enrolled: boolean;
  is_published: boolean;
  created_by_name: string;
  created_by?: number | string;
}

const CourseCatalog: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortBy, setSortBy] = useState<'title' | 'students'>('title');
  const [visibleCount, setVisibleCount] = useState(12);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [enrolling, setEnrolling] = useState<number | null>(null);
  const [pendingInvitesCount, setPendingInvitesCount] = useState<number>(0);

  // Memoize categories and levels to prevent re-creation on each render
  const categories = useMemo(() => [
    { value: 'all', label: t('catalog.categories.all') },
    { value: 'faith', label: t('catalog.categories.faith') },
    { value: 'history', label: t('catalog.categories.history') },
    { value: 'spiritual', label: t('catalog.categories.spiritual') },
    { value: 'bible', label: t('catalog.categories.bible') },
    { value: 'liturgical', label: t('catalog.categories.liturgical') },
    { value: 'youth', label: t('catalog.categories.youth') }
  ], [t]);

  const levels = useMemo(() => [
    { value: 'all', label: t('catalog.levels.all') },
    { value: 'beginner', label: t('catalog.levels.beginner') },
    { value: 'intermediate', label: t('catalog.levels.intermediate') },
    { value: 'advanced', label: t('catalog.levels.advanced') }
  ], [t]);

  // Controls UI (search, filters, sort)
  // Note: actual UI rendering below should use these state values

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/courses/catalog');
      
      if (response.data.success) {
        setCourses(response.data.data.courses || []);
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
      setError(t('catalog.error.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadInvitations = useCallback(async () => {
    try {
      const res = await studentsApi.getInvitations();
      const invites = res.data?.invitations || res.data?.data?.invitations || [];
      setPendingInvitesCount(invites.length || 0);
    } catch (err) {
      // Silent fail – catalog should still work if invites endpoint has an issue
      console.warn('Failed to load student invitations count:', err);
    }
  }, []);

  // Refresh when other parts of the app change enrollment state
  useEffect(() => {
    const handleEnrollmentUpdate = () => loadCatalog();
    window.addEventListener('student-enrollment-updated', handleEnrollmentUpdate);
    window.addEventListener('focus', handleEnrollmentUpdate);
    return () => {
      window.removeEventListener('student-enrollment-updated', handleEnrollmentUpdate);
      window.removeEventListener('focus', handleEnrollmentUpdate);
    };
  }, [loadCatalog]);

  useEffect(() => {
    loadCatalog();
    loadInvitations();
  }, [loadCatalog, loadInvitations]);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const handleEnroll = useCallback(async (courseId: number, title?: string) => {
    try {
      const ok = await confirm({
        title: t('student_courses.enroll_confirm_title'),
        message: t('student_courses.enroll_confirm_message', { title: title || t('student_courses.default_course_title') }),
        confirmText: t('student_courses.enroll_confirm_cta'),
        cancelText: t('common.cancel')
      });
      if (!ok) return;

      setEnrolling(courseId);
      await apiClient.post(`/courses/${courseId}/enroll`);

      setCourses(prev =>
        prev.map(course =>
          course.id === courseId
            ? { ...course, is_enrolled: true, student_count: course.student_count + 1 }
            : course
        )
      );
      window.dispatchEvent(new CustomEvent('student-enrollment-updated'));
    } catch (err: any) {
      console.error('Failed to enroll:', err);
      const msg = err?.response?.data?.message || '';
      if (msg.toLowerCase().includes('already enrolled')) {
        setCourses(prev =>
          prev.map(course =>
            course.id === courseId
              ? { ...course, is_enrolled: true }
              : course
          )
        );
        window.dispatchEvent(new CustomEvent('student-enrollment-updated'));
        return;
      }
      alert(t('student_courses.enroll_error'));
    } finally {
      setEnrolling(null);
    }
  }, [confirm, t]);

  // Memoize filtered courses to prevent unnecessary re-calculations
  useEffect(() => {
    setVisibleCount(12);
  }, [debouncedSearch, filterCategory, filterLevel, sortBy]);

  const filteredCourses = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return courses.filter(course => {
      const title = (course.title || '').toLowerCase();
      const description = (course.description || '').toLowerCase();
      const matchesSearch = !query || title.includes(query) || description.includes(query);
      const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
      const matchesLevel = filterLevel === 'all' || course.level === filterLevel;
      
      return matchesSearch && matchesCategory && matchesLevel && course.is_published;
    });
  }, [courses, debouncedSearch, filterCategory, filterLevel]);

  const sortedCourses = useMemo(() => {
    const arr = [...filteredCourses];
    if (sortBy === 'title') return arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    if (sortBy === 'students') return arr.sort((a, b) => (b.student_count || 0) - (a.student_count || 0));
    return arr;
  }, [filteredCourses, sortBy]);

  const visibleCourses = useMemo(
    () => sortedCourses.slice(0, visibleCount),
    [sortedCourses, visibleCount]
  );
  const canLoadMore = visibleCount < sortedCourses.length;

  const getCategoryColor = useCallback((category: string) => {
    const colors: { [key: string]: string } = {
      faith: 'from-emerald-500 to-emerald-600',
      history: 'from-amber-500 to-amber-600',
      spiritual: 'from-teal-500 to-teal-600',
      bible: 'from-green-500 to-green-600',
      liturgical: 'from-red-500 to-red-600',
      youth: 'from-cyan-500 to-cyan-600'
    };
    return colors[category] || 'from-stone-500 to-stone-600';
  }, []);

  // Memoize compact course rendering to prevent unnecessary re-renders
  const renderCourseCard = useCallback((course: CatalogCourse) => (
    <div key={course.id} className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 overflow-hidden hover:shadow-md transition-all duration-200 hover:border-[color:#1e1b4b]">
      {/* Compact Course Header */}
      <div className={`relative h-32 ${!course.cover_image ? `bg-gradient-to-r ${getCategoryColor(course.category)}` : 'bg-stone-200'}`}>
        {course.cover_image && (
          <>
            <img 
              src={course.cover_image} 
              alt={course.title} 
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </>
        )}
        
        <div className={`absolute inset-0 p-3 flex flex-col justify-end ${!course.cover_image ? 'text-white' : 'text-white'}`}>
          <h3 className="text-sm font-bold mb-0.5 line-clamp-2 drop-shadow-sm">{course.title}</h3>
          <p className="text-white/90 text-xs line-clamp-2 opacity-90 drop-shadow-sm">
            {course.description || t('student_courses.no_description')}
          </p>
        </div>

        {course.is_enrolled && (
          <div className="absolute top-1.5 right-1.5 bg-[color:#1e1b4b] text-white px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center shadow-md z-10">
            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
            {t('student_courses.enrolled_badge')}
          </div>
        )}
      </div>

      {/* Compact Course Info */}
      <div className="p-3">
        <div className="flex items-center justify-between text-xs text-stone-600 mb-2">
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3 text-[color:#1e1b4b]" />
            <span>{course.student_count} {t('student_courses.students_label')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <BookOpen className="h-3 w-3 text-[#2980B9]" />
            <span>{course.lesson_count} {t('student_courses.lessons_label')}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs mb-2">
          <span className="capitalize bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-stone-700">
            {course.level || t('student_courses.beginner')}
          </span>
          <span className="text-stone-500 text-[10px]">
            {t('student.course_grid.by')} {course.created_by_name}
          </span>
        </div>

        {/* Compact Action Buttons */}
        <div className="flex space-x-1.5">
          {/* For teachers, show preview/manage actions. For students, show view/enroll/continue. */}
          {user?.role === 'teacher' ? (
            <>
              <Link
                to={`/teacher/courses/${course.id}`}
                className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-stone-300 text-xs font-medium rounded text-stone-700 bg-white/90 backdrop-blur-sm hover:bg-stone-50 transition-colors"
              >
                {t('student_courses.preview_btn')}
              </Link>
              {/* Only show Manage if the current teacher is the course owner */}
              {String(course.created_by) === String(user?.id) && (
                <Link
                  to={`/teacher/courses/${course.id}/edit`}
                  className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white"
                  style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
                >
                  {t('student_courses.manage_btn')}
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                to={`/member/courses/${course.id}`}
                className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-stone-300 text-xs font-medium rounded text-stone-700 bg-white/90 backdrop-blur-sm hover:bg-stone-50 transition-colors"
              >
                {t('student_courses.view_btn')}
              </Link>

              {!course.is_enrolled ? (
                <button
                  onClick={() => handleEnroll(course.id, course.title)}
                  disabled={enrolling === course.id}
                  className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                  style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
                >
                  {enrolling === course.id ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
                      {t('student_courses.enrolling_btn')}
                    </>
                  ) : (
                    t('student_courses.enroll_btn')
                  )}
                </button>
              ) : (
                <Link
                  to={`/member/courses/${course.id}`}
                  className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white transition-all shadow-sm hover:shadow-md"
                  style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
                >
                  {t('student_courses.continue_btn')}
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  ), [getCategoryColor, handleEnroll, enrolling, t, user?.id, user?.role]);

  // Infinite scroll observer
  useEffect(() => {
    if (!canLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleCount(v => v + 12);
          }
        });
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [canLoadMore]);

  const inlineError = error ? (
    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg flex items-start gap-2">
      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 text-xs sm:text-sm">
        <p className="font-semibold">{t('student_courses.catalog_error_title')}</p>
        <p className="text-rose-600/80">{error}</p>
      </div>
      <button
        onClick={loadCatalog}
        className="text-[11px] font-semibold text-[color:#1e1b4b] hover:underline"
      >
        {t('common.try_again')}
      </button>
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="w-full space-y-3 p-3">
        <div className="h-10 bg-stone-200 rounded-lg animate-pulse w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-stone-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 p-2">
      {inlineError}
        {/* Compact Invitations Alert */}
        {pendingInvitesCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-white/80 border border-emerald-200 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100">
                <Mail className="h-3 w-3 text-emerald-700" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-900">
                  {t('student_courses.invites_count', { count: pendingInvitesCount })}
                </p>
                <p className="text-[10px] text-emerald-700/80">
                  {t('student_courses.invites_message')}
                </p>
              </div>
            </div>
            <Link
              to="/member/invitations"
              className="inline-flex items-center self-start sm:self-auto px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm"
            >
              {t('student_courses.view_invites')}
            </Link>
          </div>
        )}

        {/* Compact Search and Filters */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-stone-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder={t('student_courses.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 text-sm bg-white"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 bg-white text-sm"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 bg-white text-sm"
            >
              {levels.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 bg-white text-sm"
            >
              <option value="title">{t('student_courses.sort_title')}</option>
              <option value="students">{t('student_courses.sort_popular')}</option>
            </select>
          </div>
        </div>
      </div>

        {/* Course Grid */}
        {sortedCourses.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleCourses.map(renderCourseCard)}
            </div>
            {canLoadMore && <div ref={sentinelRef} className="h-1" />}
            {canLoadMore && (
              <div className="flex items-center justify-center mt-4">
                <button
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:border-[#1e1b4b]/40 hover:text-[#1e1b4b] transition-colors"
                  onClick={() => setVisibleCount(v => v + 12)}
                >
                  {t('student_courses.load_more')}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-6 text-center">
            <BookOpen className="h-10 w-10 text-stone-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-stone-800 mb-1">
              {t('student_courses.no_courses_found')}
            </h3>
            <p className="text-stone-600 text-xs">
              {t('student_courses.adjust_filters_prompt')}
            </p>
          </div>
        )}
      </div>
    
  );
};

export default React.memo(CourseCatalog);