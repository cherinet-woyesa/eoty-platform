import React, { useCallback, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Video, BookOpen, Users, Zap, BarChart, Plus, 
  FileText, MessageCircle, Settings, Bell, Star,
  TrendingUp, Award, Download, Upload, Calendar,
  PlayCircle, Eye, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';

// Types
interface QuickAction {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  color: string;
  bgColor: string;
  requiredRole?: string;
  badge?: string;
  disabled?: boolean;
}

interface QuickStats {
  totalCourses: number;
  activeStudents: number;
  averageRating: number;
  totalLessons: number;
  pendingTasks: number;
  unreadMessages: number;
}

interface QuickActionsProps {
  showStats?: boolean;
  compact?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({ 
  showStats = true,
  compact = false 
}) => {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [recentActions, setRecentActions] = useState<string[]>([]);

  // Mock stats - in real app, this would come from API
  const quickStats: QuickStats = useMemo(() => ({
    totalCourses: 8,
    activeStudents: 247,
    averageRating: 4.8,
    totalLessons: 156,
    pendingTasks: 3,
    unreadMessages: 12
  }), []);

  const actions: QuickAction[] = useMemo(() => [
    {
      icon: <Video className="h-5 w-5" />,
      label: t('dashboard.teacher.record_new_video'),
      description: t('courses.create_new_lesson'),
      href: '/record',
      color: 'from-red-500 to-pink-600',
      bgColor: 'bg-red-50',
      badge: 'new'
    },
    {
      icon: <BookOpen className="h-5 w-5" />,
      label: t('dashboard.teacher.create_course'),
      description: t('courses.start_new_course'),
      href: '/courses/new',
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: t('common.manage_students'),
      description: t('dashboard.teacher.view_student_progress'),
      href: '/teacher/students',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: <BarChart className="h-5 w-5" />,
      label: t('dashboard.teacher.view_analytics'),
      description: t('dashboard.teacher.view_course_analytics'),
      href: '/analytics',
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: t('common.resources'),
      description: t('courses.upload_materials'),
      href: '/resources',
      color: 'from-orange-500 to-amber-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: <MessageCircle className="h-5 w-5" />,
      label: t('common.discussions'),
      description: t('courses.answer_questions'),
      href: '/forums',
      color: 'from-pink-500 to-rose-600',
      bgColor: 'bg-pink-50',
      badge: quickStats.unreadMessages > 0 ? quickStats.unreadMessages.toString() : undefined
    },
    {
      icon: <Bell className="h-5 w-5" />,
      label: t('common.notifications'),
      description: t('dashboard.teacher.manage_notifications'),
      href: '/notifications',
      color: 'from-yellow-500 to-orange-600',
      bgColor: 'bg-yellow-50',
      requiredRole: 'teacher'
    },
    {
      icon: <Settings className="h-5 w-5" />,
      label: t('common.settings'),
      description: t('dashboard.teacher.account_settings'),
      href: '/settings',
      color: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50'
    },
    {
      icon: <Download className="h-5 w-5" />,
      label: t('common.export_data'),
      description: t('dashboard.teacher.export_reports'),
      href: '/export',
      color: 'from-teal-500 to-cyan-600',
      bgColor: 'bg-teal-50'
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      label: t('common.schedule'),
      description: t('dashboard.teacher.manage_calendar'),
      href: '/calendar',
      color: 'from-indigo-500 to-purple-600',
      bgColor: 'bg-indigo-50'
    },
    {
      icon: <Award className="h-5 w-5" />,
      label: t('common.achievements'),
      description: t('dashboard.teacher.view_badges'),
      href: '/achievements',
      color: 'from-amber-500 to-yellow-600',
      bgColor: 'bg-amber-50'
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: t('common.performance'),
      description: t('dashboard.teacher.view_insights'),
      href: '/performance',
      color: 'from-lime-500 to-green-600',
      bgColor: 'bg-lime-50'
    }
  ], [t, quickStats.unreadMessages]);

  const filteredActions = useMemo(() => {
    return actions.filter(action => 
      !action.requiredRole || hasRole(action.requiredRole)
    );
  }, [actions, hasRole]);

  const handleActionClick = useCallback((action: QuickAction) => {
    // Track recent actions for personalization
    setRecentActions(prev => {
      const updated = [action.label, ...prev.filter(a => a !== action.label)].slice(0, 3);
      return updated;
    });

    // Analytics tracking
    console.log(`Quick action clicked: ${action.label}`);
    
    // In real app, you might want to send this to your analytics service
    // analytics.track('quick_action_clicked', {
    //   action: action.label,
    //   timestamp: new Date().toISOString()
    // });
  }, []);

  const getFrequentActions = useMemo(() => {
    // In real app, this would be based on user behavior analytics
    const frequentActions = ['Record New Video', 'View Analytics', 'Manage Students'];
    return filteredActions.filter(action => 
      frequentActions.includes(action.label)
    ).slice(0, 3);
  }, [filteredActions]);

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-yellow-500" />
          {t('dashboard.teacher.quick_actions')}
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          {filteredActions.slice(0, 4).map((action, index) => (
            <QuickActionButton
              key={index}
              action={action}
              onClick={handleActionClick}
              compact
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-yellow-500" />
            {t('dashboard.teacher.quick_actions')}
          </h3>
          <p className="text-gray-600 text-sm mt-1">
            {t('dashboard.teacher.quick_access_tools')}
          </p>
        </div>
        
        {/* Recent Actions Badge */}
        {recentActions.length > 0 && (
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{t('common.recent')}: {recentActions[0]}</span>
          </div>
        )}
      </div>
      
      {/* Main Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
        {filteredActions.map((action, index) => (
          <QuickActionButton
            key={index}
            action={action}
            onClick={handleActionClick}
          />
        ))}
      </div>

      {/* Frequent Actions Section */}
      {getFrequentActions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
            {t('dashboard.teacher.frequent_actions')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {getFrequentActions.map((action, index) => (
              <Link
                key={index}
                to={action.href}
                onClick={() => handleActionClick(action)}
                className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center mr-3 flex-shrink-0`}>
                  <div className="text-white">
                    {action.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                    {action.label}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {action.description}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {showStats && (
        <div className="pt-6 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              icon={<BookOpen className="h-4 w-4" />}
              value={quickStats.totalCourses}
              label={t('dashboard.teacher.total_courses')}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <StatCard
              icon={<Users className="h-4 w-4" />}
              value={quickStats.activeStudents}
              label={t('dashboard.teacher.active_students')}
              color="text-green-600"
              bgColor="bg-green-50"
            />
            <StatCard
              icon={<Star className="h-4 w-4" />}
              value={quickStats.averageRating}
              label={t('dashboard.teacher.average_rating')}
              color="text-yellow-600"
              bgColor="bg-yellow-50"
              isRating
            />
            <StatCard
              icon={<PlayCircle className="h-4 w-4" />}
              value={quickStats.totalLessons}
              label={t('dashboard.teacher.total_lessons')}
              color="text-purple-600"
              bgColor="bg-purple-50"
            />
            <StatCard
              icon={<CheckCircle className="h-4 w-4" />}
              value={quickStats.pendingTasks}
              label={t('dashboard.teacher.pending_tasks')}
              color="text-orange-600"
              bgColor="bg-orange-50"
              isAlert={quickStats.pendingTasks > 0}
            />
            <StatCard
              icon={<MessageCircle className="h-4 w-4" />}
              value={quickStats.unreadMessages}
              label={t('dashboard.teacher.unread_messages')}
              color="text-pink-600"
              bgColor="bg-pink-50"
              isAlert={quickStats.unreadMessages > 0}
            />
          </div>

          {/* Stats Summary */}
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {t('dashboard.teacher.performance_summary')}
                </span>
              </div>
              <div className="text-xs text-blue-700">
                {t('common.this_week')}: +12% {t('common.engagement')}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-gray-900">98%</div>
                <div className="text-gray-600">{t('common.uptime')}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">4.2m</div>
                <div className="text-gray-600">{t('common.avg_watch_time')}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">87%</div>
                <div className="text-gray-600">{t('common.satisfaction')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
          <Zap className="h-4 w-4 mr-2 text-yellow-500" />
          {t('dashboard.teacher.quick_tips')}
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            <span>{t('dashboard.teacher.tip_upload_regularly')}</span>
          </li>
          <li className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>{t('dashboard.teacher.tip_engage_students')}</span>
          </li>
          <li className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
            <span>{t('dashboard.teacher.tip_check_analytics')}</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

// Quick Action Button Component
interface QuickActionButtonProps {
  action: QuickAction;
  onClick: (action: QuickAction) => void;
  compact?: boolean;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ 
  action, 
  onClick, 
  compact = false 
}) => {
  if (compact) {
    return (
      <Link
        to={action.href}
        onClick={() => onClick(action)}
        className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-200 group ${
          action.disabled 
            ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' 
            : 'border-gray-100 hover:shadow-md hover:border-gray-200 ' + action.bgColor
        }`}
      >
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow mb-2`}>
          <div className="text-white">
            {action.icon}
          </div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-900 text-xs group-hover:text-gray-700">
            {action.label}
          </div>
        </div>
        {action.badge && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {action.badge}
          </div>
        )}
      </Link>
    );
  }

  return (
    <Link
      to={action.href}
      onClick={() => onClick(action)}
      className={`relative flex flex-col items-center p-4 rounded-xl border transition-all duration-200 group hover:scale-105 ${
        action.disabled 
          ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' 
          : 'border-gray-100 hover:shadow-md hover:border-gray-200 ' + action.bgColor
      }`}
    >
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow mb-3`}>
        <div className="text-white">
          {action.icon}
        </div>
      </div>
      <div className="text-center">
        <div className="font-medium text-gray-900 text-sm mb-1 group-hover:text-gray-700 transition-colors">
          {action.label}
        </div>
        <div className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">
          {action.description}
        </div>
      </div>
      
      {/* Badge */}
      {action.badge && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-sm">
          {action.badge}
        </div>
      )}
      
      {/* Disabled Overlay */}
      {action.disabled && (
        <div className="absolute inset-0 bg-white bg-opacity-50 rounded-xl flex items-center justify-center">
          <AlertCircle className="h-5 w-5 text-gray-400" />
        </div>
      )}
    </Link>
  );
};

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  bgColor: string;
  isRating?: boolean;
  isAlert?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  color,
  bgColor,
  isRating = false,
  isAlert = false
}) => {
  return (
    <div className={`text-center p-3 rounded-lg border transition-colors ${
      isAlert ? 'border-red-200 bg-red-50' : 'border-gray-200 ' + bgColor
    }`}>
      <div className={`mx-auto mb-2 ${color}`}>
        {icon}
      </div>
      <div className={`text-lg font-bold ${isAlert ? 'text-red-600' : 'text-gray-900'}`}>
        {isRating ? value.toFixed(1) : value}
        {isRating && <Star className="h-3 w-3 text-yellow-500 inline ml-0.5" />}
      </div>
      <div className={`text-xs ${isAlert ? 'text-red-700' : 'text-gray-600'}`}>
        {label}
      </div>
    </div>
  );
};

export default React.memo(QuickActions);