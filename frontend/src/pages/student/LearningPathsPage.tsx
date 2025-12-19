import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Target, BookOpen, CheckCircle, Clock, ArrowRight,
  AlertCircle, Star, Lock, Unlock, Users, RefreshCw, Search, Filter
} from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { brandColors } from '@/theme/brand';
import { useNotification } from '@/context/NotificationContext';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number; // in hours
  courses: PathCourse[];
  progress: number;
  is_enrolled: boolean;
  thumbnail?: string;
  student_count: number;
  rating: number;
}

interface PathCourse {
  id: string;
  title: string;
  order: number;
  is_completed: boolean;
  is_locked: boolean;
  progress: number;
  estimated_duration: number;
}

const LearningPathsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { showNotification } = useNotification();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedEnrollment, setSelectedEnrollment] = useState<'all' | 'enrolled' | 'not_enrolled'>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'duration' | 'progress'>('recommended');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['learning-paths'],
    queryFn: async () => {
      const res = await apiClient.get('/learning-paths');
      if (!res.data?.success) throw new Error('Failed to load learning paths');
      return res.data.data;
    },
    staleTime: 1000 * 30
  });

  useEffect(() => {
    if (data) {
      setLastUpdated(new Date().toISOString());
    }
  }, [data]);

  const paths = useMemo<LearningPath[]>(() => {
    const apiPaths = data?.paths || [];

    return apiPaths as LearningPath[];
  }, [data]);

  // Filtered + sorted paths
  const filteredPaths = useMemo(() => {
    let list = [...paths];
    list = list.filter(path => {
      const matchesCategory = selectedCategory === 'all' || path.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || path.difficulty === selectedDifficulty;
      const matchesEnrollment =
        selectedEnrollment === 'all' ||
        (selectedEnrollment === 'enrolled' && path.is_enrolled) ||
        (selectedEnrollment === 'not_enrolled' && !path.is_enrolled);
      const matchesSearch =
        !search.trim() ||
        path.title.toLowerCase().includes(search.toLowerCase()) ||
        path.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesDifficulty && matchesEnrollment && matchesSearch;
    });

    list.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'duration':
          return (a.estimated_duration || 0) - (b.estimated_duration || 0);
        case 'progress':
          return (b.progress || 0) - (a.progress || 0);
        case 'recommended':
        default:
          return (b.is_enrolled ? 1 : 0) - (a.is_enrolled ? 1 : 0);
      }
    });

    return list;
  }, [paths, selectedCategory, selectedDifficulty, selectedEnrollment, search, sortBy]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(paths.map(p => p.category));
    return Array.from(cats);
  }, [paths]);

  // Get difficulty color
  const getDifficultyColor = useCallback((difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]/30';
      case 'intermediate':
        return 'bg-[#00FFC6]/20 text-[#00FFC6] border-[#00FFC6]/30';
      case 'advanced':
        return 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30';
      default:
        return 'bg-stone-200 text-stone-600 border-stone-300';
    }
  }, []);

  // Handle path enrollment
  const handleEnroll = useCallback(async (pathId: string) => {
    try {
      await apiClient.post(`/learning-paths/${pathId}/enroll`);
      refetch();
      setToast({ type: 'success', message: t('learning_paths.enrolled_label') });
      showNotification({
        type: 'success',
        title: t('learning_paths.enrolled_label'),
        message: t('learning_paths.start_path')
      });
    } catch (err) {
      console.error('Failed to enroll in path', err);
      setToast({ type: 'error', message: t('learning_paths.load_failed') });
      showNotification({
        type: 'error',
        title: t('learning_paths.enroll_error'),
        message: t('learning_paths.load_failed')
      });
    }
  }, [refetch, showNotification, t]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  if (isLoading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
              <div className="h-4 bg-stone-200 rounded w-1/3" />
              <div className="h-3 bg-stone-200 rounded w-2/3" />
              <div className="h-2 bg-stone-200 rounded w-full" />
              <div className="h-2 bg-stone-200 rounded w-5/6" />
              <div className="h-10 bg-stone-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full space-y-4 sm:space-y-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg mb-4">{t('learning_paths.load_failed')}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors font-semibold shadow-sm"
            >
              {t('common.try_again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            className={`pointer-events-auto px-5 py-3 rounded-xl shadow-2xl border text-white text-sm font-semibold`}
            style={{
              background: toast.type === 'success'
                ? `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})`
                : 'linear-gradient(120deg, #ef4444, #b91c1c)',
              borderColor: toast.type === 'success' ? 'rgba(49,46,129,0.25)' : 'rgba(239,68,68,0.35)'
            }}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-stone-400 absolute left-3 top-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('learning_paths.search_placeholder')}
              className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:rgba(30,27,75,0.15)] focus:border-[color:rgba(30,27,75,0.35)]"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:rgba(30,27,75,0.15)] focus:border-[color:rgba(30,27,75,0.35)] text-sm"
          >
            <option value="all">{t('learning_paths.all_categories')}</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:rgba(30,27,75,0.15)] focus:border-[color:rgba(30,27,75,0.35)] text-sm"
          >
            <option value="all">{t('learning_paths.all_levels')}</option>
            <option value="beginner">{t('learning_paths.beginner')}</option>
            <option value="intermediate">{t('learning_paths.intermediate')}</option>
            <option value="advanced">{t('learning_paths.advanced')}</option>
          </select>
          <select
            value={selectedEnrollment}
            onChange={(e) => setSelectedEnrollment(e.target.value as any)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:rgba(30,27,75,0.15)] focus:border-[color:rgba(30,27,75,0.35)] text-sm"
          >
            <option value="all">{t('learning_paths.filter_all')}</option>
            <option value="enrolled">{t('learning_paths.filter_enrolled')}</option>
            <option value="not_enrolled">{t('learning_paths.filter_not_enrolled')}</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:rgba(30,27,75,0.15)] focus:border-[color:rgba(30,27,75,0.35)] text-sm"
          >
            <option value="recommended">{t('learning_paths.sort_recommended')}</option>
            <option value="rating">{t('learning_paths.sort_rating')}</option>
            <option value="duration">{t('learning_paths.sort_duration')}</option>
            <option value="progress">{t('learning_paths.sort_progress')}</option>
          </select>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white shadow-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? t('common.refreshing') || 'Refreshing' : t('common.refresh') || 'Refresh'}
        </button>
      </div>

      {/* Learning Paths */}
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <span>{t('learning_paths.last_synced')}</span>
        <span className="font-medium text-stone-700">
          {lastUpdated ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastUpdated)) : '—'}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-stone-100 text-stone-700">
          <Filter className="h-3 w-3" /> {filteredPaths.length} {t('learning_paths.paths_label', { count: filteredPaths.length })}
        </span>
      </div>

      {filteredPaths.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('learning_paths.no_paths_found')}</h3>
          <p className="text-gray-500">{t('learning_paths.try_adjust_filters')}</p>
          <Link
            to="/member/all-courses?tab=browse"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
          >
            {t('learning_paths.browse_courses')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPaths.map((path) => (
            <div
              key={path.id}
              className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getDifficultyColor(path.difficulty)}`}>
                    {t(`learning_paths.${path.difficulty}`)}
                  </span>
                  {path.is_enrolled && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-brand-primary/5 text-brand-primary border border-brand-primary/20">
                      {t('learning_paths.enrolled_label')}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2" title={path.title}>{path.title}</h2>
                <p className="text-gray-500 text-xs line-clamp-2 mb-3" title={path.description}>{path.description}</p>

                {/* Progress Bar */}
                {path.is_enrolled && path.progress > 0 && (
                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                      <span>{t('learning_paths.progress_label')}</span>
                      <span>{Math.round(path.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-gray-900 h-1.5 rounded-full transition-all"
                        style={{ width: `${path.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {path.estimated_duration}h
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {path.courses.length}
                  </span>
                </div>
                {path.is_enrolled ? (
                  <Link
                    to={`/member/all-courses?tab=enrolled`}
                    className="px-3 py-1.5 text-white rounded-lg transition-all font-semibold text-xs flex items-center gap-1"
                    style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
                  >
                    {t('learning_paths.continue_btn')}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <button
                    onClick={() => handleEnroll(path.id)}
                    className="px-3 py-1.5 text-white rounded-lg transition-all font-semibold text-xs flex items-center gap-1 disabled:opacity-60"
                    style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
                  >
                    {t('learning_paths.start_path')}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LearningPathsPage;
