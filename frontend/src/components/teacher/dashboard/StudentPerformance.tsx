import React, { useMemo, useState, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, Star, Target, Clock, Users, 
  Filter, Search, Download, MoreVertical, Mail, MessageCircle,
  Award, AlertCircle, CheckCircle, X, Calendar, BarChart3,
  ChevronDown, Eye, UserCheck, BookOpen, Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';

// Types
interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  course: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastActive: string;
  performance: 'excellent' | 'good' | 'average' | 'needs_improvement';
  score: number;
  engagement: number;
  attendance: number;
  assignmentsCompleted: number;
  totalAssignments: number;
  joinDate: string;
  timeSpent: number; // in minutes
  streak: number;
  badges: string[];
}

interface StudentPerformanceProps {
  data: Student[];
  compact?: boolean;
  showFilters?: boolean;
  courseId?: string;
  enableFetch?: boolean;
  pageSize?: number;
}

type PerformanceLevel = Student['performance'];
type SortField = 'name' | 'progress' | 'score' | 'engagement' | 'lastActive' | 'performance';
type ViewMode = 'list' | 'grid';

const StudentPerformance: React.FC<StudentPerformanceProps> = ({ 
  data, 
  compact = false,
  showFilters = true,
  courseId,
  enableFetch = true,
  pageSize = 20
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState<PerformanceLevel | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortField>('progress');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const { data: fetchedStudents = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-student-performance', courseId || 'all', pageSize],
    queryFn: async () => {
      if (!courseId) return [];
      const res = await apiClient.get(`/analytics/courses/${courseId}/students`, {
        params: { pageSize }
      });
      return res?.data?.data?.students || [];
    },
    enabled: enableFetch && !!courseId,
    staleTime: 2 * 60 * 1000,
    retry: 1
  });

  const sourceData = enableFetch ? fetchedStudents : data;

  const performanceStats = useMemo(() => {
    const total = sourceData.length || 1;
    const excellent = sourceData.filter(s => s.performance === 'excellent').length;
    const good = sourceData.filter(s => s.performance === 'good').length;
    const average = sourceData.filter(s => s.performance === 'average').length;
    const needsImprovement = sourceData.filter(s => s.performance === 'needs_improvement').length;
    
    const avgProgress = sourceData.reduce((sum, student) => sum + student.progress, 0) / total;
    const avgScore = sourceData.reduce((sum, student) => sum + student.score, 0) / total;
    const avgEngagement = sourceData.reduce((sum, student) => sum + student.engagement, 0) / total;
    const totalTimeSpent = sourceData.reduce((sum, student) => sum + student.timeSpent, 0);

    return {
      total,
      excellent: (excellent / total) * 100,
      good: (good / total) * 100,
      average: (average / total) * 100,
      needsImprovement: (needsImprovement / total) * 100,
      avgProgress,
      avgScore,
      avgEngagement,
      totalTimeSpent
    };
  }, [data]);

  const filteredAndSortedStudents = useMemo(() => {
    let filtered = sourceData.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.course.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPerformance = performanceFilter === 'all' || student.performance === performanceFilter;
      return matchesSearch && matchesPerformance;
    });

    // Sort students
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'progress':
          aValue = a.progress;
          bValue = b.progress;
          break;
        case 'score':
          aValue = a.score;
          bValue = b.score;
          break;
        case 'engagement':
          aValue = a.engagement;
          bValue = b.engagement;
          break;
        case 'lastActive':
          aValue = new Date(a.lastActive).getTime();
          bValue = new Date(b.lastActive).getTime();
          break;
        case 'performance':
          const performanceOrder = { excellent: 4, good: 3, average: 2, needs_improvement: 1 };
          aValue = performanceOrder[a.performance];
          bValue = performanceOrder[b.performance];
          break;
        default:
          aValue = a.progress;
          bValue = b.progress;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [sourceData, searchTerm, performanceFilter, sortBy, sortDirection]);

  const getPerformanceColor = (performance: PerformanceLevel) => {
    switch (performance) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'average':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'needs_improvement':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPerformanceIcon = (performance: PerformanceLevel) => {
    switch (performance) {
      case 'excellent':
        return <TrendingUp className="h-3 w-3" />;
      case 'good':
        return <CheckCircle className="h-3 w-3" />;
      case 'average':
        return <Target className="h-3 w-3" />;
      case 'needs_improvement':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Star className="h-3 w-3" />;
    }
  };

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 80) return 'text-green-600 bg-green-50';
    if (engagement >= 60) return 'text-blue-600 bg-blue-50';
    if (engagement >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const lastActive = new Date(timestamp);
    const diff = now.getTime() - lastActive.getTime();
    
    if (diff < 3600000) return t('common.minutes_ago', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('common.hours_ago', { count: Math.floor(diff / 3600000) });
    if (diff < 604800000) return t('common.days_ago', { count: Math.floor(diff / 86400000) });
    
    return lastActive.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTimeSpent = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return t('common.duration_hours_minutes', { hours, minutes: mins });
    }
    return t('common.duration_minutes', { minutes: mins });
  };

  const handleSort = useCallback((field: SortField) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  }, [sortBy, sortDirection]);

  const handleSelectStudent = useCallback((studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  }, []);

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
            <RefreshCw className="h-4 w-4 inline mr-1" />
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  const handleSelectAll = useCallback(() => {
    if (selectedStudents.size === filteredAndSortedStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredAndSortedStudents.map(s => s.id)));
    }
  }, [filteredAndSortedStudents, selectedStudents.size]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 1500));
    setExporting(false);
    console.log('Exporting student performance data...');
  }, []);

  const handleSendMessage = useCallback(() => {
    if (selectedStudents.size > 0) {
      console.log('Sending message to selected students:', Array.from(selectedStudents));
    }
  }, [selectedStudents]);

  const performanceOptions = [
    { value: 'all', label: t('common.all_performance') },
    { value: 'excellent', label: t('common.excellent') },
    { value: 'good', label: t('common.good') },
    { value: 'average', label: t('common.average') },
    { value: 'needs_improvement', label: t('common.needs_improvement') }
  ];

  const sortOptions = [
    { value: 'progress', label: t('common.progress') },
    { value: 'name', label: t('common.name') },
    { value: 'score', label: t('common.score') },
    { value: 'engagement', label: t('common.engagement') },
    { value: 'lastActive', label: t('common.last_active') },
    { value: 'performance', label: t('common.performance') }
  ];

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-500" />
          {t('dashboard.teacher.student_performance')}
        </h3>
        
        {isLoading && <div className="h-20 bg-gray-100 rounded-lg animate-pulse mb-3" />}

        <div className="space-y-4">
          {filteredAndSortedStudents.slice(0, 5).map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              compact
              getPerformanceColor={getPerformanceColor}
              getEngagementColor={getEngagementColor}
              formatTimeAgo={formatTimeAgo}
              t={t}
            />
          ))}
        </div>

        {filteredAndSortedStudents.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('students.no_student_data')}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('dashboard.teacher.student_performance')}</h2>
          <p className="text-gray-600 mt-1">{t('students.track_analyze_progress')}</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          <div className="text-sm text-gray-500">
            {filteredAndSortedStudents.length} {t('common.students')}
            {isLoading && <span className="ml-2 text-xs text-gray-400">{t('common.loading')}</span>}
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{exporting ? t('common.exporting') : t('common.export')}</span>
          </button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">{performanceStats.excellent.toFixed(0)}%</div>
          <div className="text-sm text-green-700">{t('common.excellent')}</div>
          <div className="text-xs text-green-600 mt-1">
            {t('common.students_count', { count: Math.round(performanceStats.excellent * sourceData.length / 100) })}
          </div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{performanceStats.good.toFixed(0)}%</div>
          <div className="text-sm text-blue-700">{t('common.good')}</div>
          <div className="text-xs text-blue-600 mt-1">
            {t('common.students_count', { count: Math.round(performanceStats.good * sourceData.length / 100) })}
          </div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">{performanceStats.average.toFixed(0)}%</div>
          <div className="text-sm text-yellow-700">{t('common.average')}</div>
          <div className="text-xs text-yellow-600 mt-1">
            {t('common.students_count', { count: Math.round(performanceStats.average * sourceData.length / 100) })}
          </div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-2xl font-bold text-red-600">{performanceStats.needsImprovement.toFixed(0)}%</div>
          <div className="text-sm text-red-700">{t('common.needs_improvement')}</div>
          <div className="text-xs text-red-600 mt-1">
            {t('common.students_count', { count: Math.round(performanceStats.needsImprovement * sourceData.length / 100) })}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-gray-900">{performanceStats.avgProgress.toFixed(1)}%</div>
          <div className="text-xs text-gray-600">{t('common.avg_progress')}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-gray-900">{performanceStats.avgScore.toFixed(1)}%</div>
          <div className="text-xs text-gray-600">{t('common.avg_score')}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-gray-900">{performanceStats.avgEngagement.toFixed(1)}%</div>
          <div className="text-xs text-gray-600">{t('common.avg_engagement')}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-gray-900">
            {formatTimeSpent(performanceStats.totalTimeSpent)}
          </div>
          <div className="text-xs text-gray-600">{t('common.total_time_spent')}</div>
        </div>
      </div>

      {/* Filters and Actions */}
      {showFilters && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('common.search_students')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Performance Filter */}
            <select
              value={performanceFilter}
              onChange={(e) => setPerformanceFilter(e.target.value as PerformanceLevel | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {performanceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {t('common.sort_by')} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedStudents.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {t('common.selected_count', { count: selectedStudents.size })}
              </span>
              <button
                onClick={handleSendMessage}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>{t('common.send_message')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Students List */}
      <div className="space-y-3">
        {filteredAndSortedStudents.map((student) => (
          <StudentCard
            key={student.id}
            student={student}
            isSelected={selectedStudents.has(student.id)}
            onSelect={handleSelectStudent}
            getPerformanceColor={getPerformanceColor}
            getPerformanceIcon={getPerformanceIcon}
            getEngagementColor={getEngagementColor}
            getScoreColor={getScoreColor}
            formatTimeAgo={formatTimeAgo}
            formatTimeSpent={formatTimeSpent}
            t={t}
          />
        ))}
      </div>

      {filteredAndSortedStudents.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || performanceFilter !== 'all'
              ? t('students.no_students_match_filters')
              : t('students.no_students_yet')
            }
          </h3>
          <p className="text-gray-600">
            {t('students.student_data_will_appear')}
          </p>
        </div>
      )}
    </div>
  );
};

