import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Plus, Search, Video, Users, Clock, 
  TrendingUp, Eye, Edit3,
  PlayCircle, Calendar, Zap,
  Loader2, AlertCircle, RefreshCw, Grid, List,
  SortAsc, SortDesc
} from 'lucide-react';
import { coursesApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { BulkActions } from '@/components/shared/courses/BulkActions';
import type { Course } from '@/types/courses';
import { dataCache } from '@/hooks/useRealTimeData';

interface CourseStats {
  totalCourses: number;
  activeStudents: number;
  recordedVideos: number;
  hoursTaught: number;
  publishedCourses: number;
  averageRating: number;
  completionRate: number;
}

const MyCourses: React.FC = () => {
  // const { t } = useTranslation();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'chapter_admin' || user?.role === 'admin';
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('all');
  // const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // Memoize categories and sort options to prevent re-creation on each render
  const categories = useMemo(() => [
    { value: 'all', label: 'All Categories', count: 0 },
    { value: 'faith', label: 'Faith & Doctrine', count: 0 },
    { value: 'history', label: 'Church History', count: 0 },
    { value: 'spiritual', label: 'Spiritual Development', count: 0 },
    { value: 'bible', label: 'Bible Study', count: 0 },
    { value: 'liturgical', label: 'Liturgical Studies', count: 0 },
    { value: 'youth', label: 'Youth Ministry', count: 0 }
  ], []);

  const sortOptions = useMemo(() => [
    { value: 'created_at', label: 'Date Created' },
    { value: 'updated_at', label: 'Last Updated' },
    { value: 'title', label: 'Course Title' },
    { value: 'lesson_count', label: 'Number of Lessons' },
    { value: 'student_count', label: 'Number of Students' },
    { value: 'total_duration', label: 'Total Duration' }
  ], []);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await coursesApi.getCourses();
      
      if (response.success) {
        const coursesData = response.data.courses || [];
        console.log('MyCourses - fetched courses:', coursesData.map(course => ({
          id: course.id,
          title: course.title,
          cover_image: course.cover_image,
          hasCoverImage: !!course.cover_image
        })));
        setCourses(coursesData);
        setLastUpdated(new Date());
        
        // Calculate stats
        const courseStats: CourseStats = {
          totalCourses: coursesData.length,
          activeStudents: coursesData.reduce((sum: number, course: Course) => sum + (course.student_count || 0), 0),
          recordedVideos: coursesData.reduce((sum: number, course: Course) => sum + (course.lesson_count || 0), 0),
          hoursTaught: Math.round(coursesData.reduce((sum: number, course: Course) => sum + (course.total_duration || 0), 0) / 60),
          publishedCourses: coursesData.filter((course: Course) => course.is_published).length,
          averageRating: 4.8, // Mock data - would come from ratings system
          completionRate: 87 // Mock data - would come from progress tracking
        };
        
        setStats(courseStats);
        
        // Update category counts
        categories.forEach(category => {
          if (category.value !== 'all') {
            category.count = coursesData.filter((course: Course) => course.category === category.value).length;
          } else {
            category.count = coursesData.length;
          }
        });
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [categories]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Memoize filtered and sorted courses to prevent unnecessary re-calculations
  const filteredAndSortedCourses = useMemo(() => {
    return courses
      .filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             course.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
        const matchesTab = activeTab === 'all' ||
                           (activeTab === 'published' && course.is_published) ||
                           (activeTab === 'drafts' && !course.is_published);
        return matchesSearch && matchesCategory && matchesTab;
      })
      .sort((a, b) => {
        let aValue: any = a[sortBy as keyof Course];
        let bValue: any = b[sortBy as keyof Course];
        
        if (sortBy === 'created_at' || sortBy === 'updated_at') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [courses, searchTerm, filterCategory, activeTab, sortBy, sortOrder]);

  const getCategoryColor = useCallback((category: string) => {
    const colors: { [key: string]: string } = {
      faith: 'from-blue-500 to-blue-600',
      history: 'from-purple-500 to-purple-600',
      spiritual: 'from-green-500 to-green-600',
      bible: 'from-orange-500 to-orange-600',
      liturgical: 'from-red-500 to-red-600',
      youth: 'from-pink-500 to-pink-600'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  }, []);

  const formatDuration = useCallback((minutes: number) => {
    if (!minutes) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, []);

  const getTimeAgo = useCallback((date: string | Date) => {
    const now = new Date();
    const courseDate = typeof date === 'string' ? new Date(date) : date;
    const diffInHours = Math.floor((now.getTime() - courseDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return courseDate.toLocaleDateString();
  }, []);

  // Memoize compact course rendering to prevent unnecessary re-renders
  const renderCourseCard = useCallback((course: Course) => (
    <div key={course.id} className={`relative ${viewMode === 'grid'
      ? "bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 overflow-hidden hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 hover:border-[#27AE60]/50"
      : "bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-2 hover:shadow-md transition-all duration-200 hover:border-[#27AE60]/50"
    } ${selectedCourses.includes(course.id) ? 'ring-1 ring-[#27AE60] bg-gradient-to-br from-[#27AE60]/10 to-[#16A085]/10' : ''}`}>
      {/* Selection Checkbox */}
      <div className="absolute top-1.5 left-1.5 z-10">
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
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
        />
      </div>
      {viewMode === 'grid' ? (
        // Compact Grid View
        <>
          {course.cover_image && (
            <img
              src={course.cover_image}
              alt={`Cover for ${course.title}`}
              className="w-full h-24 object-cover mb-3 rounded-t-lg"
            />
          )}
          {/* Course Header */}
          <div className={`bg-gradient-to-r from-[#27AE60]/20 via-[#16A085]/20 to-[#2980B9]/20 p-3 border-b border-[#27AE60]/30`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-stone-800 mb-0.5 line-clamp-2">{course.title}</h3>
                <p className="text-stone-600 text-xs line-clamp-2">
                  {course.description || 'No description provided'}
                </p>
              </div>
              <div className="flex space-x-0.5 ml-2">
                <Link
                  to={`/teacher/courses/${course.id}`}
                  className="p-1.5 bg-white/90 hover:bg-white border border-stone-200 hover:border-[#27AE60]/50 rounded transition-all text-stone-700 hover:text-[#27AE60]"
                  title="View Course"
                >
                  <Eye className="h-3 w-3" />
                </Link>
                <Link
                  to={`/teacher/courses/${course.id}/edit`}
                  className="p-1.5 bg-white/90 hover:bg-white border border-stone-200 hover:border-[#16A085]/50 rounded transition-all text-stone-700 hover:text-[#16A085]"
                  title="Edit Course"
                >
                  <Edit3 className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Compact Course Stats */}
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div className="bg-gradient-to-br from-[#27AE60]/10 to-[#16A085]/10 rounded p-2 border border-[#27AE60]/30">
                <Video className="h-3 w-3 text-[#27AE60] mx-auto mb-0.5" />
                <div className="text-sm font-bold text-stone-800">{course.lesson_count}</div>
                <div className="text-[10px] text-stone-600">Lessons</div>
              </div>
              <div className="bg-gradient-to-br from-[#16A085]/10 to-[#2980B9]/10 rounded p-2 border border-[#16A085]/30">
                <Users className="h-3 w-3 text-[#16A085] mx-auto mb-0.5" />
                <div className="text-sm font-bold text-stone-800">{course.student_count}</div>
                <div className="text-[10px] text-stone-600">Students</div>
              </div>
              <div className="bg-gradient-to-br from-[#2980B9]/10 to-[#27AE60]/10 rounded p-2 border border-[#2980B9]/30">
                <Clock className="h-3 w-3 text-[#2980B9] mx-auto mb-0.5" />
                <div className="text-sm font-bold text-stone-800">{formatDuration(course.total_duration || 0)}</div>
                <div className="text-[10px] text-stone-600">Duration</div>
              </div>
            </div>

            {/* Compact Course Metadata */}
            <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
              <span className="capitalize bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                {course.level || 'Beginner'}
              </span>
              <span className="text-gray-500 text-[10px]">
                {getTimeAgo(course.created_at)}
              </span>
            </div>

            {/* Compact Action Buttons */}
            <div className="flex space-x-1.5">
              <Link
                to={`/teacher/courses/${course.id}`}
                className="flex-1 inline-flex items-center justify-center px-2.5 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-xs font-semibold rounded transition-all shadow-sm hover:shadow-md"
              >
                <PlayCircle className="mr-1 h-3 w-3" />
                View
              </Link>
              <Link
                to={`/teacher/record?course=${course.id}`}
                className="inline-flex items-center px-2.5 py-1.5 border border-stone-200 hover:border-[#27AE60]/50 text-xs font-medium rounded text-stone-700 bg-white/90 hover:bg-white transition-all"
                title="Add Lesson"
              >
                <Video className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </>
      ) : (
        // List View
        <div className="flex items-center space-x-4">
          {course.cover_image ? (
            <img 
              src={course.cover_image} 
              alt={`Cover for ${course.title}`}
              className="w-16 h-16 object-cover rounded-lg"
            />
          ) : (
            <div className={`w-16 h-16 bg-gradient-to-r ${getCategoryColor(course.category)} rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
              {course.title.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{course.title}</h3>
            <p className="text-sm text-gray-500 truncate">{course.description || 'No description'}</p>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Video className="h-3 w-3" />
                <span>{course.lesson_count} lessons</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{course.student_count} students</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(course.total_duration || 0)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              to={`/teacher/courses/${course.id}`}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Eye className="h-4 w-4" />
            </Link>
            <Link
              to={`/teacher/courses/${course.id}/edit`}
              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
            >
              <Edit3 className="h-4 w-4" />
            </Link>
            <Link
              to={`/teacher/record?course=${course.id}`}
              className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
            >
              <Video className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  ), [viewMode, selectedCourses, getCategoryColor, formatDuration, getTimeAgo]);

  const handleDeleteCourse = useCallback(async (courseId: number) => {
    try {
      await coursesApi.deleteCourse(courseId.toString());
      
      // Remove the deleted course from the state
      setCourses(prevCourses => prevCourses.filter(course => course.id !== courseId));
      
      // Clear the teacher dashboard cache to force a refresh of course counts
      dataCache.delete('teacher_dashboard');
      
      // Show success message
      // You might want to add a toast notification here
    } catch (error) {
      console.error('Failed to delete course:', error);
      // Show error message
      // You might want to add a toast notification here
    }
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-2 p-2">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#27AE60] mx-auto mb-2" />
            <p className="text-stone-600 text-sm">Loading your courses...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-2 p-2">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center bg-white/90 backdrop-blur-md rounded-lg p-6 border border-red-200 shadow-sm">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button
              onClick={loadCourses}
              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg hover:shadow-md transition-all font-medium text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 p-2">
      {/* Compact Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { 
              name: 'Total Courses', 
              value: stats.totalCourses.toString(), 
              icon: BookOpen, 
              change: 2, 
              changeType: 'positive',
              color: 'from-blue-500 to-blue-600',
              bgColor: 'from-blue-50 to-blue-100'
            },
            { 
              name: 'Active Students', 
              value: stats.activeStudents.toString(), 
              icon: Users, 
              change: 8, 
              changeType: 'positive',
              color: 'from-green-500 to-green-600',
              bgColor: 'from-green-50 to-green-100'
            },
            { 
              name: 'Recorded Videos', 
              value: stats.recordedVideos.toString(), 
              icon: Video, 
              change: 12, 
              changeType: 'positive',
              color: 'from-purple-500 to-purple-600',
              bgColor: 'from-purple-50 to-purple-100'
            },
            { 
              name: 'Hours Taught', 
              value: stats.hoursTaught.toString(), 
              icon: Clock, 
              change: 15, 
              changeType: 'positive',
              color: 'from-orange-500 to-orange-600',
              bgColor: 'from-orange-50 to-orange-100'
            }
          ].map((stat, index) => {
            const neonColors = [
              { icon: 'text-[#27AE60]', bg: 'from-[#27AE60]/10 to-[#16A085]/10', border: 'border-[#27AE60]/30' },
              { icon: 'text-[#16A085]', bg: 'from-[#16A085]/10 to-[#2980B9]/10', border: 'border-[#16A085]/30' },
              { icon: 'text-[#2980B9]', bg: 'from-[#2980B9]/10 to-[#27AE60]/10', border: 'border-[#2980B9]/30' },
              { icon: 'text-[#F39C12]', bg: 'from-[#F39C12]/10 to-[#FFA500]/10', border: 'border-[#F39C12]/30' }
            ];
            const colors = neonColors[index % neonColors.length];
            return (
              <div key={index} className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 shadow-sm hover:shadow-md transition-all p-4 hover:border-[#27AE60]/50">
                <div className={`bg-gradient-to-br ${colors.bg} rounded-lg p-2 border ${colors.border} mb-3`}>
                  <stat.icon className={`h-5 w-5 ${colors.icon}`} />
                </div>
                <p className="text-xs text-stone-600 mb-0.5 font-medium">{stat.name}</p>
                <p className="text-xl font-bold text-stone-800">{stat.value}</p>
                <p className={`text-xs mt-1.5 flex items-center ${(stat.change || 0) >= 0 ? 'text-[#27AE60]' : 'text-red-500'}`}>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {(stat.change || 0) >= 0 ? '+' : ''}{stat.change}%
                </p>
              </div>
            );
          })}
          </div>
        )}

        {/* Compact Search and Filter Section */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-4 border border-stone-200 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Category Filter */}
              <div className="sm:w-44">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label} ({category.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="sm:w-36">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-5 w-5" /> : <SortDesc className="h-5 w-5" />}
              </button>

              {/* View Mode */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Selection Controls and Quick Features */}
        {filteredAndSortedCourses.length > 0 && (
          <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedCourses.length === filteredAndSortedCourses.length && filteredAndSortedCourses.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCourses(filteredAndSortedCourses.map(c => c.id));
                      } else {
                        setSelectedCourses([]);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    {selectedCourses.length > 0 
                      ? `${selectedCourses.length} selected` 
                      : 'Select all'
                    }
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Templates
                </button>
                <Link
                  to="/teacher/courses/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Course
                </Link>
              </div>
            </div>

            {/* Course Templates Panel */}
            {showTemplates && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-base font-semibold text-gray-900 mb-3">Course Templates</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: 'Bible Study', category: 'bible', icon: BookOpen },
                    { name: 'Church History', category: 'history', icon: Calendar },
                    { name: 'Spiritual Growth', category: 'spiritual', icon: Zap },
                    { name: 'Youth Ministry', category: 'youth', icon: Users }
                  ].map((template, index) => (
                    <button
                      key={index}
                      className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                    >
                      <template.icon className="h-5 w-5 text-blue-600 mb-2" />
                      <div className="text-sm font-medium text-gray-900">{template.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{template.category}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      {/* Tabs for filtering */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('all')}
            className={`${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            All Courses
          </button>
          <button
            onClick={() => setActiveTab('published')}
            className={`${
              activeTab === 'published'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Published
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`${
              activeTab === 'drafts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Drafts
          </button>
        </nav>
      </div>

        {/* Courses Display */}
        {filteredAndSortedCourses.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" 
            : "space-y-4 sm:space-y-6"
          }>
          {filteredAndSortedCourses.map(renderCourseCard)}
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-8 text-center shadow-md">
            <BookOpen className="h-12 w-12 text-stone-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-stone-800 mb-2">
              {courses.length === 0 ? 'No courses yet' : 'No courses found'}
            </h3>
            <p className="text-stone-600 mb-6 max-w-lg mx-auto">
              {courses.length === 0 
                ? 'Create your first course to start teaching and sharing knowledge with your students.'
                : 'Try adjusting your search or filter criteria to find what you\'re looking for.'
              }
            </p>
            <Link
              to="/teacher/courses/new"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Course
            </Link>
          </div>
        )}

      {/* Bulk Actions Floating Bar */}
      <BulkActions
        selectedCourses={selectedCourses}
        courses={courses}
        onActionComplete={loadCourses}
        onClearSelection={() => setSelectedCourses([])}
      />
    </div>
  );
};

export default React.memo(MyCourses);