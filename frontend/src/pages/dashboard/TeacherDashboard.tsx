import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Video, BookOpen, Users, BarChart, 
  Plus, ArrowRight, PlayCircle, TrendingUp,
  Clock, Eye, Star, Zap, Target, Award,
  ChevronRight, Activity, Bookmark, MessageCircle,
  Loader2, AlertCircle, CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi, CourseStats, DashboardStats, RecentActivity, Notification } from '../../services/api/dashboard';

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [courses, setCourses] = useState<CourseStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all dashboard data in parallel
        const [statsResponse, coursesResponse, activityResponse, notificationsResponse] = await Promise.all([
          dashboardApi.getTeacherStats(),
          dashboardApi.getTeacherCourses(),
          dashboardApi.getRecentActivity(),
          dashboardApi.getNotifications()
        ]);

        if (statsResponse.success) {
          setDashboardStats(statsResponse.data);
        }

        if (coursesResponse.success) {
          setCourses(coursesResponse.data.courses);
        }

        if (activityResponse.success) {
          setRecentActivity(activityResponse.data);
        }

        if (notificationsResponse.success) {
          setNotifications(notificationsResponse.data);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Convert real data to stats format
  const stats = dashboardStats ? [
    { 
      name: 'Active Courses', 
      value: dashboardStats.totalCourses.toString(), 
      icon: BookOpen, 
      change: '+2', 
      changeType: 'positive',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100'
    },
    { 
      name: 'Total Students', 
      value: dashboardStats.totalStudents.toString(), 
      icon: Users, 
      change: '+12', 
      changeType: 'positive',
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100'
    },
    { 
      name: 'Video Lessons', 
      value: dashboardStats.totalLessons.toString(), 
      icon: Video, 
      change: '+8', 
      changeType: 'positive',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100'
    },
    { 
      name: 'Hours Taught', 
      value: dashboardStats.totalHours.toString(), 
      icon: Clock, 
      change: '+15', 
      changeType: 'positive',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100'
    }
  ] : [];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'course_created':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'lesson_uploaded':
        return <Video className="h-4 w-4 text-purple-500" />;
      case 'student_enrolled':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'course_completed':
        return <CheckCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Loading your dashboard...</p>
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
              onClick={() => window.location.reload()}
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
      {/* Welcome Section - Compact and Modern */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold">Welcome back!</h1>
              <div className="hidden sm:flex items-center space-x-2 text-blue-100">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{formatTime(currentTime)}</span>
              </div>
            </div>
            <p className="text-blue-100 text-sm sm:text-base">
              {user?.firstName} {user?.lastName} • {formatDate(currentTime)}
            </p>
            <p className="text-blue-200 text-xs sm:text-sm mt-1">
              Ready to inspire and educate your students today?
            </p>
          </div>
          <div className="mt-4 lg:mt-0 lg:ml-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                to="/record"
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
              >
                <Video className="h-4 w-4 mr-2" />
                Record Video
              </Link>
              <Link
                to="/courses/new"
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Course
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Compact and Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => (
          <div key={index} className={`bg-gradient-to-br ${stat.bgColor} rounded-xl p-3 sm:p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} shadow-sm`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-green-700">{stat.change}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Courses - 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-500" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to="/record"
                className="flex flex-col items-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors group"
              >
                <Video className="h-6 w-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-blue-800">Record Video</span>
              </Link>
              <Link
                to="/courses/new"
                className="flex flex-col items-center p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors group"
              >
                <Plus className="h-6 w-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-green-800">New Course</span>
              </Link>
              <Link
                to="/courses"
                className="flex flex-col items-center p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors group"
              >
                <BookOpen className="h-6 w-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-purple-800">My Courses</span>
              </Link>
              <Link
                to="/analytics"
                className="flex flex-col items-center p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors group"
              >
                <BarChart className="h-6 w-6 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-orange-800">Analytics</span>
              </Link>
            </div>
          </div>

          {/* Recent Courses */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
                Recent Courses ({courses.length})
              </h3>
              <Link
                to="/courses"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            
            {courses.length > 0 ? (
              <div className="space-y-3">
                {courses.slice(0, 4).map((course) => (
                  <div key={course.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{course.title}</h4>
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
                          <span>{Math.round((course.total_duration || 0) / 60)}h</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Link
                        to={`/courses/${course.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No courses yet</p>
                <Link
                  to="/courses/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Course
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - 1/3 width on large screens */}
        <div className="space-y-4 sm:space-y-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-green-500" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-blue-500" />
              Notifications
            </h3>
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className={`flex items-start space-x-3 p-2 rounded-lg ${!notification.isRead ? 'bg-blue-50' : ''}`}>
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <p className="text-xs text-gray-500">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;