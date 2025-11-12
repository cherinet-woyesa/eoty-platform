import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Search, Users, Clock, Star, 
  TrendingUp, PlayCircle, Award, AlertCircle,
  Loader2, Heart, HeartOff, LogOut, Filter,
  CheckCircle, BarChart3, Calendar
} from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';

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
}

const StudentEnrolledCourses: React.FC = () => {
  const { user } = useAuth();
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
      const response = await apiClient.get('/courses');
      
      if (response.data.success) {
        setCourses(response.data.data.courses || []);
      }
    } catch (err) {
      console.error('Failed to load enrolled courses:', err);
      setError('Failed to load your courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnenroll = async (courseId: number, courseTitle: string) => {
    if (!confirm(`Are you sure you want to unenroll from "${courseTitle}"? Your progress will be saved.`)) {
      return;
    }

    try {
      await apiClient.post(`/courses/${courseId}/unenroll`);
      setCourses(courses.filter(c => c.id !== courseId));
      alert('Successfully unenrolled from course');
    } catch (err: any) {
      console.error('Failed to unenroll:', err);
      alert(err.response?.data?.message || 'Failed to unenroll. Please try again.');
    }
  };

  const handleToggleFavorite = async (courseId: number) => {
    try {
      const course = courses.find(c => c.id === courseId);
      const endpoint = course?.is_favorite ? 'unfavorite' : 'favorite';
      
      await apiClient.post(`/courses/${courseId}/${endpoint}`);
      
      setCourses(courses.map(c => 
        c.id === courseId ? { ...c, is_favorite: !c.is_favorite } : c
      ));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      alert('Failed to update favorite status');
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
      alert('Thank you for your rating!');
    } catch (err: any) {
      console.error('Failed to submit rating:', err);
      alert(err.response?.data?.message || 'Failed to submit rating');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#FFD700] mx-auto mb-4" />
            <p className="text-slate-600 text-lg">Loading your courses...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-[#EF5350] mx-auto mb-4" />
            <p className="text-slate-700 text-lg mb-4">{error}</p>
            <button 
              onClick={loadEnrolledCourses}
              className="px-4 py-2 bg-gradient-to-r from-[#FFD700]/90 to-[#FFC107]/90 text-white rounded-lg hover:from-[#FFC107] hover:to-[#FFB300] transition-all duration-200 font-semibold shadow-sm hover:shadow-md backdrop-blur-sm border border-[#FFD700]/30"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - Light beige/silver theme */}
        <div className="bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-white/70 backdrop-blur-sm border border-slate-200/50 shadow-sm">
                <BookOpen className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-700">My Enrolled Courses</h1>
                <p className="text-slate-600 text-sm mt-1">
                  Continue your learning journey • {user?.firstName} {user?.lastName}
                </p>
              </div>
            </div>
            <Link
              to="/courses"
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
            >
              <Search className="h-4 w-4 mr-2" />
              Browse More
            </Link>
          </div>
        </div>

        {/* Stats Grid - Light cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Courses', value: stats.total, icon: BookOpen, color: 'from-[#FFD700]/20 to-[#FFC107]/20', iconColor: 'text-[#FFD700]' },
            { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'from-[#FF7043]/20 to-[#FF5722]/20', iconColor: 'text-[#FF7043]' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'from-[#66BB6A]/20 to-[#4CAF50]/20', iconColor: 'text-[#66BB6A]' },
            { label: 'Favorites', value: stats.favorites, icon: Heart, color: 'from-[#EF5350]/20 to-[#E53935]/20', iconColor: 'text-[#EF5350]' },
            { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: BarChart3, color: 'from-[#42A5F5]/20 to-[#2196F3]/20', iconColor: 'text-[#42A5F5]' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white/85 backdrop-blur-sm rounded-xl p-5 border border-slate-200/40 shadow-sm hover:shadow-md transition-all duration-200">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} mb-3 inline-block`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800 mb-1">{stat.value}</p>
              <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search and Filters - Light theme */}
        <div className="bg-white/85 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search your courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700]/50 text-sm bg-slate-50/50 text-slate-700"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700]/50 bg-slate-50/50 text-slate-700 text-sm"
            >
              <option value="all">All Courses ({stats.total})</option>
              <option value="in-progress">In Progress ({stats.inProgress})</option>
              <option value="completed">Completed ({stats.completed})</option>
              <option value="favorites">Favorites ({stats.favorites})</option>
            </select>
          </div>
        </div>

        {/* Courses Grid - Light cards */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                    className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm"
                  >
                    {course.is_favorite ? (
                      <Heart className="h-5 w-5 text-[#EF5350] fill-current" />
                    ) : (
                      <HeartOff className="h-5 w-5 text-slate-600" />
                    )}
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

                  {/* Progress Bar - Light neon gradient */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-semibold text-slate-700">{Math.round(course.progress_percentage || 0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFC107] rounded-full transition-all duration-300 shadow-sm"
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

                  {/* Actions - Light neon buttons */}
                  <div className="flex gap-2 pt-4 border-t border-slate-200/50">
                    <Link
                      to={`/student/courses/${course.id}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-[#FFD700]/90 to-[#FFC107]/90 text-white rounded-lg hover:from-[#FFC107] hover:to-[#FFB300] transition-all duration-200 text-center text-sm font-semibold shadow-sm hover:shadow-md backdrop-blur-sm border border-[#FFD700]/30"
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
              to="/courses"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FFD700]/90 to-[#FFC107]/90 text-white rounded-lg hover:from-[#FFC107] hover:to-[#FFB300] transition-all duration-200 font-semibold shadow-sm hover:shadow-md backdrop-blur-sm border border-[#FFD700]/30"
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
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FFD700]/90 to-[#FFC107]/90 text-white rounded-lg hover:from-[#FFC107] hover:to-[#FFB300] disabled:opacity-50 transition-all duration-200 font-semibold shadow-sm hover:shadow-md backdrop-blur-sm border border-[#FFD700]/30"
                >
                  Submit Rating
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentEnrolledCourses;
