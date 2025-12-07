import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Target, BookOpen, CheckCircle, Clock, ArrowRight, 
  PlayCircle, Loader2, AlertCircle, TrendingUp, Award,
  Zap, Star, Lock, Unlock, Users, Calendar
} from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';

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
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['learning-paths'],
    queryFn: async () => {
      const res = await apiClient.get('/learning-paths');
      if (!res.data?.success) throw new Error('Failed to load learning paths');
      return res.data.data;
    },
    staleTime: 1000 * 30
  });

  const paths = useMemo<LearningPath[]>(() => {
    const apiPaths = data?.paths || [];

    return apiPaths as LearningPath[];
  }, [data]);

  // Filtered paths
  const filteredPaths = useMemo(() => {
    return paths.filter(path => {
      const matchesCategory = selectedCategory === 'all' || path.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || path.difficulty === selectedDifficulty;
      return matchesCategory && matchesDifficulty;
    });
  }, [paths, selectedCategory, selectedDifficulty]);

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
  const handleEnroll = useCallback((pathId: string) => {
    // Navigate to browse courses with category filter
    const path = paths.find(p => p.id === pathId);
    if (path) {
      navigate(`/student/browse-courses?category=${encodeURIComponent(path.category)}`);
    }
  }, [paths, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-96">
            <LoadingSpinner size="lg" text={t('learning_paths.loading_text')} variant="logo" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
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
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
          <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900"
        >
          <option value="all">{t('learning_paths.all_categories')}</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
          <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900"
        >
          <option value="all">{t('learning_paths.all_levels')}</option>
          <option value="beginner">{t('learning_paths.beginner')}</option>
          <option value="intermediate">{t('learning_paths.intermediate')}</option>
          <option value="advanced">{t('learning_paths.advanced')}</option>
        </select>
      </div>

      {/* Learning Paths */}
      {filteredPaths.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('learning_paths.no_paths_found')}</h3>
          <p className="text-gray-500">{t('learning_paths.try_adjust_filters')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPaths.map((path) => (
            <div
              key={path.id}
              className="bg-white rounded-xl overflow-hidden border border-gray-200"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-gray-900" />
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getDifficultyColor(path.difficulty)}`}>
                        {t(`learning_paths.${path.difficulty}`)}
                      </span>
                        {path.is_enrolled && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          {t('learning_paths.enrolled_label')}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{path.title}</h2>
                    <p className="text-gray-500 text-sm">{path.description}</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {path.is_enrolled && path.progress > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>{t('learning_paths.progress_label')}</span>
                      <span>{Math.round(path.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gray-900 h-2 rounded-full transition-all"
                        style={{ width: `${path.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Course List */}
              <div className="p-6">
                {path.courses.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {path.courses.map((course, index) => (
                      <div
                        key={course.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-900 transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                          {course.order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 text-sm">{course.title}</h3>
                            {course.is_completed ? (
                              <CheckCircle className="h-4 w-4 text-gray-900 flex-shrink-0" />
                            ) : course.is_locked ? (
                              <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <Unlock className="h-4 w-4 text-gray-600 flex-shrink-0" />
                            )}
                          </div>
                          {course.progress > 0 && !course.is_completed && (
                            <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                              <div
                                className="bg-gray-900 h-1 rounded-full"
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('learning_paths.courses_will_appear')}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {path.estimated_duration}h
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {path.student_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {path.rating}
                    </span>
                  </div>
                  {path.is_enrolled ? (
                    <Link
                      to={`/student/courses`}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-semibold text-sm flex items-center gap-1"
                    >
                      {t('learning_paths.continue_btn')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleEnroll(path.id)}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-semibold text-sm flex items-center gap-1"
                    >
                      {t('learning_paths.start_path')}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LearningPathsPage;
