import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  BarChart3,
  CheckCircle,
  Trophy,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { CourseProgress, UserProgressStats } from '@/services/api/progress';
import { apiClient } from '@/services/api/apiClient';
import { useTranslation } from 'react-i18next';
import { brandColors } from '@/theme/brand';
import { useNotification } from '@/context/NotificationContext';

const ProgressDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { showNotification } = useNotification();
  const primary = brandColors.primaryHex;
  const primaryHover = brandColors.primaryHoverHex;
  const [stats, setStats] = useState<UserProgressStats | null>(null);
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'last_accessed' | 'title' | 'completion'>('last_accessed');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Pull comprehensive progress from interactive API
      const response = await apiClient.get('/interactive/progress');

      if (!response.data?.success) {
        throw new Error(t('learning_progress.error_desc'));
      }

      const data = response.data.data || {};
      const coursesFromApi = data.courses || [];
      const quizzes = data.recent_quizzes || [];

      const realCourses: CourseProgress[] = coursesFromApi.map((course: any) => {
        const totalLessons = course.total_lessons || course.lessons?.length || 0;
        const completedLessons =
          course.completed_lessons ||
          (course.lessons || []).filter((lesson: any) => lesson.is_completed).length ||
          0;
        const overallProgress =
          course.overall_progress && !Number.isNaN(Number(course.overall_progress))
            ? Number(course.overall_progress)
            : totalLessons > 0
              ? (course.lessons || []).reduce((sum: number, l: any) => sum + (l.progress || 0), 0) /
              totalLessons
              : 0;

        return {
          course_id: course.course_id,
          course_title: course.course_title,
          total_lessons: totalLessons,
          completed_lessons: completedLessons,
          overall_progress: overallProgress,
          last_accessed: course.last_accessed || course.lessons?.[0]?.last_accessed_at || new Date().toISOString(),
          lessons: course.lessons || []
        };
      });

      const totalCourses = realCourses.length;
      const totalLessons = realCourses.reduce((sum, c) => sum + (c.total_lessons || 0), 0);
      const totalLessonsCompleted = realCourses.reduce((sum, c) => sum + (c.completed_lessons || 0), 0);

      const quizAttempts = quizzes.length;
      const averageQuizScore =
        quizAttempts > 0
          ? Math.round(
            quizzes.reduce((sum: number, q: any) => {
              if (q.max_score) {
                return sum + Math.round(((q.score || 0) / q.max_score) * 100);
              }
              return sum;
            }, 0) / quizAttempts
          )
          : 0;

      const realStats: UserProgressStats = {
        total_courses_enrolled: totalCourses,
        total_lessons_completed: totalLessonsCompleted,
        total_video_watch_time: 0,
        total_quiz_attempts: quizAttempts,
        average_quiz_score: averageQuizScore,
        study_streak: 0,
        total_points_earned: 0,
        level: 1,
        next_level_points: 0
      };

      setStats(realStats);
      setCourses(realCourses);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('Failed to load progress data:', err);
      setError(err instanceof Error ? err.message : t('learning_progress.error_desc'));
      showNotification({
        type: 'error',
        title: t('learning_progress.error_title'),
        message: err instanceof Error ? err.message : t('learning_progress.error_desc')
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
      return t('learning_progress.time_hours_minutes', { hours, mins });
    }
    return t('learning_progress.time_minutes', { mins });
  };

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(dateString));
    } catch (e) {
      return dateString;
    }
  };

  const progressPercentColor = (percentage: number) => {
    if (percentage >= 100) return 'text-emerald-600';
    if (percentage >= 75) return 'text-indigo-700';
    if (percentage >= 50) return 'text-indigo-600';
    return 'text-stone-600';
  };

  const filteredSortedCourses = useMemo(() => {
    let list = [...courses];

    if (statusFilter === 'completed') {
      list = list.filter((c) => (c.overall_progress || 0) >= 99.5);
    } else if (statusFilter === 'in_progress') {
      list = list.filter((c) => (c.overall_progress || 0) > 0 && (c.overall_progress || 0) < 99.5);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.course_title.localeCompare(b.course_title);
        case 'completion':
          return (b.overall_progress || 0) - (a.overall_progress || 0);
        case 'last_accessed':
        default:
          return new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime();
      }
    });

    return list;
  }, [courses, sortBy, statusFilter]);

  const getNextLessonLink = (course: CourseProgress) => {
    if (!course.lessons || course.lessons.length === 0) return `/member/courses/${course.course_id}`;
    const next = course.lessons.find((l: any) => !l.is_completed) || course.lessons[0];
    return `/member/courses/${course.course_id}?lessonId=${next.lesson_id || next.id || ''}`;
  };

  const nextLessonLabel = (course: CourseProgress) => {
    if (!course.lessons || course.lessons.length === 0) return t('learning_progress.view_course');
    const next = course.lessons.find((l: any) => !l.is_completed) || course.lessons[0];
    return next.lesson_title || t('learning_progress.next_lesson');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white/90 rounded-xl p-4 sm:p-5 border border-stone-200 shadow-sm animate-pulse space-y-3"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-200" />
              <div className="h-6 bg-stone-200 rounded w-24" />
              <div className="h-4 bg-stone-200 rounded w-16" />
            </div>
          ))}
        </div>
        <div className="bg-white/95 rounded-xl border border-stone-200 p-5 sm:p-6 shadow-sm animate-pulse">
          <div className="h-5 bg-stone-200 rounded w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-3 bg-stone-200 rounded" />
            ))}
          </div>
        </div>
        <div className="bg-white/95 rounded-xl border border-stone-200 p-5 sm:p-6 shadow-sm animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="space-y-3">
              <div className="h-4 bg-stone-200 rounded w-48" />
              <div className="h-2 bg-stone-200 rounded w-full" />
              <div className="h-2 bg-stone-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="text-center p-6 sm:p-8 bg-white rounded-xl shadow-lg border border-red-200 max-w-xl">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-600 mb-2">{t('learning_progress.error_title')}</h2>
          <p className="text-sm text-stone-700 mb-6">{error}</p>
          <button
            onClick={loadProgressData}
            className="inline-flex items-center px-4 py-2.5 rounded-lg text-white transition-colors text-sm font-semibold hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ backgroundColor: primary, borderColor: primary, boxShadow: `0 0 0 2px ${primary}33` }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('learning_progress.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>
              {t('learning_progress.last_synced')} {lastUpdated ? formatDate(lastUpdated) : '—'}
            </span>
            <div className="flex gap-2">
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-stone-100 text-stone-700">
                <CheckCircle className="h-3 w-3" />
                <span>{t('learning_progress.quizzes_taken', { count: stats.total_quiz_attempts || 0 })}</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-stone-100 text-stone-700">
                <Trophy className="h-3 w-3" />
                <span>{t('learning_progress.avg_quiz_score', { score: stats.average_quiz_score || 0 })}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                name: t('learning_progress.kpi_courses'),
                value: stats.total_courses_enrolled.toString(),
                icon: BookOpen
              },
              {
                name: t('learning_progress.kpi_lessons'),
                value: stats.total_lessons_completed.toString(),
                icon: CheckCircle
              },
              {
                name: t('learning_progress.kpi_watch_time'),
                value: formatTime(stats.total_video_watch_time),
                icon: Clock
              },
              {
                name: t('learning_progress.kpi_level'),
                value: stats.level.toString(),
                icon: Trophy
              }
            ].map((stat, index) => (
              <div
                key={stat.name}
                className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-stone-200 shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-offset-2"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="p-2 rounded-lg shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${primary}, ${primaryHover})` }}
                  >
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-stone-800 mb-0.5">{stat.value}</p>
                  <p className="text-sm text-stone-600 font-medium">{stat.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-stone-200 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[color:#1e1b4b]" />
            {t('learning_progress.course_progress')}
          </h2>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-stone-600">
              {t('learning_progress.courses_label', { count: filteredSortedCourses.length })}
            </span>
            <div className="flex flex-wrap gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-stone-200 rounded-lg px-2 py-1 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ borderColor: primary, boxShadow: `0 0 0 1px ${primary}22` }}
              >
                <option value="last_accessed">{t('learning_progress.sort_last_accessed')}</option>
                <option value="title">{t('learning_progress.sort_title')}</option>
                <option value="completion">{t('learning_progress.sort_completion')}</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-sm border border-stone-200 rounded-lg px-2 py-1 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ borderColor: primary, boxShadow: `0 0 0 1px ${primary}22` }}
              >
                <option value="all">{t('learning_progress.filter_all')}</option>
                <option value="in_progress">{t('learning_progress.filter_in_progress')}</option>
                <option value="completed">{t('learning_progress.filter_completed')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredSortedCourses.length > 0 ? (
            filteredSortedCourses.map((course) => {
              const progressValue = Math.round(course.overall_progress || 0);
              return (
                <div
                  key={course.course_id}
                  className="border border-stone-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-stone-800 text-base">{course.course_title}</p>
                      <p className="text-sm text-stone-600">
                        {t('learning_progress.lessons_completed_label', {
                          completed: course.completed_lessons,
                          total: course.total_lessons
                        })}
                      </p>
                      <p className="text-xs text-stone-500">
                        {t('learning_progress.last_accessed', { date: formatDate(course.last_accessed) })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${progressPercentColor(progressValue)}`}>
                        {progressValue}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden mb-3">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[color:#1e1b4b] to-[color:#312e81] transition-all duration-500"
                      style={{ width: `${Math.min(progressValue, 100)}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/member/courses/${course.course_id}`}
                      className="inline-flex items-center px-3 py-2 rounded-lg bg-[color:#1e1b4b] text-white text-sm font-semibold hover:bg-[color:#312e81] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={{ boxShadow: `0 0 0 2px ${primary}33` }}
                    >
                      {course.overall_progress > 0
                        ? t('learning_progress.resume')
                        : t('learning_progress.start')}
                    </Link>
                    <Link
                      to={`/member/courses/${course.course_id}`}
                      className="inline-flex items-center px-3 py-2 rounded-lg border border-stone-200 text-sm font-semibold text-stone-700 hover:border-[color:#1e1b4b] hover:text-[color:#1e1b4b] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={{ borderColor: primary, boxShadow: `0 0 0 1px ${primary}22` }}
                    >
                      {t('learning_progress.view_course')}
                    </Link>
                    <Link
                      to={getNextLessonLink(course)}
                      className="inline-flex items-center px-3 py-2 rounded-lg border border-stone-200 text-sm font-semibold text-stone-700 hover:border-[color:#1e1b4b] hover:text-[color:#1e1b4b] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={{ borderColor: primary, boxShadow: `0 0 0 1px ${primary}22` }}
                    >
                      {t('learning_progress.next_lesson_cta')} {nextLessonLabel(course)}
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-stone-600">
              <div className="max-w-xl mx-auto bg-stone-50 border border-stone-200 rounded-xl p-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-stone-300" />
                <p className="text-base font-semibold text-stone-800">
                  {t('learning_progress.no_courses_title')}
                </p>
                <p className="text-sm text-stone-600 mb-4">{t('learning_progress.no_courses_desc')}</p>
                <Link
                  to="/member/all-courses?tab=browse"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-[color:#1e1b4b] text-white text-sm font-semibold hover:bg-[color:#312e81] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ boxShadow: `0 0 0 2px ${primary}33` }}
                >
                  {t('learning_progress.browse_courses')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressDashboard;
