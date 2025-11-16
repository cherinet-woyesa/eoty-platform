import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, Search, RefreshCw, Mail, MessageSquare, 
  UserCheck, UserX, TrendingUp, BookOpen, Clock, Eye, X
} from 'lucide-react';
import { teacherApi } from '@/services/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, []);

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setShowDetails(true);
  };

  if (loading && students.length === 0) {
    return (
      <div className="w-full space-y-6 p-6 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" text="Loading students..." />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#27AE60]/20 via-[#16A085]/20 to-[#2980B9]/20 rounded-xl p-6 border border-[#27AE60]/30 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#27AE60]/30 rounded-lg blur-md"></div>
              <div className="relative p-3 bg-gradient-to-br from-[#27AE60]/20 to-[#16A085]/20 rounded-lg border border-[#27AE60]/30">
                <Users className="h-6 w-6 text-[#27AE60]" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-stone-800">Student Management</h1>
              <p className="text-stone-600 text-sm mt-1">Manage and monitor your students' progress</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/teacher/students/invite')}
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/50 text-stone-700 hover:text-[#27AE60] rounded-lg transition-all font-semibold"
            >
              <Mail className="h-4 w-4 mr-2" />
              Invite
            </button>
            <button
              onClick={fetchStudents}
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#16A085]/50 text-stone-700 hover:text-[#16A085] rounded-lg transition-all font-semibold"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all hover:border-[#27AE60]/50">
          <div className="flex items-center justify-between mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#27AE60]/20 rounded-lg blur-md"></div>
              <div className="relative p-2 bg-gradient-to-br from-[#27AE60]/10 to-[#16A085]/10 rounded-lg border border-[#27AE60]/30">
                <Users className="h-5 w-5 text-[#27AE60]" />
              </div>
            </div>
          </div>
          <p className="text-3xl font-bold text-stone-800">{stats.totalStudents}</p>
          <p className="text-sm text-stone-600 mt-1 font-medium">Total Students</p>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all hover:border-[#16A085]/50">
          <div className="flex items-center justify-between mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#16A085]/20 rounded-lg blur-md"></div>
              <div className="relative p-2 bg-gradient-to-br from-[#16A085]/10 to-[#2980B9]/10 rounded-lg border border-[#16A085]/30">
                <UserCheck className="h-5 w-5 text-[#16A085]" />
              </div>
            </div>
          </div>
          <p className="text-3xl font-bold text-stone-800">{stats.activeStudents}</p>
          <p className="text-sm text-stone-600 mt-1 font-medium">Active Students</p>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all hover:border-[#2980B9]/50">
          <div className="flex items-center justify-between mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#2980B9]/20 rounded-lg blur-md"></div>
              <div className="relative p-2 bg-gradient-to-br from-[#2980B9]/10 to-[#27AE60]/10 rounded-lg border border-[#2980B9]/30">
                <TrendingUp className="h-5 w-5 text-[#2980B9]" />
              </div>
            </div>
          </div>
          <p className="text-3xl font-bold text-stone-800">{stats.avgProgress}%</p>
          <p className="text-sm text-stone-600 mt-1 font-medium">Avg. Progress</p>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md hover:shadow-lg transition-all hover:border-[#FFD700]/50">
          <div className="flex items-center justify-between mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#FFD700]/20 rounded-lg blur-md"></div>
              <div className="relative p-2 bg-gradient-to-br from-[#FFD700]/10 to-[#FFA500]/10 rounded-lg border border-[#FFD700]/30">
                <BookOpen className="h-5 w-5 text-[#FFD700]" />
              </div>
            </div>
          </div>
          <p className="text-3xl font-bold text-stone-800">{stats.avgCourses}</p>
          <p className="text-sm text-stone-600 mt-1 font-medium">Avg. Courses</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 border border-stone-200 shadow-md">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search students by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-sm text-stone-700 placeholder-stone-400 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-sm text-stone-700"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50/80 border border-red-200/50 rounded-xl p-4 text-red-700 text-sm">
          <p className="font-medium">Error loading students</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={fetchStudents}
            className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Students Grid - Light cards */}
      {!error && !loading && (
        <>
          {students.length === 0 ? (
            <div className="bg-white/85 backdrop-blur-sm rounded-xl p-12 border border-slate-200/40 shadow-sm text-center">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 text-lg font-medium mb-2">No students found</p>
              <p className="text-slate-500 text-sm mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Students enrolled in your courses will appear here. Make sure you have courses with enrolled students.'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <div className="mt-6 space-y-2 text-sm text-slate-600">
                  <p className="font-medium">To see students here:</p>
                  <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
                    <li>Create courses in "My Courses"</li>
                    <li>Have students enroll in your courses</li>
                    <li>Students will appear automatically once enrolled</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white/85 backdrop-blur-sm rounded-xl p-5 border border-slate-200/40 shadow-sm hover:shadow-md hover:border-slate-300/50 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border border-slate-200/50">
                    {student.profilePicture ? (
                      <img
                        src={student.profilePicture}
                        alt={`${student.firstName} ${student.lastName}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-600 font-semibold text-lg">
                        {student.firstName[0]}{student.lastName[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700">
                      {student.firstName} {student.lastName}
                    </h3>
                    <p className="text-sm text-slate-500">{student.email}</p>
                  </div>
                </div>
                {student.isActive ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#27AE60]/20 text-[#27AE60] border border-[#27AE60]/30">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <UserX className="h-3 w-3 mr-1" />
                    Inactive
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Enrolled Courses</span>
                  <span className="font-semibold text-slate-700">{student.enrolledCourses}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Progress</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#27AE60] to-[#32E60F] transition-all duration-300"
                        style={{ width: `${student.avgProgress}%` }}
                      />
                    </div>
                    <span className="font-semibold text-slate-700 w-10 text-right">{student.avgProgress}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 flex items-center">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Last Active
                  </span>
                  <span className="text-slate-500">{formatTimeAgo(student.lastActiveAt)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200/50">
                <button
                  onClick={() => handleViewDetails(student)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-200 text-sm font-medium"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </button>
                <button
                  onClick={() => navigate(`/teacher/students/${student.id}/message`)}
                  className="px-3 py-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-200"
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
            className="px-4 py-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-slate-600 text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200/50">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border border-slate-200/50">
              {student.profilePicture ? (
                <img
                  src={student.profilePicture}
                  alt={`${student.firstName} ${student.lastName}`}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-slate-600 font-semibold text-lg">
                  {student.firstName[0]}{student.lastName[0]}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-700">
                {student.firstName} {student.lastName}
              </h2>
              <p className="text-sm text-slate-500">{student.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 transition-colors"
          >
            <X className="h-5 w-5 text-slate-600" />
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
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/40">
                  <p className="text-sm text-slate-600 mb-1">Total Courses</p>
                  <p className="text-2xl font-bold text-slate-700">{details.stats?.totalCourses || 0}</p>
                </div>
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/40">
                  <p className="text-sm text-slate-600 mb-1">Avg. Progress</p>
                  <p className="text-2xl font-bold text-slate-700">{details.stats?.avgProgress || 0}%</p>
                </div>
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/40">
                  <p className="text-sm text-slate-600 mb-1">Completed Lessons</p>
                  <p className="text-2xl font-bold text-slate-700">{details.stats?.completedLessons || 0}</p>
                </div>
              </div>

              {/* Courses */}
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-4">Enrolled Courses</h3>
                <div className="space-y-3">
                  {details.courses?.map((course: any) => (
                    <div
                      key={course.id}
                      className="bg-white/85 backdrop-blur-sm rounded-xl p-4 border border-slate-200/40 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-700 mb-1">{course.title}</h4>
                          <p className="text-sm text-slate-500 mb-3">{course.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-slate-600">
                            <span>Progress: {course.progress}%</span>
                            <span>Lessons: {course.completedLessons}</span>
                          </div>
                          <div className="mt-2 w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#27AE60] to-[#32E60F] transition-all duration-300"
                              style={{ width: `${course.progress}%` }}
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
            <div className="text-center py-12 text-slate-500">
              Failed to load student details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;

