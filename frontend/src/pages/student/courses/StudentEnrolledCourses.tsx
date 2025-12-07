import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Search, Users, Clock, Star, 
  TrendingUp, PlayCircle, Award, AlertCircle,
  Loader2, Heart, HeartOff, LogOut, Filter,
  CheckCircle, BarChart3, Calendar, Bookmark
} from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
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

const StudentEnrolledCourses: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showRatingModal, setShowRatingModal] = useState<number | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    loadEnrolledCourses();
  }, []);

  const loadEnrolledCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/students/dashboard');
      
      if (response.data.success) {
        const rawCourses = response.data.data?.enrolledCourses || [];
        const normalized = rawCourses
          // drop unenrolled/dropped from the view
          .filter((c: any) => (c.enrollment_status || c.status || 'active') !== 'dropped')
          .map((c: any) => {
            const progress = c.progress_percentage ?? c.progress ?? 0;
            const enrollmentStatus = c.enrollment_status || c.status || (progress >= 100 ? 'completed' : 'active');
            return {
              id: c.id,
              title: c.title,
              description: c.description || '',
              cover_image: c.cover_image ?? c.coverImage ?? null,
              category: c.category || 'General',
              level: c.level || 'All levels',
              lesson_count: Number(c.lesson_count ?? c.totalLessons ?? 0),
              student_count: Number(c.student_count ?? 0),
              progress_percentage: Number(progress),
              enrollment_status: enrollmentStatus,
              enrolled_at: c.enrolled_at || '',
              last_accessed_at: c.last_accessed_at || '',
              completed_at: c.completed_at || (progress >= 100 ? new Date().toISOString() : null),
              created_by_name: c.created_by_name || '',
              user_rating: c.user_rating,
            is_favorite: Boolean(c.is_favorite ?? c.isFavorite ?? false),
            is_bookmarked: Boolean(c.is_bookmarked ?? c.isBookmarked ?? false)
            } as EnrolledCourse;
          });
        setCourses(normalized);
      }
    } catch (err) {
      console.error('Failed to load enrolled courses:', err);
      setError('Failed to load your courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnenroll = async (courseId: number, courseTitle: string) => {
    const confirmed = await confirm({
      title: 'Unenroll',
      message: `Are you sure you want to unenroll from "${courseTitle}"? Your progress will be saved.`,
      confirmText: 'Unenroll',
      cancelText: 'Keep enrolled'
    });
    if (!confirmed) return;

    try {
      await apiClient.post(`/courses/${courseId}/unenroll`);
      await loadEnrolledCourses();
      // Notify other parts of the app (catalog) to refresh enrollment badges
      window.dispatchEvent(new CustomEvent('student-enrollment-updated'));
      showNotification('success', 'Unenrolled', 'You have been unenrolled. Progress is saved.');
    } catch (err: any) {
      console.error('Failed to unenroll:', err);
      showNotification('error', 'Error', err.response?.data?.message || 'Failed to unenroll. Please try again.');
    }
  };

  const handleToggleFavorite = async (courseId: number) => {
    const target = courses.find(c => c.id === courseId);
    const currentlyFav = Boolean(target?.is_favorite);

    // Optimistic toggle for immediate UI feedback
    setCourses(prev =>
      prev.map(c => c.id === courseId ? { ...c, is_favorite: !currentlyFav } : c)
    );

    try {
      const endpoint = currentlyFav ? 'unfavorite' : 'favorite';
      const res = await apiClient.post(`/courses/${courseId}/${endpoint}`);

      // Sync with backend after request
      await loadEnrolledCourses();
      showNotification('success', 'Updated', res?.data?.message || (currentlyFav ? 'Removed from favorites' : 'Added to favorites'));
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err);
      const message = err.response?.data?.message || '';

      // If already favorited, treat as success and attempt unfavorite
      if (!currentlyFav && message.toLowerCase().includes('already in favorites')) {
        try {
          const res = await apiClient.post(`/courses/${courseId}/unfavorite`);
          await loadEnrolledCourses();
          showNotification('success', 'Updated', res?.data?.message || 'Removed from favorites');
          return;
        } catch (e) {
          console.error('Fallback unfavorite failed:', e);
        }
      }

      // Revert optimistic change on failure
      setCourses(prev =>
        prev.map(c => c.id === courseId ? { ...c, is_favorite: currentlyFav } : c)
      );
      await loadEnrolledCourses();
      showNotification('error', 'Error', message || 'Failed to update favorite status');
    }
  };

  const handleToggleBookmark = async (courseId: number) => {
    // Optimistic toggle
    setCourses(prev =>
      prev.map(c => c.id === courseId ? { ...c, is_bookmarked: !c.is_bookmarked } : c)
    );
    try {
      await apiClient.post('/bookmarks/toggle', {
        entityType: 'course',
        entityId: courseId
      });
      await loadEnrolledCourses();
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      // Revert on error
      setCourses(prev =>
        prev.map(c => c.id === courseId ? { ...c, is_bookmarked: !c.is_bookmarked } : c)
      );
      showNotification('error', 'Error', 'Failed to update bookmark. Please try again.');
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
      showNotification('success', 'Thank you', 'Thank you for your rating!');
    } catch (err: any) {
      console.error('Failed to submit rating:', err);
      showNotification('error', 'Error', err.response?.data?.message || 'Failed to submit rating');
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'in-progress' && course.enrollment_status === 'active' && !course.completed_at) ||
                         (filterStatus === 'completed' && course.completed_at) ||
                         (filterStatus === 'favorites' && course.is_favorite);
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: courses.length,
    inProgress: courses.filter(c => c.enrollment_status === 'active' && !c.completed_at).length,
    completed: courses.filter(c => c.completed_at).length,
    favorites: courses.filter(c => c.is_favorite).length,
    avgProgress: Math.round(courses.reduce((sum, c) => sum + (c.progress_percentage || 0), 0) / (courses.length || 1))
  };

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-[#EF5350] mx-auto mb-3" />
            <p className="text-stone-700 text-sm mb-3">{error}</p>
            <button
              onClick={loadEnrolledCourses}
              className="px-3 py-1.5 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors font-medium text-xs shadow-sm"
            >
              Try Again
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
            { label: 'Total Courses', value: stats.total, icon: BookOpen, color: 'from-[#27AE60]/15 to-[#16A085]/10', iconColor: 'text-[#27AE60]' },
            { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'from-[#16A085]/15 to-[#27AE60]/10', iconColor: 'text-[#16A085]' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'from-[#2980B9]/15 to-[#16A085]/10', iconColor: 'text-[#2980B9]' },
            { label: 'Favorites', value: stats.favorites, icon: Heart, color: 'from-[#E74C3C]/15 to-[#E67E22]/10', iconColor: 'text-[#E74C3C]' },
            { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: BarChart3, color: 'from-[#2980B9]/15 to-[#34495E]/10', iconColor: 'text-[#2980B9]' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-stone-200 shadow-sm hover:shadow-md transition-all hover:border-[#27AE60]/40">
              <div className="flex items-center justify-between mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#27AE60]/15 to-[#16A085]/15 rounded-md blur-md"></div>
                  <div className="relative p-1.5 bg-gradient-to-br from-[#27AE60]/8 to-[#16A085]/8 rounded-md border border-[#27AE60]/25">
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

        {/* Search and Filters */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-stone-200 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search your courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 text-sm bg-stone-50/50 text-stone-700"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 bg-stone-50/50 text-stone-700 text-sm"
            >
              <option value="all">All Courses ({stats.total})</option>
              <option value="in-progress">In Progress ({stats.inProgress})</option>
              <option value="completed">Completed ({stats.completed})</option>
              <option value="favorites">Favorites ({stats.favorites})</option>
            </select>
          </div>
        </div>

        {/* Courses Grid - Light cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/40 shadow-sm overflow-hidden p-5 animate-pulse space-y-4">
                <div className="h-32 bg-slate-200 rounded-md" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-3 bg-slate-200 rounded w-5/6" />
                <div className="h-2 bg-slate-200 rounded w-full" />
                <div className="flex gap-2">
                  <div className="h-8 bg-slate-200 rounded w-20" />
                  <div className="h-8 bg-slate-200 rounded w-20" />
                  <div className="h-8 bg-slate-200 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCourses.map(course => (
              <div key={course.id} className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/40 shadow-sm hover:shadow-md hover:border-slate-300/50 transition-all duration-200 overflow-hidden">
                {/* Course Header */}
                <div className="relative">
                  {course.cover_image ? (
                    <img src={course.cover_image} alt={course.title} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-slate-400" />
                    </div>
                  )}
                  <button
                    onClick={() => handleToggleFavorite(course.id)}
                    className="absolute top-2 right-2 p-2 bg-black/20 backdrop-blur-sm rounded-full hover:bg-black/30 transition-colors shadow-sm border border-white/30"
                  >
                    <Heart
                      className={`h-5 w-5 ${course.is_favorite ? 'text-[#EF5350] fill-current' : 'text-white stroke-[2px]'}`}
                    />
                  </button>
                  <button
                    onClick={() => handleToggleBookmark(course.id)}
                    className="absolute top-2 left-2 p-2 bg-black/20 backdrop-blur-sm rounded-full hover:bg-black/30 transition-colors shadow-sm border border-white/30"
                    title={course.is_bookmarked ? 'Remove bookmark' : 'Add bookmark'}
                  >
                    <Bookmark
                      className={`h-5 w-5 ${course.is_bookmarked ? 'text-amber-400 fill-current' : 'text-white stroke-[2px]'}`}
                    />
                  </button>
                  {course.completed_at && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-[#66BB6A]/90 to-[#4CAF50]/90 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border border-[#66BB6A]/30 shadow-sm">
                      <CheckCircle className="h-3 w-3 inline mr-1" />
                      Completed
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-700 mb-2 line-clamp-2">{course.title}</h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{course.description}</p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-semibold text-slate-700">{Math.round(course.progress_percentage || 0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${course.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-1">
                      <PlayCircle className="h-4 w-4" />
                      <span>{course.lesson_count} lessons</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.student_count} students</span>
                    </div>
                  </div>

                  {/* Rating */}
                  {course.user_rating ? (
                    <div className="flex items-center gap-1 mb-4">
                      <span className="text-sm text-slate-600">Your rating:</span>
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
                      className="text-sm text-[#FFD700] hover:text-[#FFC107] mb-4 flex items-center gap-1 transition-colors"
                    >
                      <Star className="h-4 w-4" />
                      Rate this course
                    </button>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-slate-200/50">
                    <Link
                      to={`/student/courses/${course.id}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 rounded-lg transition-all duration-200 text-center text-sm font-semibold shadow-md hover:shadow-lg backdrop-blur-sm border border-[#27AE60]/30"
                    >
                      {course.progress_percentage > 0 ? (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Continue
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Start Learning
                        </>
                      )}
                    </Link>
                    <button
                      onClick={() => handleUnenroll(course.id, course.title)}
                      className="p-2.5 border border-slate-300/50 text-slate-600 rounded-lg hover:bg-slate-50/50 transition-colors"
                      title="Unenroll from course"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/40 p-12 text-center shadow-sm">
            <BookOpen className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No courses found</h3>
            <p className="text-slate-600 mb-6">
              {courses.length === 0 
                ? "You haven't enrolled in any courses yet. Browse the catalog to get started!"
                : "No courses match your current filters. Try adjusting your search."
              }
            </p>
            <Link
              to="/student/browse-courses"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg backdrop-blur-sm border border-[#27AE60]/30"
            >
              Browse Course Catalog
            </Link>
          </div>
        )}

        {/* Rating Modal - Light theme */}
        {showRatingModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 max-w-md w-full border border-slate-200/50 shadow-xl">
              <h3 className="text-xl font-bold text-slate-700 mb-4">Rate this course</h3>
              
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
                placeholder="Write a review (optional)"
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
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRating}
                  disabled={ratingValue === 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 disabled:opacity-50 transition-all duration-200 font-semibold shadow-sm hover:shadow-md backdrop-blur-sm border border-[#27AE60]/30"
                >
                  Submit Rating
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
   
  );
};

export default StudentEnrolledCourses;
