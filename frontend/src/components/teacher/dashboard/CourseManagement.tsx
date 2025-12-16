import React, { useCallback, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Eye, Users, Clock, Star, MoreVertical, Plus, PlayCircle, 
  BarChart, BookOpen, Edit3, Archive, Trash2, Filter,
  Search, Grid, List, ChevronDown, AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { BulkActions } from '@/components/shared/courses/BulkActions';

// Types
interface Course {
  id: string;
  title: string;
  description: string;
  studentCount: number;
  lessonCount: number;
  totalDuration: number;
  rating: number;
  progress?: number;
  thumbnail?: string;
  status: 'published' | 'draft' | 'archived';
  lastUpdated: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  revenue?: number;
}

interface CourseManagementProps {
  courses: Course[];
  compact?: boolean;
  onCourseSelect?: (courseId: string) => void;
  showFilters?: boolean;
  enableFetch?: boolean;
  limit?: number;
  page?: number;
}

type SortOption = 'title' | 'students' | 'rating' | 'recent' | 'progress';
type ViewMode = 'grid' | 'list';

const CourseManagement: React.FC<CourseManagementProps> = ({ 
  courses, 
  compact = false,
  onCourseSelect,
  showFilters = false,
  enableFetch = true,
  limit = 30,
  page = 1
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);

  const { data: fetchedCourses = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-courses', limit, page, searchTerm, statusFilter, sortBy],
    queryFn: async () => {
      const params: any = { limit };
      if (page) params.page = page;
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (sortBy && sortBy !== 'recent') params.sort = sortBy;
      const res = await apiClient.get('/courses/teacher', { params });
      return res?.data?.data?.courses || [];
    },
    enabled: enableFetch,
    staleTime: 2 * 60 * 1000,
    retry: 1
  });

  const sourceCourses = enableFetch ? fetchedCourses : courses;

  const handleCourseClick = useCallback((courseId: string) => {
    onCourseSelect?.(courseId);
  }, [onCourseSelect]);

  const handleCourseSelect = useCallback((courseId: number, isSelected: boolean) => {
    setSelectedCourses(prev =>
      isSelected
        ? [...prev, courseId]
        : prev.filter(id => id !== courseId)
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedCourses(prev =>
      prev.length === filteredAndSortedCourses.length
        ? []
        : filteredAndSortedCourses.map(course => course.id)
    );
  }, [filteredAndSortedCourses]);

  const handleBulkActionComplete = useCallback(() => {
    refetch();
    setSelectedCourses([]);
  }, [refetch]);

  const handleEditCourse = useCallback((courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/teacher/courses/${courseId}/edit`);
  }, [navigate]);

  const handleViewAnalytics = useCallback((courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/analytics/courses/${courseId}`);
  }, [navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <Eye className="h-3 w-3" />;
      case 'draft':
        return <Edit3 className="h-3 w-3" />;
      case 'archived':
        return <Archive className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return t('common.duration_hours_minutes', { hours, minutes: mins });
    }
    return t('common.duration_minutes', { minutes: mins });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return t('common.yesterday');
    if (diffDays < 7) return t('common.days_ago', { count: diffDays });
    if (diffDays < 30) return t('common.weeks_ago', { count: Math.floor(diffDays / 7) });
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Filter and sort courses
  const filteredAndSortedCourses = useMemo(() => {
    let filtered = sourceCourses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           course.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort courses
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'students':
          return b.studentCount - a.studentCount;
        case 'rating':
          return b.rating - a.rating;
        case 'progress':
          return (b.progress || 0) - (a.progress || 0);
        case 'recent':
        default:
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      }
    });

    return filtered;
  }, [sourceCourses, searchTerm, statusFilter, sortBy, t]);

  const statusOptions = [
    { value: 'all', label: t('common.all_statuses') },
    { value: 'published', label: t('common.published') },
    { value: 'draft', label: t('common.draft') },
    { value: 'archived', label: t('common.archived') }
  ];

  const sortOptions = [
    { value: 'recent', label: t('common.most_recent') },
    { value: 'title', label: t('common.title') },
    { value: 'students', label: t('common.most_students') },
    { value: 'rating', label: t('common.highest_rated') },
    { value: 'progress', label: t('common.progress') }
  ];

  const courseStats = useMemo(() => {
    const total = sourceCourses.length;
    const published = sourceCourses.filter(c => c.status === 'published').length;
    const draft = sourceCourses.filter(c => c.status === 'draft').length;
    const archived = sourceCourses.filter(c => c.status === 'archived').length;
    const totalStudents = sourceCourses.reduce((sum, course) => sum + course.studentCount, 0);
    const totalLessons = sourceCourses.reduce((sum, course) => sum + course.lessonCount, 0);

    return {
      total,
      published,
      draft,
      archived,
      totalStudents,
      totalLessons
    };
  }, [sourceCourses]);

  if (isError) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{t('dashboard.teacher.unable_to_load_title')}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="text-sm text-indigo-700 border border-indigo-200 px-3 py-1 rounded-lg hover:bg-indigo-50"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('dashboard.teacher.my_courses')}
          </h3>
          <Link
            to="/courses"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
          >
            {t('common.view_all')}
            <ChevronDown className="h-4 w-4 ml-1 rotate-270" />
          </Link>
        </div>
        
        {isLoading && <div className="h-24 bg-gray-100 rounded-lg animate-pulse mb-3" />}

        <div className="space-y-3">
          {filteredAndSortedCourses.slice(0, 4).map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-300 transition-all duration-200 cursor-pointer group hover:shadow-sm"
              onClick={() => handleCourseClick(course.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {course.title}
                  </h4>
                  <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
                    {getStatusIcon(course.status)}
                    <span>{t(`common.${course.status}`)}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span>{t('common.student_count', { count: course.studentCount })}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <PlayCircle className="h-3 w-3" />
                    <span>{t('common.lesson_count', { count: course.lessonCount })}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span>{course.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewAnalytics(course.id, e);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                  title={t('common.view_analytics')}
                >
                  <BarChart className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCourse(course.id, e);
                  }}
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors opacity-0 group-hover:opacity-100"
                  title={t('common.edit_course')}
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredAndSortedCourses.length === 0 && (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? t('courses.no_courses_match_filters')
                : t('courses.no_courses_yet')
              }
            </p>
            <Link
              to="/teacher/courses/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('courses.create_first_course')}
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {t('courses.course_management')}
          </h2>
          <p className="text-gray-600 mt-1">
            {t('courses.manage_track_content')}
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          {filteredAndSortedCourses.length > 0 && (
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={selectedCourses.length === filteredAndSortedCourses.length && filteredAndSortedCourses.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">
                {selectedCourses.length === filteredAndSortedCourses.length
                  ? t('common.deselect_all')
                  : t('common.select_all')
                }
              </span>
            </label>
          )}
          <Link
            to="/courses/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('courses.new_course')}
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{courseStats.total}</div>
          <div className="text-sm text-blue-700">{t('common.total_courses')}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-600">{courseStats.published}</div>
          <div className="text-sm text-green-700">{t('common.published')}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">{courseStats.draft}</div>
          <div className="text-sm text-yellow-700">{t('common.draft')}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{courseStats.totalStudents}</div>
          <div className="text-sm text-purple-700">{t('common.total_students')}</div>
        </div>
      </div>

      {/* Filters and Search */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('common.search_courses')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedCourses.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <BulkActions
            selectedCourses={selectedCourses}
            courses={filteredAndSortedCourses}
            onActionComplete={handleBulkActionComplete}
            onClearSelection={() => setSelectedCourses([])}
          />
        </div>
      )}

      {/* Courses Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onCourseClick={handleCourseClick}
              onEditCourse={handleEditCourse}
              onViewAnalytics={handleViewAnalytics}
              onSelect={handleCourseSelect}
              isSelected={selectedCourses.includes(course.id)}
              formatDuration={formatDuration}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedCourses.map((course) => (
            <CourseListItem
              key={course.id}
              course={course}
              onCourseClick={handleCourseClick}
              onEditCourse={handleEditCourse}
              onViewAnalytics={handleViewAnalytics}
              onSelect={handleCourseSelect}
              isSelected={selectedCourses.includes(course.id)}
              formatDuration={formatDuration}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' 
              ? t('courses.no_courses_match_filters')
              : t('courses.no_courses_yet')
            }
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {t('courses.create_amazing_experiences')}
          </p>
          <Link
            to="/teacher/courses/new"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('courses.create_first_course')}
          </Link>
        </div>
      )}
    </div>
  );
};

// Course Card Component for Grid View
interface CourseCardProps {
  course: Course;
  onCourseClick: (courseId: string) => void;
  onEditCourse: (courseId: string, e: React.MouseEvent) => void;
  onViewAnalytics: (courseId: string, e: React.MouseEvent) => void;
  onSelect?: (courseId: number, isSelected: boolean) => void;
  isSelected?: boolean;
  formatDuration: (minutes: number) => string;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
  t: (key: string, params?: any) => string;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onCourseClick,
  onEditCourse,
  onViewAnalytics,
  formatDuration,
  formatDate,
  getStatusColor,
  t
}) => {
  return (
    <div
      className="border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group"
      onClick={() => onCourseClick(course.id)}
    >
      {/* Course Thumbnail */}
      <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <BookOpen className="h-8 w-8" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${
            course.status === 'published' ? 'bg-green-500' :
            course.status === 'draft' ? 'bg-yellow-500' : 'bg-gray-500'
          }`}>
            {t(`common.${course.status}`)}
          </span>
        </div>
      </div>

      {/* Course Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {course.title}
        </h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{course.description}</p>
        
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{t('common.student_count', { count: course.studentCount })}</span>
            </div>
            <div className="flex items-center space-x-1">
              <PlayCircle className="h-3 w-3" />
              <span>{t('common.lesson_count', { count: course.lessonCount })}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(course.totalDuration)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3 text-yellow-500" />
              <span>{course.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar (if applicable) */}
        {course.progress !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('common.progress')}</span>
              <span>{course.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={(e) => onViewAnalytics(course.id, e)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {t('common.view_analytics')}
          </button>
          <button
            onClick={(e) => onEditCourse(course.id, e)}
            className="text-xs text-gray-600 hover:text-gray-700 font-medium transition-colors"
          >
            {t('common.edit_course')}
          </button>
        </div>

        {/* Last Updated */}
        <div className="mt-2 text-xs text-gray-400">
          {t('common.updated')} {formatDate(course.lastUpdated)}
        </div>
      </div>
    </div>
  );
};

// Course List Item Component for List View
const CourseListItem: React.FC<CourseCardProps> = ({
  course,
  onCourseClick,
  onEditCourse,
  onViewAnalytics,
  formatDuration,
  formatDate,
  getStatusColor,
  t
}) => {
  return (
    <div
      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer group"
      onClick={() => onCourseClick(course.id)}
    >
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        {/* Thumbnail */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <BookOpen className="h-6 w-6" />
          )}
        </div>

        {/* Course Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {course.title}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
              {t(`common.${course.status}`)}
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-2 line-clamp-1">{course.description}</p>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{course.studentCount}</span>
            </div>
            <div className="flex items-center space-x-1">
              <PlayCircle className="h-3 w-3" />
              <span>{course.lessonCount}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(course.totalDuration)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3 text-yellow-500" />
              <span>{course.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => onViewAnalytics(course.id, e)}
          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
          title={t('common.view_analytics')}
        >
          <BarChart className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => onEditCourse(course.id, e)}
          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
          title={t('common.edit_course')}
        >
          <Edit3 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default React.memo(CourseManagement);