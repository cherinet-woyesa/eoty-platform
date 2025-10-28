import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Video, BookOpen, Users, BarChart, 
  Plus, ArrowRight, PlayCircle
} from 'lucide-react';

const TeacherDashboard: React.FC = () => {
  // Mock data - will come from API later
  const stats = [
    { name: 'Total Courses', value: '12', icon: BookOpen, change: '+2', changeType: 'positive' },
    { name: 'Students', value: '247', icon: Users, change: '+12', changeType: 'positive' },
    { name: 'Videos Recorded', value: '34', icon: Video, change: '+5', changeType: 'positive' },
    { name: 'Completion Rate', value: '89%', icon: BarChart, change: '+3%', changeType: 'positive' },
  ];

  const recentCourses = [
    { id: 1, title: 'Introduction to Orthodox Faith', students: 45, progress: 89, lastUpdated: '2 hours ago' },
    { id: 2, title: 'Church History Fundamentals', students: 32, progress: 76, lastUpdated: '1 day ago' },
    { id: 3, title: 'Spiritual Development', students: 28, progress: 92, lastUpdated: '3 days ago' },
  ];

  const quickActions = [
    {
      title: 'Record New Video',
      description: 'Create a new video lesson for your students',
      icon: Video,
      href: '/record',
      color: 'from-blue-500 to-blue-600',
      buttonText: 'Start Recording'
    },
    {
      title: 'Create Course',
      description: 'Organize your lessons into a structured course',
      icon: BookOpen,
      href: '/courses/new',
      color: 'from-purple-500 to-purple-600',
      buttonText: 'Create Course'
    },
    {
      title: 'View Analytics',
      description: 'See how your students are progressing',
      icon: BarChart,
      href: '/analytics',
      color: 'from-green-500 to-green-600',
      buttonText: 'View Reports'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, Teacher!</h1>
            <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
              Continue inspiring the youth with your teachings. You have 3 new student submissions waiting for review.
            </p>
          </div>
          <Link
            to="/record"
            className="mt-4 lg:mt-0 inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-blue-600 bg-white hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            <Video className="mr-2 h-5 w-5" />
            Record New Lesson
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-gradient-to-br from-white to-blue-50 overflow-hidden rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-sm">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-semibold text-gray-700 truncate">{stat.name}</dt>
                    <dd className="flex items-baseline mt-1">
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className={`ml-2 flex items-baseline text-xs font-bold ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.title}
                className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-md`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-gray-600 mb-5 leading-relaxed">{action.description}</p>
                <Link
                  to={action.href}
                  className="inline-flex items-center text-base font-semibold text-blue-600 hover:text-blue-700 group"
                >
                  {action.buttonText}
                  <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Courses */}
      <div className="bg-gradient-to-b from-white to-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-bold text-gray-900">Recent Courses</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentCourses.map((course) => (
            <div key={course.id} className="px-6 py-5 hover:bg-blue-50 transition-all duration-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center mb-3 md:mb-0">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                    <PlayCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-bold text-gray-900">{course.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {course.students} students • Updated {course.lastUpdated}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-5">
                  <div className="">
                    <p className="text-base font-semibold text-gray-900 text-center md:text-right">{course.progress}% Complete</p>
                    <div className="w-32 bg-gray-200 rounded-full h-2.5 mt-1.5">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2.5 rounded-full" 
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    to={`/courses/${course.id}`}
                    className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    View Course
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200 rounded-b-2xl">
          <Link
            to="/courses"
            className="inline-flex items-center text-base font-semibold text-blue-600 hover:text-blue-700 group"
          >
            View all courses
            <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;