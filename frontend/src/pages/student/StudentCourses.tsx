import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Search, PlayCircle, Clock, 
  TrendingUp, CheckCircle, Loader2, AlertCircle, 
  RefreshCw, Grid, List, Target, Award, Zap
} from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';

interface EnrolledCourse {
  id: number;
  title: string;
  description: string;
  coverImage: string | null;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  status: string;
  category?: string;
  level?: string;
}

interface StudentCoursesData {
  progress: {
    totalCourses: number;
    completedCourses: number;
    totalLessons: number;
    completedLessons: number;
    studyStreak: number;
    totalPoints: number;
  };
  enrolledCourses: EnrolledCourse[];
}

// Memoized components
const LoadingSpinner = React.memo(() => (
  <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Loading your courses...</p>
      </div>
    </div>
  </div>
));

const ErrorDisplay = React.memo(({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 text-lg mb-4">{error}</p>
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
));

const StudentCourses: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<StudentCoursesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'completed'>('all');

  // Load courses with useCallback
  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/students/dashboard');
      
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError('Failed to load your courses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Memoized filtered courses
  const filteredCourses = useMemo(() => {
    return data?.enrolledCourses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           course.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (filterStatus === 'in-progress') {
        matchesStatus = course.progress > 0 && course.progress < 100;
      } else if (filterStatus === 'completed') {
        matchesStatus = course.progress === 100;
      }
      
      return matchesSearch && matchesStatus;
    }) || [];
  }, [data?.enrolledCourses, searchTerm, filterStatus]);

  // Memoized category color function
  const getCategoryColor = useCallback((category?: string) => {
    const colors: { [key: string]: string } = {
      faith: 'from-blue-500 to-blue-600',
      history: 'from-purple-500 to-purple-600',
      spiritual: 'from-green-500 to-green-600',
      bible: 'from-orange-500 to-orange-600',
      liturgical: 'from-red-500 to-red-600',
      youth: 'from-pink-500 to-pink-600'
    };
    return colors[category || ''] || 'from-gray-500 to-gray-600';
  }, []);

  // Memoized stats
  const stats = useMemo(() => {
    if (!data) return [];
    return [
      { 
        name: 'Enrolled Courses', 
        value: data.progress.totalCourses.toString(), 
        icon: BookOpen, 
        color: 'from-blue-500 to-blue-600',
        bgColor: 'from-blue-50 to-blue-100'
      },
      { 
        name: 'Completed Lessons', 
        value: data.progress.completedLessons.toString(), 
        icon: CheckCircle, 
        color: 'from-green-500 to-green-600',
        bgColor: 'from-green-50 to-green-100'
      },
      { 
        name: 'Study Streak', 
        value: `${data.progress.studyStreak} days`, 
        icon: Zap, 
        color: 'from-purple-500 to-purple-600',
        bgColor: 'from-purple-50 to-purple-100'
      },
      { 
        name: 'Total Points', 
        value: data.progress.totalPoints.toString(), 
        icon: Award, 
        color: 'from-orange-500 to-orange-600',
        bgColor: 'from-orange-50 to-orange-100'
      }
    ];
  }, [data]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={loadCourses} />;
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">My Learning</h1>
            <p className="text-blue-100 text-sm sm:text-base">
              Continue your learning journey, {user?.firstName}!
            </p>
            <p className="text-blue-200 text-xs sm:text-sm mt-1">
              {data?.progress.totalCourses || 0} courses enrolled • {data?.progress.completedLessons || 0} lessons completed
            </p>
          </div>
          <div className="mt-4 lg:mt-0">
            <button
              onClick={loadCourses}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, index) => (
            <div key={index} className={`bg-gradient-to-br ${stat.bgColor} rounded-xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} shadow-sm`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">{stat.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search your courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Courses</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Display */}
      {filteredCourses.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" 
          : "space-y-4"
        }>
          {filteredCourses.map(course => (
            <div key={course.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
              {viewMode === 'grid' ? (
                <>
                  {/* Course Header */}
                  <div className={`bg-gradient-to-r ${getCategoryColor(course.category)} p-4 text-white relative`}>
                    <h3 className="text-lg font-bold mb-1 line-clamp-2">{course.title}</h3>
                    <p className="text-blue-100 text-sm line-clamp-2 opacity-90">
                      {course.description || 'No description provided'}
                    </p>
                    {course.progress === 100 && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </div>
                    )}
                  </div>

                  {/* Course Progress */}
                  <div className="p-4">
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-bold text-gray-900">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <Target className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-gray-900">{course.completedLessons}/{course.totalLessons}</div>
                        <div className="text-xs text-gray-500">Lessons</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <Clock className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-gray-900">{course.level || 'Beginner'}</div>
                        <div className="text-xs text-gray-500">Level</div>
                      </div>
                    </div>

                    <Link
                      to={`/courses/${course.id}`}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      {course.progress === 0 ? 'Start Learning' : course.progress === 100 ? 'Review' : 'Continue'}
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex items-center p-4 space-x-4">
                  <div className={`w-20 h-20 bg-gradient-to-r ${getCategoryColor(course.category)} rounded-lg flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}>
                    {course.title.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{course.title}</h3>
                    <p className="text-sm text-gray-500 truncate">{course.description || 'No description'}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Target className="h-4 w-4" />
                        <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <TrendingUp className="h-4 w-4" />
                        <span>{course.progress}% complete</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/courses/${course.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    Continue
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {data?.enrolledCourses.length === 0 ? 'No courses enrolled yet' : 'No courses found'}
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {data?.enrolledCourses.length === 0 
              ? 'Start your learning journey by enrolling in a course.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(StudentCourses);