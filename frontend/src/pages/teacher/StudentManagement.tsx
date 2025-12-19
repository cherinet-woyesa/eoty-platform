import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Users, Search, RefreshCw, Mail, MessageSquare, 
  UserCheck, UserX, TrendingUp, BookOpen, Clock, Eye, X
} from 'lucide-react';
import { teacherApi } from '@/services/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { brandColors } from '@/theme/brand';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  lastActiveAt: string;
  profilePicture?: string;
  enrolledCourses: number;
  avgProgress: number;
  lastProgressAt?: string;
}

interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  avgProgress: number;
  avgCourses: number;
}

const StudentManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[StudentManagement] Fetching students with params:', {
        search: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 20
      });

      const response = await teacherApi.getStudents({
        search: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 20
      });

      console.log('[StudentManagement] API Response:', response);

      if (response.success) {
        const studentsList = response.data?.students || [];
        console.log(`[StudentManagement] Loaded ${studentsList.length} students`);
        setStudents(studentsList);
        setTotalPages(response.data?.pagination?.totalPages || 1);
      } else {
        console.error('[StudentManagement] API returned error:', response.message);
        setError(response.message || 'Failed to load students');
      }
    } catch (err: any) {
      console.error('[StudentManagement] Failed to fetch students:', err);
      console.error('[StudentManagement] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.message || err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const stats: StudentStats = useMemo(() => {
    const total = students.length;
    const active = students.filter(s => s.isActive).length;
    const avgProgress = Math.round(
      students.reduce((sum, s) => sum + s.avgProgress, 0) / Math.max(1, total)
    );
    const avgCourses = (students.reduce((sum, s) => sum + s.enrolledCourses, 0) / Math.max(1, total)).toFixed(1);

    return {
      totalStudents: total,
      activeStudents: active,
      avgProgress,
      avgCourses: parseFloat(avgCourses)
    };
  }, [students]);

  const formatTimeAgo = useCallback((dateString: string) => {
    if (!dateString) return t('student_management.time.never');
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('student_management.time.just_now');
    if (diffMins < 60) return `${diffMins}${t('student_management.time.m_ago')}`;
    if (diffHours < 24) return `${diffHours}${t('student_management.time.h_ago')}`;
    if (diffDays < 7) return `${diffDays}${t('student_management.time.d_ago')}`;
    return date.toLocaleDateString();
  }, [t]);

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setShowDetails(true);
  };

  if (loading && students.length === 0) {
    return (
      <div className="w-full space-y-2 p-2">
        <div className="flex items-center justify-center min-h-64">
          <LoadingSpinner size="md" text={t('student_management.loading')} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('student_management.overview')}</h2>
          <p className="text-sm text-gray-500">{t('student_management.overview_subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/teacher/students/invite')}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-all font-medium text-sm shadow-sm"
          >
            <Mail className="h-4 w-4 mr-2" />
            {t('student_management.invite')}
          </button>
          <button
            onClick={fetchStudents}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-all font-medium text-sm shadow-sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('student_management.refresh')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColors.primaryHex}1A` }}>
              <Users className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
          <p className="text-sm text-gray-500 mt-1 font-medium">{t('student_management.stats.total_students')}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <UserCheck className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.activeStudents}</p>
          <p className="text-sm text-gray-500 mt-1 font-medium">{t('student_management.stats.active_students')}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.avgProgress}%</p>
          <p className="text-sm text-gray-500 mt-1 font-medium">{t('student_management.stats.avg_progress')}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <BookOpen className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.avgCourses}</p>
          <p className="text-sm text-gray-500 mt-1 font-medium">{t('student_management.stats.avg_courses')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('student_management.search_placeholder')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm text-gray-900 placeholder-gray-400 transition-all"
              style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm text-gray-700"
              style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
            >
              <option value="all">{t('student_management.filters.all_status')}</option>
              <option value="active">{t('student_management.filters.active')}</option>
              <option value="inactive">{t('student_management.filters.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <p className="font-medium">{t('student_management.error.loading')}</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={fetchStudents}
            className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
          >
            {t('student_management.error.try_again')}
          </button>
        </div>
      )}

      {/* Students Grid */}
      {!error && !loading && (
        <>
          {students.length === 0 ? (
            <div className="bg-white rounded-xl p-12 border border-gray-200 shadow-sm text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-900 text-lg font-medium mb-2">{t('student_management.empty.no_students')}</p>
              <p className="text-gray-500 text-sm mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? t('student_management.empty.adjust_criteria')
                  : t('student_management.empty.no_students_desc')}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <div className="mt-6 space-y-2 text-sm text-gray-600">
                  <p className="font-medium">{t('student_management.empty.how_to_see')}</p>
                  <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
                    <li>{t('student_management.empty.step_1')}</li>
                    <li>{t('student_management.empty.step_2')}</li>
                    <li>{t('student_management.empty.step_3')}</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden">
                    {student.profilePicture ? (
                      <img
                        src={student.profilePicture}
                        alt={`${student.firstName} ${student.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500 font-semibold text-lg">
                        {student.firstName[0]}{student.lastName[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {student.firstName} {student.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{student.email}</p>
                  </div>
                </div>
                {student.isActive ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    <UserX className="h-3 w-3 mr-1" />
                    Inactive
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Enrolled Courses</span>
                  <span className="font-semibold text-gray-900">{student.enrolledCourses}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${student.avgProgress}%`, backgroundColor: brandColors.primaryHex }}
                      />
                    </div>
                    <span className="font-semibold text-gray-900 w-10 text-right">{student.avgProgress}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center">
                    <Clock className="h-3.5 w-3.5 mr-1 text-gray-400" />
                    Last Active
                  </span>
                  <span className="text-gray-500">{formatTimeAgo(student.lastActiveAt)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleViewDetails(student)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 text-sm font-medium"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </button>
                <button
                  onClick={() => navigate(`/teacher/students/${student.id}/message`)}
                  className="px-3 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600 text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
          >
            Next
          </button>
        </div>
      )}

      {/* Student Details Modal */}
      {showDetails && selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          onClose={() => {
            setShowDetails(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};

// Student Details Modal Component
interface StudentDetailsModalProps {
  student: Student;
  onClose: () => void;
}

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ student, onClose }) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await teacherApi.getStudentDetails(student.id);
        if (response.success) {
          setDetails(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch student details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [student.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden">
              {student.profilePicture ? (
                <img
                  src={student.profilePicture}
                  alt={`${student.firstName} ${student.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-500 font-semibold text-lg">
                  {student.firstName[0]}{student.lastName[0]}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {student.firstName} {student.lastName}
              </h2>
              <p className="text-sm text-gray-500">{student.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" text="Loading details..." />
            </div>
          ) : details ? (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Total Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{details.stats?.totalCourses || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Avg. Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{details.stats?.avgProgress || 0}%</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Completed Lessons</p>
                  <p className="text-2xl font-bold text-gray-900">{details.stats?.completedLessons || 0}</p>
                </div>
              </div>

              {/* Courses */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrolled Courses</h3>
                <div className="space-y-3">
                  {details.courses?.map((course: any) => (
                    <div
                      key={course.id}
                      className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{course.title}</h4>
                          <p className="text-sm text-gray-500 mb-3">{course.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Progress: {course.progress}%</span>
                            <span>Lessons: {course.completedLessons}</span>
                          </div>
                          <div className="mt-2 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${course.progress}%`, backgroundColor: brandColors.primaryHex }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Failed to load student details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;