// Student Card Component
interface StudentCardProps {
  student: Student;
  isSelected?: boolean;
  onSelect?: (studentId: string) => void;
  compact?: boolean;
  getPerformanceColor: (performance: PerformanceLevel) => string;
  getPerformanceIcon?: (performance: PerformanceLevel) => React.ReactNode;
  getEngagementColor: (engagement: number) => string;
  getScoreColor?: (score: number) => string;
  formatTimeAgo: (timestamp: string) => string;
  formatTimeSpent?: (minutes: number) => string;
  t: (key: string, params?: any) => string;
}

const StudentCard: React.FC<StudentCardProps> = ({
  student,
  isSelected = false,
  onSelect,
  compact = false,
  getPerformanceColor,
  getPerformanceIcon,
  getEngagementColor,
  getScoreColor,
  formatTimeAgo,
  formatTimeSpent,
  t
}) => {
  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
        <div className="flex items-center space-x-3">
          {student.avatar ? (
            <img
              src={student.avatar}
              alt={student.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs text-white font-medium">
              {student.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium text-gray-900 text-sm truncate">
              {student.name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {student.course}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPerformanceColor(student.performance)}`}>
            {t(`common.${student.performance}`)}
          </span>
          <div className={`text-sm font-semibold ${getEngagementColor(student.engagement)}`}>
            {student.engagement}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
      isSelected 
        ? 'border-blue-300 bg-blue-50 shadow-sm' 
        : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'
    }`}>
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        {/* Selection Checkbox */}
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(student.id)}
            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
          />
        )}

        {/* Avatar */}
        {student.avatar ? (
          <img
            src={student.avatar}
            alt={student.name}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-sm text-white font-medium">
            {student.name.charAt(0)}
          </div>
        )}
        
        {/* Student Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-semibold text-gray-900 truncate">{student.name}</h4>
            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getPerformanceColor(student.performance)}`}>
              {getPerformanceIcon && getPerformanceIcon(student.performance)}
              <span>{t(`common.${student.performance}`)}</span>
            </span>
          </div>
          <div className="text-sm text-gray-600 truncate">{student.course}</div>
          <div className="text-xs text-gray-500">{student.email}</div>
          
          {/* Progress Bar */}
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('common.progress')}</span>
              <span>{student.completedLessons}/{student.totalLessons} {t('common.lessons')}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${student.progress}%` }}
              />
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <UserCheck className="h-3 w-3" />
              <span>{student.attendance}% {t('common.attendance')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <BookOpen className="h-3 w-3" />
              <span>{student.assignmentsCompleted}/{student.totalAssignments}</span>
            </div>
            {student.streak > 0 && (
              <div className="flex items-center space-x-1">
                <Zap className="h-3 w-3 text-orange-500" />
                <span>{student.streak} {t('common.day_streak')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="flex items-center space-x-6 ml-4">
        {/* Engagement Score */}
        <div className="text-center">
          <div className={`text-lg font-bold px-3 py-1 rounded-lg ${getEngagementColor(student.engagement)}`}>
            {student.engagement}%
          </div>
          <div className="text-xs text-gray-500">{t('common.engagement')}</div>
        </div>

        {/* Score */}
        <div className="text-center">
          <div className={`text-lg font-bold ${getScoreColor ? getScoreColor(student.score) : 'text-gray-900'}`}>
            {student.score}%
          </div>
          <div className="text-xs text-gray-500">{t('common.score')}</div>
        </div>

        {/* Time Spent */}
        {formatTimeSpent && (
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900">
              {formatTimeSpent(student.timeSpent)}
            </div>
            <div className="text-xs text-gray-500">{t('common.time_spent')}</div>
          </div>
        )}

        {/* Last Active */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">
            {formatTimeAgo(student.lastActive)}
          </div>
          <div className="text-xs text-gray-500">{t('common.last_active')}</div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1">
          <button
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title={t('common.send_message')}
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <button
            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
            title={t('common.view_profile')}
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(StudentPerformance);