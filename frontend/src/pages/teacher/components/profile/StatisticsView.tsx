import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, BarChart3, BookOpen, TrendingUp, TrendingDown,
  Users, Activity, Target, Star, Award, Play, Check
} from 'lucide-react';
import teacherApi, { type TeacherProfile as TeacherProfileType, type TeacherStats } from '@/services/api/teacherApi';
import { brandColors } from '@/theme/brand';

type TeacherProfileData = TeacherProfileType;

interface StatisticsViewProps {
  profile: TeacherProfileData;
  onBack: () => void;
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ profile, onBack }) => {
  const { t } = useTranslation();

  // Fetch teacher statistics
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-statistics'],
    queryFn: async () => {
      const res = await teacherApi.getTeacherStats();
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('teacher_stats.loading_title', 'Performance Statistics')}</h1>
              <p className="text-gray-600 text-lg">{t('teacher_stats.loading_subtitle', 'Loading your teaching analytics...')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('teacher_stats.title', 'Performance Statistics')}</h1>
              <p className="text-gray-600 text-lg">{t('teacher_stats.subtitle', 'View your teaching performance and student engagement')}</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <div className="text-red-600 mb-4">
              <BarChart3 className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">{t('teacher_stats.error_title', 'Failed to Load Statistics')}</h3>
            <p className="text-red-700 mb-4">{t('teacher_stats.error_desc', 'Unable to fetch your teaching analytics at this time.')}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {t('teacher_stats.retry', 'Try Again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="lg:col-span-3">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('teacher_stats.title', 'Performance Statistics')}</h1>
            <p className="text-gray-600 text-lg">{t('teacher_stats.subtitle', 'Comprehensive view of your teaching impact and student engagement')}</p>
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="lg:col-span-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColors.primaryHex}15` }}>
                <BookOpen className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              </div>
              <div className={`flex items-center text-sm font-medium ${(stats?.overview?.enrollmentGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {(stats?.overview?.enrollmentGrowth ?? 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(stats?.overview?.enrollmentGrowth ?? 0)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatNumber(stats?.overview?.totalStudents ?? 0)}
            </div>
            <div className="text-sm text-gray-600">{t('teacher_stats.total_students', 'Total Students')}</div>
            <div className="text-xs text-gray-500 mt-2">
              {stats?.overview?.recentEnrollments ?? 0} {t('teacher_stats.new_this_month', 'new this month')}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center text-sm font-medium text-green-600">
                <Activity className="h-4 w-4 mr-1" />
                {t('teacher_stats.active_label', 'Active')}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatNumber(stats?.engagement?.activeStudents ?? 0)}
            </div>
            <div className="text-sm text-gray-600">{t('teacher_stats.active_students', 'Active Students')}</div>
            <div className="text-xs text-gray-500 mt-2">
              {stats?.engagement?.weeklyEngagement ?? 0} {t('teacher_stats.engaged_this_week', 'engaged this week')}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColors.primaryHex}15` }}>
                <Target className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              </div>
              <div className={`flex items-center text-sm font-medium ${(stats?.overview?.completionGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {(stats?.overview?.completionGrowth ?? 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(stats?.overview?.completionGrowth ?? 0)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stats?.overview?.averageCompletionRate ?? 0}%
            </div>
            <div className="text-sm text-gray-600">{t('teacher_stats.avg_completion', 'Avg. Completion')}</div>
            <div className="text-xs text-gray-500 mt-2">
              {stats?.overview?.totalEnrollments ?? 0} {t('teacher_stats.completed_courses', 'completed courses')}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              {stats?.overview?.averageRating && (
                <div className="flex items-center text-sm font-medium text-yellow-600">
                  <Star className="h-4 w-4 mr-1 fill-current" />
                  {stats?.overview?.averageRating}
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stats?.overview?.averageRating || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">{t('teacher_stats.avg_rating', 'Average Rating')}</div>
            <div className="text-xs text-gray-500 mt-2">
              {stats?.overview?.totalRatings ?? 0} {t('teacher_stats.total_reviews', 'total reviews')}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="lg:col-span-2 space-y-6">
        {/* Top Performing Courses */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Award className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              {t('teacher_stats.top_courses.title', 'Top Performing Courses')}
            </h3>
          </div>
          <div className="p-6">
            {(stats?.trends?.topCourses?.length ?? 0) > 0 ? (
              <div className="space-y-4">
                {stats?.trends?.topCourses?.map((course: TeacherStats['trends']['topCourses'][0], index: number) => (
                  <div key={course.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${brandColors.primaryHex}15`, color: brandColors.primaryHex }}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{course.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{course.studentCount} {t('teacher_stats.top_courses.students', 'students')}</span>
                          <span>{course.avgCompletion}% {t('teacher_stats.top_courses.completion', 'completion')}</span>
                          {course.avgRating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span>{course.avgRating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )) ?? []}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>{t('teacher_stats.top_courses.no_data_desc', 'No courses yet. Create your first course to see performance metrics!')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              {t('teacher_stats.recent_activity.title', 'Recent Activity (30 days)')}
            </h3>
          </div>
          <div className="p-6">
            {(stats?.recentActivity?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {stats?.recentActivity?.slice(0, 8).map((activity: TeacherStats['recentActivity'][0], index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: activity.type === 'enrollment' ? `${brandColors.primaryHex}15` : '#dcfce7',
                        color: activity.type === 'enrollment' ? brandColors.primaryHex : '#16a34a'
                      }}
                    >
                      {activity.type === 'enrollment' ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description} {activity.type === 'enrollment' ? t('teacher_stats.recent_activity.enrolled_in', 'enrolled in') : t('teacher_stats.recent_activity.completed', 'completed')} {activity.courseTitle}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )) ?? []}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>{t('teacher_stats.recent_activity.no_data_desc', 'No recent activity. Student enrollments and completions will appear here.')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Stats */}
      <div className="space-y-6">
        {/* Engagement Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Play className="h-4 w-4 text-purple-600" />
              {t('teacher_stats.engagement.title', 'Engagement')}
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('teacher_stats.engagement.watch_time', 'Watch Time')}</span>
                <span className="font-semibold text-gray-900">{formatTime(stats?.engagement?.totalWatchTime ?? 0)}</span>
              </div>
              <div className="text-xs text-gray-500">{t('teacher_stats.engagement.watch_time_desc', 'Total time students spent watching')}</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('teacher_stats.engagement.lesson_completion', 'Lesson Completion')}</span>
                <span className="font-semibold text-gray-900">{stats?.engagement?.averageLessonCompletion ?? 0}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${Math.min(stats?.engagement?.averageLessonCompletion ?? 0, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;
