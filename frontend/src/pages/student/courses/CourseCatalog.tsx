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
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';

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
  created_by?: number | string;
}

const CourseCatalog: React.FC = () => {
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
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

  // Refresh when other parts of the app change enrollment state
  useEffect(() => {
    const handleEnrollmentUpdate = () => loadCatalog();
    window.addEventListener('student-enrollment-updated', handleEnrollmentUpdate);
    window.addEventListener('focus', handleEnrollmentUpdate);
    return () => {
      window.removeEventListener('student-enrollment-updated', handleEnrollmentUpdate);
      window.removeEventListener('focus', handleEnrollmentUpdate);
    };
  }, [loadCatalog]);

  useEffect(() => {
    loadCatalog();
    loadInvitations();
  }, [loadCatalog, loadInvitations]);

  const handleEnroll = useCallback(async (courseId: number, title?: string) => {
    try {
      const ok = await confirm({
        title: 'Enroll in course',
        message: `Do you want to enroll in "${title || 'this course'}"? You can unenroll anytime and your progress will be saved.`,
        confirmText: 'Enroll',
        cancelText: 'Cancel'
      });
      if (!ok) return;

      setEnrolling(courseId);
      const res = await apiClient.post(`/courses/${courseId}/enroll`);
      
      // Update local state
      setCourses(courses.map(course => 
        course.id === courseId 
          ? { ...course, is_enrolled: true, student_count: course.student_count + 1 }
          : course
      ));
      // Notify other parts of the app
      window.dispatchEvent(new CustomEvent('student-enrollment-updated'));

      // Optional: use res?.data?.message with a notification if needed
    } catch (err: any) {
      console.error('Failed to enroll:', err);
      const msg = err?.response?.data?.message || '';
      if (msg.toLowerCase().includes('already enrolled')) {
        // Treat as success: mark enrolled locally and emit event
        setCourses(courses.map(course => 
          course.id === courseId 
            ? { ...course, is_enrolled: true }
            : course
        ));
        window.dispatchEvent(new CustomEvent('student-enrollment-updated'));
        return;
      }
      alert('Failed to enroll in course. Please try again.');
    } finally {
      setEnrolling(null);
    }
  }, [courses, confirm]);

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
      faith: 'from-emerald-500 to-emerald-600',
      history: 'from-amber-500 to-amber-600',
      spiritual: 'from-teal-500 to-teal-600',
      bible: 'from-green-500 to-green-600',
      liturgical: 'from-red-500 to-red-600',
      youth: 'from-cyan-500 to-cyan-600'
    };
    return colors[category] || 'from-stone-500 to-stone-600';
  }, []);

  // Memoize compact course rendering to prevent unnecessary re-renders
  const renderCourseCard = useCallback((course: CatalogCourse) => (
    <div key={course.id} className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 overflow-hidden hover:shadow-md transition-all duration-200 hover:border-[#27AE60]/40">
      {/* Compact Course Header */}
      <div className={`relative h-32 ${!course.cover_image ? `bg-gradient-to-r ${getCategoryColor(course.category)}` : 'bg-stone-200'}`}>
        {course.cover_image && (
          <>
            <img 
              src={course.cover_image} 
              alt={course.title} 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </>
        )}
        
        <div className={`absolute inset-0 p-3 flex flex-col justify-end ${!course.cover_image ? 'text-white' : 'text-white'}`}>
          <h3 className="text-sm font-bold mb-0.5 line-clamp-2 drop-shadow-sm">{course.title}</h3>
          <p className="text-white/90 text-xs line-clamp-2 opacity-90 drop-shadow-sm">
            {course.description || 'No description provided'}
          </p>
        </div>

        {course.is_enrolled && (
          <div className="absolute top-1.5 right-1.5 bg-[#27AE60] text-white px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center shadow-md z-10">
            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
            Enrolled
          </div>
        )}
      </div>

      {/* Compact Course Info */}
      <div className="p-3">
        <div className="flex items-center justify-between text-xs text-stone-600 mb-2">
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3 text-[#27AE60]" />
            <span>{course.student_count} students</span>
          </div>
          <div className="flex items-center space-x-1">
            <BookOpen className="h-3 w-3 text-[#2980B9]" />
            <span>{course.lesson_count} lessons</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs mb-2">
          <span className="capitalize bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-stone-700">
            {course.level || 'Beginner'}
          </span>
          <span className="text-stone-500 text-[10px]">
            by {course.created_by_name}
          </span>
        </div>

        {/* Compact Action Buttons */}
        <div className="flex space-x-1.5">
          {/* For teachers, show preview/manage actions. For students, show view/enroll/continue. */}
          {user?.role === 'teacher' ? (
            <>
              <Link
                to={`/teacher/courses/${course.id}`}
                className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-stone-300 text-xs font-medium rounded text-stone-700 bg-white/90 backdrop-blur-sm hover:bg-stone-50 transition-colors"
              >
                Preview
              </Link>
              {/* Only show Manage if the current teacher is the course owner */}
              {String(course.created_by) === String(user?.id) && (
                <Link
                  to={`/teacher/courses/${course.id}/edit`}
                  className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-stone-900 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-all shadow-sm hover:shadow-md"
                >
                  Manage
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                to={`/student/courses/${course.id}`}
                className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-stone-300 text-xs font-medium rounded text-stone-700 bg-white/90 backdrop-blur-sm hover:bg-stone-50 transition-colors"
              >
                View
              </Link>

              {!course.is_enrolled ? (
                <button
                  onClick={() => handleEnroll(course.id, course.title)}
                  disabled={enrolling === course.id}
                  className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-stone-900 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                >
                  {enrolling === course.id ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    'Enroll'
                  )}
                </button>
              ) : (
                <Link
                  to={`/student/courses/${course.id}`}
                  className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-stone-900 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-all shadow-sm hover:shadow-md"
                >
                  Continue
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  ), [getCategoryColor, handleEnroll, enrolling]);

  if (loading) {
    return (
      <div className="w-full space-y-2 p-2">
        <div className="flex items-center justify-center min-h-64">
          <LoadingSpinner size="lg" text="Loading course catalog..." variant="logo" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-2 p-2">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button
              onClick={loadCatalog}
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
    <div className="w-full space-y-2 p-2">
        {/* Compact Invitations Alert */}
        {pendingInvitesCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-white/80 border border-emerald-200 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100">
                <Mail className="h-3 w-3 text-emerald-700" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-900">
                  {pendingInvitesCount} course invitation{pendingInvitesCount > 1 ? 's' : ''}.
                </p>
                <p className="text-[10px] text-emerald-700/80">
                  Accept invitations from your teachers.
                </p>
              </div>
            </div>
            <Link
              to="/student/invitations"
              className="inline-flex items-center self-start sm:self-auto px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm"
            >
              View
            </Link>
          </div>
        )}

        {/* Compact Search and Filters */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-stone-200 shadow-sm">
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
          <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-6 text-center">
            <BookOpen className="h-10 w-10 text-stone-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-stone-800 mb-1">No courses found</h3>
            <p className="text-stone-600 text-xs">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    
  );
};

export default React.memo(CourseCatalog);