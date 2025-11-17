import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Search, Users, Clock, Star, 
  CheckCircle, Loader2, AlertCircle, Filter,
  TrendingUp, Award, Sparkles, Mail
} from 'lucide-react';
import { studentsApi } from '@/services/api/students';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';

interface CatalogCourse {
  id: number;
  title: string;
  description: string;
  cover_image: string | null;
  category: string;
  level: string;
  lesson_count: number;
  student_count: number;
  is_enrolled: boolean;
  is_published: boolean;
  created_by_name: string;
}

const CourseCatalog: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [enrolling, setEnrolling] = useState<number | null>(null);
  const [pendingInvitesCount, setPendingInvitesCount] = useState<number>(0);

  // Memoize categories and levels to prevent re-creation on each render
  const categories = useMemo(() => [
    { value: 'all', label: 'All Categories' },
    { value: 'faith', label: 'Faith & Doctrine' },
    { value: 'history', label: 'Church History' },
    { value: 'spiritual', label: 'Spiritual Development' },
    { value: 'bible', label: 'Bible Study' },
    { value: 'liturgical', label: 'Liturgical Studies' },
    { value: 'youth', label: 'Youth Ministry' }
  ], []);

  const levels = useMemo(() => [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ], []);

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/courses/catalog');
      
      if (response.data.success) {
        setCourses(response.data.data.courses || []);
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
      setError('Failed to load course catalog. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    try {
      const res = await studentsApi.getInvitations();
      const invites = res.data?.invitations || res.data?.data?.invitations || [];
      setPendingInvitesCount(invites.length || 0);
    } catch (err) {
      // Silent fail – catalog should still work if invites endpoint has an issue
      console.warn('Failed to load student invitations count:', err);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    loadInvitations();
  }, [loadCatalog, loadInvitations]);

  const handleEnroll = useCallback(async (courseId: number) => {
    try {
      setEnrolling(courseId);
      await apiClient.post(`/courses/${courseId}/enroll`);
      
      // Update local state
      setCourses(courses.map(course => 
        course.id === courseId 
          ? { ...course, is_enrolled: true, student_count: course.student_count + 1 }
          : course
      ));
    } catch (err) {
      console.error('Failed to enroll:', err);
      alert('Failed to enroll in course. Please try again.');
    } finally {
      setEnrolling(null);
    }
  }, [courses]);

  // Memoize filtered courses to prevent unnecessary re-calculations
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           course.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
      const matchesLevel = filterLevel === 'all' || course.level === filterLevel;
      
      return matchesSearch && matchesCategory && matchesLevel && course.is_published;
    });
  }, [courses, searchTerm, filterCategory, filterLevel]);

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

  // Memoize course rendering to prevent unnecessary re-renders
  const renderCourseCard = useCallback((course: CatalogCourse) => (
    <div key={course.id} className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 overflow-hidden hover:shadow-xl transition-all duration-200 hover:border-[#27AE60]/40">
      {/* Course Header */}
      <div className={`bg-gradient-to-r ${getCategoryColor(course.category)} p-4 text-white relative`}>
        <h3 className="text-lg font-bold mb-1 line-clamp-2">{course.title}</h3>
        <p className="text-white/90 text-sm line-clamp-2 opacity-90">
          {course.description || 'No description provided'}
        </p>
        {course.is_enrolled && (
          <div className="absolute top-2 right-2 bg-[#27AE60] text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center shadow-md">
            <CheckCircle className="h-3 w-3 mr-1" />
            Enrolled
          </div>
        )}
      </div>

      {/* Course Info */}
      <div className="p-4">
        <div className="flex items-center justify-between text-sm text-stone-600 mb-3">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4 text-[#27AE60]" />
            <span>{course.student_count} students</span>
          </div>
          <div className="flex items-center space-x-1">
            <BookOpen className="h-4 w-4 text-[#2980B9]" />
            <span>{course.lesson_count} lessons</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm mb-4">
          <span className="capitalize bg-stone-100 px-2 py-1 rounded text-xs font-medium text-stone-700">
            {course.level || 'Beginner'}
          </span>
          <span className="text-stone-500 text-xs">
            by {course.created_by_name}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Link
            to={`/student/courses/${course.id}`}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-stone-300 text-sm font-medium rounded-lg text-stone-700 bg-white/90 backdrop-blur-sm hover:bg-stone-50 transition-colors"
          >
            View Details
          </Link>
          
          {!course.is_enrolled ? (
            <button
              onClick={() => handleEnroll(course.id)}
              disabled={enrolling === course.id}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-stone-900 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {enrolling === course.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Enrolling...
                </>
              ) : (
                'Enroll Now'
              )}
            </button>
          ) : (
            <Link
              to={`/student/courses/${course.id}`}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-stone-900 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-all shadow-md hover:shadow-lg"
            >
              Continue Learning
            </Link>
          )}
        </div>
      </div>
    </div>
  ), [getCategoryColor, handleEnroll, enrolling]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        <div className="w-full flex items-center justify-center min-h-96 p-4 sm:p-6 lg:p-8">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#27AE60] mx-auto mb-4" />
            <p className="text-stone-600 text-lg">Loading course catalog...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        <div className="w-full flex items-center justify-center min-h-96 p-4 sm:p-6 lg:p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <button 
              onClick={loadCatalog}
              className="px-4 py-2 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors font-semibold shadow-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-2xl p-6 border border-[#27AE60]/25 shadow-lg backdrop-blur-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#27AE60]/20 rounded-lg blur-md"></div>
                  <div className="relative p-2 bg-white/80 rounded-lg border border-[#27AE60]/40">
                    <Sparkles className="h-6 w-6 text-[#27AE60]" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-stone-800">Course Catalog</h1>
              </div>
              <p className="text-stone-700 text-sm mt-2">
                Discover and enroll in courses to expand your knowledge
              </p>
              <p className="text-stone-600 text-xs mt-1">
                {filteredCourses.length} courses available
              </p>
            </div>
          </div>

          {pendingInvitesCount > 0 && (
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-white/80 border border-emerald-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Mail className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    You have {pendingInvitesCount} course invitation{pendingInvitesCount > 1 ? 's' : ''}.
                  </p>
                  <p className="text-xs text-emerald-700/80">
                    Accept invitations to join courses your teachers have shared with you.
                  </p>
                </div>
              </div>
              <Link
                to="/student/invitations"
                className="inline-flex items-center self-start sm:self-auto px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm"
              >
                View invitations
              </Link>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 border border-stone-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 text-sm bg-white"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 bg-white text-sm"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 bg-white text-sm"
            >
              {levels.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

        {/* Course Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCourses.map(renderCourseCard)}
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-8 text-center">
            <BookOpen className="h-12 w-12 text-stone-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-stone-900 mb-2">No courses found</h3>
            <p className="text-stone-600 text-sm">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(CourseCatalog);