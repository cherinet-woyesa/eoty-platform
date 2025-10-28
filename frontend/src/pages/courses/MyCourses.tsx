import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Plus, Search, Video, Users, Clock, 
  TrendingUp, Eye, Edit3, Trash2,
  PlayCircle, BarChart3, Calendar, Zap,
  Loader2, AlertCircle, RefreshCw, Grid, List,
  SortAsc, SortDesc, CheckCircle
} from 'lucide-react';
import { coursesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  level: string;
  created_at: string;
  updated_at: string;
  lesson_count: number;
  student_count: number;
  total_duration: number;
  is_published: boolean;
  published_at?: string;
}

interface CourseStats {
  totalCourses: number;
  totalLessons: number;
  totalStudents: number;
  totalHours: number;
  publishedCourses: number;
  averageRating: number;
  completionRate: number;
}

const MyCourses: React.FC = () => {
  // const { t } = useTranslation();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories', count: 0 },
    { value: 'faith', label: 'Faith & Doctrine', count: 0 },
    { value: 'history', label: 'Church History', count: 0 },
    { value: 'spiritual', label: 'Spiritual Development', count: 0 },
    { value: 'bible', label: 'Bible Study', count: 0 },
    { value: 'liturgical', label: 'Liturgical Studies', count: 0 },
    { value: 'youth', label: 'Youth Ministry', count: 0 }
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Date Created' },
    { value: 'updated_at', label: 'Last Updated' },
    { value: 'title', label: 'Course Title' },
    { value: 'lesson_count', label: 'Number of Lessons' },
    { value: 'student_count', label: 'Number of Students' },
    { value: 'total_duration', label: 'Total Duration' }
  ];

  useEffect(() => {
    loadCourses();
  }, []);

    const loadCourses = async () => {
      try {
      setLoading(true);
      setError(null);
      
        const response = await coursesApi.getCourses();
      
      if (response.success) {
        const coursesData = response.data.courses || [];
        setCourses(coursesData);
        setLastUpdated(new Date());
        
        // Calculate stats
        const courseStats: CourseStats = {
          totalCourses: coursesData.length,
          totalLessons: coursesData.reduce((sum: number, course: Course) => sum + course.lesson_count, 0),
          totalStudents: coursesData.reduce((sum: number, course: Course) => sum + course.student_count, 0),
          totalHours: Math.round(coursesData.reduce((sum: number, course: Course) => sum + (course.total_duration || 0), 0) / 60),
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
    };

  const filteredAndSortedCourses = courses
    .filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
    return matchesSearch && matchesCategory;
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

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      faith: 'from-blue-500 to-blue-600',
      history: 'from-purple-500 to-purple-600',
      spiritual: 'from-green-500 to-green-600',
      bible: 'from-orange-500 to-orange-600',
      liturgical: 'from-red-500 to-red-600',
      youth: 'from-pink-500 to-pink-600'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const courseDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - courseDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return courseDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Loading your courses...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <button 
              onClick={loadCourses}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header Section - Compact */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-3 sm:p-4 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-lg sm:text-xl font-bold">My Courses</h1>
              <div className="hidden sm:flex items-center space-x-1 text-blue-100">
                <Clock className="h-3 w-3" />
                <span className="text-xs">Updated {getTimeAgo(lastUpdated.toISOString())}</span>
              </div>
            </div>
            <p className="text-blue-100 text-xs sm:text-sm">
              Manage and organize your teaching content
            </p>
            <p className="text-blue-200 text-xs mt-1">
              {user?.firstName} {user?.lastName} • {stats?.totalCourses || 0} courses created
            </p>
          </div>
          <div className="mt-3 lg:mt-0 lg:ml-4">
            <div className="flex flex-col sm:flex-row gap-1.5">
            <button
                onClick={loadCourses}
              disabled={loading}
                className="inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
            </button>
            <Link
              to="/courses/new"
                className="inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
            >
                <Plus className="h-3 w-3 mr-1.5" />
                New Course
            </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Compact */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[
            { 
              name: 'Total Courses', 
              value: stats.totalCourses.toString(), 
              icon: BookOpen, 
              change: '+2', 
              changeType: 'positive',
              color: 'from-blue-500 to-blue-600',
              bgColor: 'from-blue-50 to-blue-100'
            },
            { 
              name: 'Total Lessons', 
              value: stats.totalLessons.toString(), 
              icon: Video, 
              change: '+8', 
              changeType: 'positive',
              color: 'from-green-500 to-green-600',
              bgColor: 'from-green-50 to-green-100'
            },
            { 
              name: 'Total Students', 
              value: stats.totalStudents.toString(), 
              icon: Users, 
              change: '+12', 
              changeType: 'positive',
              color: 'from-purple-500 to-purple-600',
              bgColor: 'from-purple-50 to-purple-100'
            },
            { 
              name: 'Hours Content', 
              value: stats.totalHours.toString(), 
              icon: Clock, 
              change: '+15', 
              changeType: 'positive',
              color: 'from-orange-500 to-orange-600',
              bgColor: 'from-orange-50 to-orange-100'
            }
          ].map((stat, index) => (
            <div key={index} className={`bg-gradient-to-br ${stat.bgColor} rounded-lg p-2.5 sm:p-3 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className={`p-1.5 rounded-md bg-gradient-to-r ${stat.color} shadow-sm`}>
                  <stat.icon className="h-3 w-3 text-white" />
            </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-2.5 w-2.5 text-green-600" />
                    <span className="text-xs font-medium text-green-700">{stat.change}</span>
            </div>
          </div>
            </div>
            <div>
                <p className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5">{stat.value}</p>
                <p className="text-xs text-gray-600 font-medium">{stat.name}</p>
        </div>
            </div>
          ))}
        </div>
      )}

      {/* Search and Filter Section - Compact */}
      <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
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
            <div className="sm:w-40">
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
            <div className="sm:w-32">
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
              className="px-2.5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />}
            </button>

            {/* View Mode */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions and Quick Features */}
      {filteredAndSortedCourses.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedCourses.length === filteredAndSortedCourses.length}
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
                    : 'Select courses'
                  }
                </span>
              </div>
              
              {selectedCourses.length > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Bulk Actions
                  </button>
                  <button
                    onClick={() => setSelectedCourses([])}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus className="h-3 w-3 mr-1" />
                Templates
              </button>
              <Link
                to="/courses/new"
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3 w-3 mr-1" />
                New Course
              </Link>
            </div>
          </div>

          {/* Bulk Actions Panel */}
          {showBulkActions && selectedCourses.length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Publish Selected
                </button>
                <button className="px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded-md hover:bg-yellow-700 transition-colors">
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit Selected
                </button>
                <button className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Analytics
                </button>
                <button className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          {/* Course Templates Panel */}
          {showTemplates && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Course Templates</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { name: 'Bible Study', category: 'bible', icon: BookOpen },
                  { name: 'Church History', category: 'history', icon: Calendar },
                  { name: 'Spiritual Growth', category: 'spiritual', icon: Zap },
                  { name: 'Youth Ministry', category: 'youth', icon: Users }
                ].map((template, index) => (
                  <button
                    key={index}
                    className="p-2 bg-white rounded-md border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <template.icon className="h-4 w-4 text-blue-600 mb-1" />
                    <div className="text-xs font-medium text-gray-900">{template.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{template.category}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats Bar */}
      {stats && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Published: {stats.publishedCourses}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">Drafts: {stats.totalCourses - stats.publishedCourses}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Avg. Rating: {stats.averageRating}/5</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Last updated: {getTimeAgo(lastUpdated.toISOString())}
            </div>
          </div>
        </div>
      )}

      {/* Courses Display */}
      {filteredAndSortedCourses.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4" 
          : "space-y-3"
        }>
          {filteredAndSortedCourses.map(course => (
            <div key={course.id} className={`relative ${viewMode === 'grid' 
              ? "bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
              : "bg-white rounded-lg border border-gray-200 p-3 hover:shadow-lg transition-all duration-200"
            } ${selectedCourses.includes(course.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
              {/* Selection Checkbox */}
              <div className="absolute top-2 left-2 z-10">
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
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              {viewMode === 'grid' ? (
                // Grid View
                <>
                  {/* Course Header */}
                  <div className={`bg-gradient-to-r ${getCategoryColor(course.category)} p-4 text-white`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1 line-clamp-2">{course.title}</h3>
                        <p className="text-blue-100 text-sm line-clamp-2 opacity-90">
                          {course.description || 'No description provided'}
                        </p>
                      </div>
                      <div className="flex space-x-1 ml-3">
                        <Link
                          to={`/courses/${course.id}`}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                          title="View Course"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/courses/${course.id}/edit`}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                          title="Edit Course"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Course Stats */}
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <Video className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-gray-900">{course.lesson_count}</div>
                        <div className="text-xs text-gray-500">Lessons</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <Users className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-gray-900">{course.student_count}</div>
                        <div className="text-xs text-gray-500">Students</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <Clock className="h-4 w-4 text-green-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-gray-900">{formatDuration(course.total_duration)}</div>
                        <div className="text-xs text-gray-500">Duration</div>
                      </div>
                    </div>

                    {/* Course Metadata */}
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <span className="capitalize bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                        {course.level || 'Beginner'}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {getTimeAgo(course.created_at)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Link
                        to={`/courses/${course.id}`}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        <PlayCircle className="mr-1 h-4 w-4" />
                        View
                      </Link>
                      <Link
                        to={`/record?course=${course.id}`}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        title="Add Lesson"
                      >
                        <Video className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                // List View
                <div className="flex items-center space-x-4">
                  <div className={`w-16 h-16 bg-gradient-to-r ${getCategoryColor(course.category)} rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
                    {course.title.charAt(0)}
                  </div>
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
                        <span>{formatDuration(course.total_duration)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/courses/${course.id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/courses/${course.id}/edit`}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/record?course=${course.id}`}
                      className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Video className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-6 sm:p-8 text-center shadow-sm">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {courses.length === 0 ? 'No courses yet' : 'No courses found'}
          </h3>
          <p className="text-gray-600 text-sm mb-4 max-w-lg mx-auto">
            {courses.length === 0 
              ? 'Create your first course to start teaching and sharing knowledge with your students.'
              : 'Try adjusting your search or filter criteria to find what you\'re looking for.'
            }
          </p>
          <Link
            to="/courses/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create Your First Course
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyCourses;