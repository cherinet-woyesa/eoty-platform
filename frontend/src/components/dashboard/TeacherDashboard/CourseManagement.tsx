import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Users, Clock, Star, MoreVertical, Plus, PlayCircle, BarChart, BookOpen } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  studentCount: number;
  lessonCount: number;
  totalDuration: number;
  rating: number;
  progress?: number;
  thumbnail?: string;
  status: 'published' | 'draft' | 'archived';
  lastUpdated: string;
}

interface CourseManagementProps {
  courses: Course[];
  compact?: boolean;
  onCourseSelect?: (courseId: string) => void;
}

const CourseManagement: React.FC<CourseManagementProps> = ({ 
  courses, 
  compact = false,
  onCourseSelect 
}) => {
  const handleCourseClick = useCallback((courseId: string) => {
    onCourseSelect?.(courseId);
  }, [onCourseSelect]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">My Courses</h3>
          <Link
            to="/courses"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </Link>
        </div>
        
        <div className="space-y-3">
          {courses.slice(0, 4).map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
              onClick={() => handleCourseClick(course.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate">{course.title}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
                    {course.status}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span>{course.studentCount} students</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <PlayCircle className="h-3 w-3" />
                    <span>{course.lessonCount} lessons</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span>{course.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseClick(course.id);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <BarChart className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No courses yet</p>
            <Link
              to="/courses/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Course
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Course Management</h2>
          <p className="text-gray-600 mt-1">Manage and track your teaching content</p>
        </div>
        <Link
          to="/courses/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Course
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
            onClick={() => handleCourseClick(course.id)}
          >
            {/* Course Thumbnail */}
            <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <BookOpen className="h-8 w-8" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${
                  course.status === 'published' ? 'bg-green-500' :
                  course.status === 'draft' ? 'bg-yellow-500' : 'bg-gray-500'
                }`}>
                  {course.status}
                </span>
              </div>
            </div>

            {/* Course Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{course.description}</p>
              
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span>{course.studentCount} students</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <PlayCircle className="h-3 w-3" />
                    <span>{course.lessonCount} lessons</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(course.totalDuration)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span>{course.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar (if applicable) */}
              {course.progress !== undefined && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navigate to course analytics
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Analytics
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navigate to course editor
                  }}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                >
                  Edit Course
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Start creating amazing learning experiences for your students. Create your first course to get started.
          </p>
          <Link
            to="/courses/new"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Course
          </Link>
        </div>
      )}
    </div>
  );
};

export default React.memo(CourseManagement);