import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Video, BookOpen, Users, BarChart, 
  Plus, ArrowRight, PlayCircle, TrendingUp,
  Clock, Eye, Star, Zap, Target, Award,
  ChevronRight, Activity, Bookmark, MessageCircle
} from 'lucide-react';

const TeacherDashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock data with more realistic numbers
  const stats = [
    { 
      name: 'Active Courses', 
      value: '8', 
      icon: BookOpen, 
      change: '+2', 
      changeType: 'positive',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100'
    },
    { 
      name: 'Total Students', 
      value: '247', 
      icon: Users, 
      change: '+12', 
      changeType: 'positive',
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100'
    },
    { 
      name: 'Videos Created', 
      value: '34', 
      icon: Video, 
      change: '+5', 
      changeType: 'positive',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100'
    },
    { 
      name: 'Avg. Rating', 
      value: '4.8', 
      icon: Star, 
      change: '+0.2', 
      changeType: 'positive',
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'from-yellow-50 to-orange-100'
    },
  ];

  const recentCourses = [
    { 
      id: 1, 
      title: 'Introduction to Orthodox Faith', 
      students: 45, 
      progress: 89, 
      lastUpdated: '2 hours ago',
      rating: 4.9,
      duration: '2h 30m',
      lessons: 12
    },
    { 
      id: 2, 
      title: 'Church History Fundamentals', 
      students: 32, 
      progress: 76, 
      lastUpdated: '1 day ago',
      rating: 4.7,
      duration: '1h 45m',
      lessons: 8
    },
    { 
      id: 3, 
      title: 'Spiritual Development', 
      students: 28, 
      progress: 92, 
      lastUpdated: '3 days ago',
      rating: 4.8,
      duration: '3h 15m',
      lessons: 15
    },
  ];

  const quickActions = [
    {
      title: 'Record Video',
      description: 'Create engaging video lessons',
      icon: Video,
      href: '/record-video',
      color: 'from-red-500 to-pink-600',
      bgColor: 'from-red-50 to-pink-50',
      buttonText: 'Start Recording'
    },
    {
      title: 'Create Course',
      description: 'Organize lessons into courses',
      icon: BookOpen,
      href: '/courses/new',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'from-blue-50 to-indigo-50',
      buttonText: 'New Course'
    },
    {
      title: 'View Analytics',
      description: 'Track student progress',
      icon: BarChart,
      href: '/analytics',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'from-green-50 to-emerald-50',
      buttonText: 'View Reports'
    },
    {
      title: 'Manage Students',
      description: 'Connect with your learners',
      icon: Users,
      href: '/students',
      color: 'from-purple-500 to-violet-600',
      bgColor: 'from-purple-50 to-violet-50',
      buttonText: 'View Students'
    },
  ];

  const recentActivity = [
    { action: 'New video uploaded', course: 'Orthodox Faith', time: '2 hours ago', type: 'video' },
    { action: 'Student completed lesson', course: 'Church History', time: '4 hours ago', type: 'completion' },
    { action: 'Course published', course: 'Spiritual Development', time: '1 day ago', type: 'publish' },
    { action: 'New student enrolled', course: 'Introduction to Orthodox Faith', time: '2 days ago', type: 'enrollment' },
  ];

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Welcome Section - Compact and Modern */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold">Welcome back!</h1>
              <div className="hidden sm:flex items-center space-x-1 text-blue-100 text-sm">
                <Clock className="h-3 w-3" />
                <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            <p className="text-blue-100 text-sm sm:text-base max-w-2xl leading-relaxed">
              Continue inspiring the youth with your teachings. You have 3 new student submissions waiting for review.
            </p>
          </div>
          <Link
            to="/record-video"
            className="mt-4 lg:mt-0 inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-blue-600 bg-white hover:bg-blue-50 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <Video className="mr-2 h-4 w-4" />
            Record New Lesson
          </Link>
        </div>
      </div>

      {/* Stats Grid - Compact Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className={`bg-gradient-to-br ${stat.bgColor} overflow-hidden rounded-lg border border-gray-200/60 p-3 sm:p-4 hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 truncate">{stat.name}</p>
                  <div className="flex items-baseline mt-1">
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{stat.value}</p>
                    <span className={`ml-2 text-xs font-semibold ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} shadow-sm`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions - Responsive Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Zap className="h-3 w-3" />
            <span>Get started</span>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.href}
                className={`bg-gradient-to-br ${action.bgColor} rounded-lg border border-gray-200/60 p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 group`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} shadow-sm`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{action.title}</h3>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">{action.description}</p>
                <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                  {action.buttonText}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Courses - Compact Table Style */}
      <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Courses</h2>
            <Link
              to="/courses"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center"
            >
              View all
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {recentCourses.map((course) => (
            <div key={course.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                    <PlayCircle className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{course.title}</h3>
                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {course.students} students
                      </span>
                      <span className="flex items-center">
                        <Star className="h-3 w-3 mr-1" />
                        {course.rating}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {course.duration}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{course.progress}%</p>
                    <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    to={`/courses/${course.id}`}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-md text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity - Compact Feed */}
      <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-green-50/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Activity className="h-3 w-3" />
              <span>Live updates</span>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.map((activity, index) => (
            <div key={index} className="px-4 py-3 hover:bg-gray-50/50 transition-colors duration-150">
              <div className="flex items-start space-x-3">
                <div className={`p-1.5 rounded-full ${
                  activity.type === 'video' ? 'bg-red-100' :
                  activity.type === 'completion' ? 'bg-green-100' :
                  activity.type === 'publish' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  {activity.type === 'video' && <Video className="h-3 w-3 text-red-600" />}
                  {activity.type === 'completion' && <Award className="h-3 w-3 text-green-600" />}
                  {activity.type === 'publish' && <BookOpen className="h-3 w-3 text-blue-600" />}
                  {activity.type === 'enrollment' && <Users className="h-3 w-3 text-purple-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.course} • {activity.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;