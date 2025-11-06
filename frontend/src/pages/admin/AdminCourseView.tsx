import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { coursesApi } from '../../services/api';
import { 
  ArrowLeft, BookOpen, Users, BarChart, Settings, 
  Eye, EyeOff, Trash2, Edit, Calendar, TrendingUp,
  CheckCircle, XCircle, Clock, PlayCircle, AlertTriangle
} from 'lucide-react';

const AdminCourseView: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    completionRate: 0,
    totalLessons: 0,
    publishedLessons: 0,
    averageProgress: 0
  });

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      
      // Load course details
      const response = await coursesApi.getCourse(courseId);
      setCourse(response.data.course);

      // Load analytics
      const analyticsResponse = await coursesApi.getCourseAnalytics(courseId);
      const analytics = analyticsResponse.data.analytics;

      setStats({
        totalStudents: analytics.totalEnrollments || 0,
        activeStudents: analytics.activeStudents || 0,
        completionRate: parseFloat(analytics.completionRate) || 0,
        totalLessons: analytics.lessonCount || 0,
        publishedLessons: analytics.lessonCount || 0,
        averageProgress: analytics.averageProgress || 0
      });

    } catch (error) {
      console.error('Failed to load course data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-t-2 border-purple-600 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course management...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Not Found</h3>
        <Link
          to="/admin/content"
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Content Management
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
        <Link
          to="/admin/content"
          className="inline-flex items-center text-sm font-medium text-white/90 hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Content Management
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              {course.is_published ? (
                <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Published
                </span>
              ) : (
                <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Draft
                </span>
              )}
            </div>
            <p className="text-purple-100 text-sm mb-3">
              {course.description || 'No description provided'}
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Created: {new Date(course.created_at).toLocaleDateString()}
              </span>
              {course.published_at && (
                <span className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  Published: {new Date(course.published_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              to={`/courses/${courseId}`}
              className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Eye className="h-4 w-4 mr-2" />
              Student View
            </Link>
            <Link
              to={`/courses/${courseId}/edit`}
              className="inline-flex items-center px-4 py-2 bg-white text-purple-600 hover:bg-purple-50 text-sm font-medium rounded-lg transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Course
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Students</span>
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.activeStudents} active
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Completion Rate</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
          <p className="text-xs text-gray-500 mt-1">
            Average progress: {stats.averageProgress.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Lessons</span>
            <PlayCircle className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalLessons}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.publishedLessons} published
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Status</span>
            <Settings className="h-5 w-5 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {course.is_published ? 'Live' : 'Draft'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {course.level || 'No level set'}
          </p>
        </div>
      </div>

      {/* Course Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
            Course Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{course.category || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Level</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{course.level || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created By</dt>
              <dd className="mt-1 text-sm text-gray-900">User ID: {course.created_by}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(course.updated_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Admin Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Settings className="h-5 w-5 mr-2 text-purple-600" />
            Admin Actions
          </h2>
          <div className="space-y-3">
            <Link
              to={`/courses/${courseId}/edit`}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Course Details
            </Link>
            
            <Link
              to={`/courses/${courseId}/analytics`}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <BarChart className="h-4 w-4 mr-2" />
              View Analytics
            </Link>

            {course.is_published ? (
              <button
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-yellow-300 text-sm font-medium rounded-lg text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Unpublish Course
              </button>
            ) : (
              <button
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-green-300 text-sm font-medium rounded-lg text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                Publish Course
              </button>
            )}

            <button
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Course
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-purple-600" />
          Recent Activity
        </h2>
        <p className="text-sm text-gray-500">Activity tracking coming soon...</p>
      </div>
    </div>
  );
};

export default AdminCourseView;
