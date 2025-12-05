import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { coursesApi } from '@/services/api';
import { apiClient } from '@/services/api/apiClient';
import { 
  BookOpen, 
  Search, 
  RefreshCw,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  Video,
  Clock,
  Calendar,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { Course } from '@/types/courses';

interface CourseWithCreator extends Course {
  created_by_name?: string;
  created_by_email?: string;
}

const AllCourses: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [courses, setCourses] = useState<CourseWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'student_count' | 'lesson_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch all courses (admin sees all)
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await coursesApi.getCourses();
      
      if (response.success && response.data?.courses) {
        // For admin, we might want to enrich with creator info
        const coursesData = response.data.courses.map((course: Course) => ({
          ...course,
          // Creator info would come from backend if available
        }));
        setCourses(coursesData);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Failed to fetch courses:', err);
      setError(err.response?.data?.message || 'Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Filtered and sorted courses
  const filteredAndSortedCourses = useMemo(() => {
    let filtered = courses.filter(course => {
      const matchesSearch = 
        course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'published' && course.is_published) ||
        (statusFilter === 'draft' && !course.is_published);
      
      const matchesCategory = 
        categoryFilter === 'all' || course.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      
      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [courses, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCourses = filteredAndSortedCourses.slice(startIndex, endIndex);

  // Stats
  const stats = useMemo(() => {
    return {
      total: courses.length,
      published: courses.filter(c => c.is_published).length,
      draft: courses.filter(c => !c.is_published).length,
      totalStudents: courses.reduce((sum, c) => sum + (c.student_count || 0), 0),
      totalLessons: courses.reduce((sum, c) => sum + (c.lesson_count || 0), 0),
      totalDuration: Math.round(courses.reduce((sum, c) => sum + (c.total_duration || 0), 0) / 60)
    };
  }, [courses]);

  // Handlers
  const handleBulkPublish = async (publish: boolean) => {
    if (selectedCourses.length === 0) return;
    setActionLoading('bulk');
    try {
      await apiClient.post('/courses/bulk-action', {
        action: publish ? 'publish' : 'unpublish',
        courseIds: selectedCourses
      });
      setSelectedCourses([]);
      await fetchCourses();
    } catch (err: any) {
      console.error('Failed to update courses:', err);
      setError(err.response?.data?.message || 'Failed to update courses');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCourses.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedCourses.length} course(s)? This action cannot be undone.`)) {
      return;
    }
    setActionLoading('bulk');
    try {
      await apiClient.post('/courses/bulk-action', {
        action: 'delete',
        courseIds: selectedCourses
      });
      setSelectedCourses([]);
      await fetchCourses();
    } catch (err: any) {
      console.error('Failed to delete courses:', err);
      setError(err.response?.data?.message || 'Failed to delete courses');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    setActionLoading(courseId.toString());
    try {
      await coursesApi.deleteCourse(courseId.toString());
      await fetchCourses();
    } catch (err: any) {
      console.error('Failed to delete course:', err);
      setError(err.response?.data?.message || 'Failed to delete course');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePublish = async (courseId: number, isPublished: boolean) => {
    setActionLoading(courseId.toString());
    try {
      if (isPublished) {
        await apiClient.post(`/courses/${courseId}/unpublish`);
      } else {
        await apiClient.post(`/courses/${courseId}/publish`);
      }
      await fetchCourses();
    } catch (err: any) {
      console.error('Failed to toggle publish status:', err);
      setError(err.response?.data?.message || 'Failed to update course status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelectAll = () => {
    if (selectedCourses.length === paginatedCourses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(paginatedCourses.map(c => c.id));
    }
  };

  const handleSelectCourse = (courseId: number) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      faith: 'Faith & Doctrine',
      history: 'Church History',
      spiritual: 'Spiritual Development',
      bible: 'Bible Study',
      liturgical: 'Liturgical Studies',
      youth: 'Youth Ministry'
    };
    return labels[category] || category;
  };

  if (loading && courses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <LoadingSpinner size="lg" text="Loading courses..." />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        {/* Compact Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-600">
              {stats.total} total courses • {stats.published} published • {stats.draft} drafts
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchCourses}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 bg-white/90 backdrop-blur-sm hover:bg-white text-stone-800 text-xs font-medium rounded-md transition-all border border-[#27AE60]/25 shadow-sm hover:shadow-md hover:border-[#27AE60]/40 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-[#27AE60] ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/admin/courses/new')}
              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white text-xs font-medium rounded-md hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Course
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Total Courses', value: stats.total, icon: BookOpen, textColor: 'text-[#27AE60]', bgColor: 'bg-[#27AE60]/10', borderColor: 'border-[#27AE60]/25', glowColor: 'bg-[#27AE60]/20' },
            { name: 'Published', value: stats.published, icon: CheckCircle, textColor: 'text-[#16A085]', bgColor: 'bg-[#16A085]/10', borderColor: 'border-[#16A085]/25', glowColor: 'bg-[#16A085]/20' },
            { name: 'Drafts', value: stats.draft, icon: XCircle, textColor: 'text-[#F39C12]', bgColor: 'bg-[#F39C12]/10', borderColor: 'border-[#F39C12]/25', glowColor: 'bg-[#F39C12]/20' },
            { name: 'Total Students', value: stats.totalStudents, icon: Users, textColor: 'text-[#2980B9]', bgColor: 'bg-[#2980B9]/10', borderColor: 'border-[#2980B9]/25', glowColor: 'bg-[#2980B9]/20' },
            { name: 'Total Lessons', value: stats.totalLessons, icon: Video, textColor: 'text-[#27AE60]', bgColor: 'bg-[#27AE60]/10', borderColor: 'border-[#27AE60]/25', glowColor: 'bg-[#27AE60]/20' },
            { name: 'Total Hours', value: stats.totalDuration, icon: Clock, textColor: 'text-[#16A085]', bgColor: 'bg-[#16A085]/10', borderColor: 'border-[#16A085]/25', glowColor: 'bg-[#16A085]/20' },
          ].map((stat, index) => (
            <div key={index} className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-4 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className={`relative ${stat.textColor}`}>
                  <div className={`absolute inset-0 ${stat.glowColor} rounded-lg blur-md`}></div>
                  <div className={`relative p-2 ${stat.bgColor} rounded-lg border ${stat.borderColor}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold text-stone-800">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-stone-600 font-medium">{stat.name}</p>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses by title or description..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 bg-white/90 backdrop-blur-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'published' | 'draft');
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 bg-white/90 backdrop-blur-sm"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 bg-white/90 backdrop-blur-sm"
            >
              <option value="all">All Categories</option>
              <option value="faith">Faith & Doctrine</option>
              <option value="history">Church History</option>
              <option value="spiritual">Spiritual Development</option>
              <option value="bible">Bible Study</option>
              <option value="liturgical">Liturgical Studies</option>
              <option value="youth">Youth Ministry</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 bg-white/90 backdrop-blur-sm"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="student_count-desc">Most Students</option>
              <option value="lesson_count-desc">Most Lessons</option>
            </select>

            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 ${viewMode === 'table' ? 'bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white font-semibold' : 'bg-white/90 text-stone-700 hover:bg-stone-50'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 border-l border-stone-300 ${viewMode === 'grid' ? 'bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white font-semibold' : 'bg-white/90 text-stone-700 hover:bg-stone-50'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedCourses.length > 0 && (
        <div className="bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10 border border-[#27AE60]/25 rounded-lg p-4 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <span className="text-stone-800 font-semibold">
              {selectedCourses.length} course{selectedCourses.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkPublish(true)}
                disabled={actionLoading === 'bulk'}
                className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-800 text-sm font-semibold rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 disabled:opacity-50 shadow-md"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Publish
              </button>
              <button
                onClick={() => handleBulkPublish(false)}
                disabled={actionLoading === 'bulk'}
                className="inline-flex items-center px-3 py-1.5 bg-[#F39C12] text-stone-800 text-sm font-semibold rounded-lg hover:bg-[#F39C12]/90 disabled:opacity-50 shadow-md"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Unpublish
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={actionLoading === 'bulk'}
                className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 shadow-md"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          </div>
          <button
            onClick={() => setSelectedCourses([])}
            className="text-stone-600 hover:text-stone-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Courses Display */}
      {filteredAndSortedCourses.length > 0 ? (
        <>
          {viewMode === 'table' ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedCourses.length === paginatedCourses.length && paginatedCourses.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Course</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Members</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Lessons</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedCourses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedCourses.includes(course.id)}
                            onChange={() => handleSelectCourse(course.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{course.title}</div>
                            <div className="text-xs text-gray-500 line-clamp-1">{course.description}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-900 capitalize">
                            {getCategoryLabel(course.category || '')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleTogglePublish(course.id, course.is_published)}
                            disabled={actionLoading === course.id.toString()}
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-50 ${
                              course.is_published
                                ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                                : 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
                            }`}
                          >
                            {course.is_published ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {course.is_published ? 'Published' : 'Draft'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 flex items-center">
                            <Users className="h-3 w-3 mr-1 text-gray-400" />
                            {course.student_count || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 flex items-center">
                            <Video className="h-3 w-3 mr-1 text-gray-400" />
                            {course.lesson_count || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            {formatDate(typeof course.created_at === 'string' ? course.created_at : course.created_at.toString())}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/admin/courses/${course.id}`}
                              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <Link
                              to={`/teacher/courses/${course.id}/edit`}
                              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              disabled={actionLoading === course.id.toString()}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedCourses.length)} of {filteredAndSortedCourses.length} courses
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedCourses.map((course) => (
                <div 
                  key={course.id} 
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className={`bg-gradient-to-r ${getCategoryColor(course.category || '')} p-4 text-white`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold truncate">{course.title}</h3>
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(course.id)}
                        onChange={() => handleSelectCourse(course.id)}
                        className="rounded border-white text-white focus:ring-white"
                      />
                    </div>
                    <p className="text-white/80 text-xs line-clamp-2">{course.description}</p>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <button
                          onClick={() => handleTogglePublish(course.id, course.is_published)}
                          disabled={actionLoading === course.id.toString()}
                          className={`w-full flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-50 ${
                            course.is_published
                              ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
                          }`}
                        >
                          {course.is_published ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {course.is_published ? 'Published' : 'Draft'}
                        </button>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Category</p>
                        <p className="text-xs font-medium text-gray-900 capitalize">
                          {getCategoryLabel(course.category || '')}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-4">
                      <div>
                        <Users className="h-3 w-3 inline mr-1" />
                        {course.student_count || 0}
                      </div>
                      <div>
                        <Video className="h-3 w-3 inline mr-1" />
                        {course.lesson_count || 0}
                      </div>
                      <div>
                        <Clock className="h-3 w-3 inline mr-1" />
                        {Math.round((course.total_duration || 0) / 60)}h
                      </div>
                    </div>
                    <div className="flex space-x-2 pt-4 border-t border-gray-200">
                      <Link
                        to={`/admin/courses/${course.id}`}
                        className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Link>
                      <Link
                        to={`/teacher/courses/${course.id}/edit`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <Edit className="h-3 w-3" />
                      </Link>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        disabled={actionLoading === course.id.toString()}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {courses.length === 0 ? 'No courses yet' : 'No courses found'}
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {courses.length === 0 
              ? 'Create your first course to start managing content.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {courses.length === 0 && (
            <button
              onClick={() => navigate('/teacher/courses/new')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Course
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AllCourses;
