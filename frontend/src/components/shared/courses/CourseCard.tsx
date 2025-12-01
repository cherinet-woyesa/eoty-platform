import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  BookOpen, Users, Clock, PlayCircle, Edit3, Video, 
  MoreVertical, Trash2, Eye, BarChart3,
  Calendar, Target, Zap, CheckCircle
} from 'lucide-react';

interface CourseCardProps {
  course: {
    id: number;
    title: string;
    description: string;
    category: string;
    level: string;
    created_at: string;
    updated_at: string;
    lesson_count: number;
    student_count: number;
    total_duration: number;
    is_published: boolean;
    published_at?: string;
    cover_image?: string;
    coverImage?: string;
  };
  viewMode?: 'grid' | 'list';
  onDelete?: (courseId: number) => void;
  onPublish?: (courseId: number) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  viewMode = 'grid',
  onDelete,
  onPublish 
}) => {
  const { user } = useAuth();
  const role = user?.role;
  const baseCoursePath =
    role === 'admin'
      ? '/admin/courses'
      : role === 'teacher'
      ? '/teacher/courses'
      : '/student/courses';
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      faith: 'from-blue-500 to-blue-600',
      history: 'from-purple-500 to-purple-600',
      spiritual: 'from-green-500 to-green-600',
      bible: 'from-orange-500 to-orange-600',
      liturgical: 'from-red-500 to-red-600',
      youth: 'from-pink-500 to-pink-600'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      faith: BookOpen,
      history: Calendar,
      spiritual: Zap,
      bible: BookOpen,
      liturgical: Target,
      youth: Users
    };
    return icons[category] || BookOpen;
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const courseDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - courseDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return courseDate.toLocaleDateString();
  };

  const handleDelete = async () => {
    if (onDelete && window.confirm('Are you sure you want to delete this course?')) {
      setIsDeleting(true);
      try {
        await onDelete(course.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handlePublish = async () => {
    if (onPublish) {
      await onPublish(course.id);
    }
  };

  const CategoryIcon = getCategoryIcon(course.category);

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 group">
        <div className="flex items-center space-x-4">
          <div className={`w-16 h-16 bg-gradient-to-r ${getCategoryColor(course.category)} rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
            <CategoryIcon className="h-8 w-8" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {course.cover_image && (
                  <img src={course.cover_image} alt={course.title} className="w-24 h-16 object-cover rounded-md mr-4 float-left" />
                )}
                <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-500 truncate mt-1">
                  {course.description || 'No description provided'}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
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
                    <span>{formatDuration(course.total_duration)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      course.is_published 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <Link
                  to={`${baseCoursePath}/${course.id}`}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="View Course"
                >
                  <Eye className="h-4 w-4" />
                </Link>
                <Link
                  to={`${baseCoursePath}/${course.id}/edit`}
                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                  title="Edit Course"
                >
                  <Edit3 className="h-4 w-4" />
                </Link>
                <Link
                  to={`/record?course=${course.id}`}
                  className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                  title="Add Lesson"
                >
                  <Video className="h-4 w-4" />
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                      <div className="py-1">
                        <button
                          onClick={handlePublish}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <CheckCircle className="mr-3 h-4 w-4" />
                          {course.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => {/* Analytics */}}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <BarChart3 className="mr-3 h-4 w-4" />
                          Analytics
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="mr-3 h-4 w-4" />
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 group">
      {course.cover_image && (
        <img src={course.cover_image} alt={course.title} className="w-full h-32 object-cover" />
      )}
      {/* Course Header - Compact */}
      <div className={`bg-gradient-to-r ${getCategoryColor(course.category)} p-3 text-white relative`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5 mr-16">
              <div className="flex items-center space-x-1.5">
                <CategoryIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium opacity-90 capitalize">
                  {course.category.replace('_', ' ')}
                </span>
              </div>
            </div>
            <h3 className="text-sm font-bold mb-1 line-clamp-2">{course.title}</h3>
            <p className="text-blue-100 text-xs line-clamp-2 opacity-90">
              {course.description || 'No description provided'}
            </p>
          </div>
          <div className="flex space-x-1 ml-2">
            <Link
              to={`${baseCoursePath}/${course.id}`}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-md transition-colors"
              title="View Course"
            >
              <Eye className="h-3 w-3" />
            </Link>
            <Link
              to={`${baseCoursePath}/${course.id}/edit`}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-md transition-colors"
              title="Edit Course"
            >
              <Edit3 className="h-3 w-3" />
            </Link>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-md transition-colors"
              >
                <MoreVertical className="h-3 w-3" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={handlePublish}
                      className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <CheckCircle className="mr-2 h-3 w-3" />
                      {course.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => {/* Analytics */}}
                      className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <BarChart3 className="mr-2 h-3 w-3" />
                      Analytics
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex items-center w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Status Badge - Compact */}
        <div className="absolute top-2 right-2">
          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
            course.is_published 
              ? 'bg-green-500 text-white' 
              : 'bg-yellow-500 text-white'
          }`}>
            {course.is_published ? 'Live' : 'Draft'}
          </span>
        </div>
      </div>

      {/* Course Stats - Compact */}
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="bg-blue-50 rounded-md p-2 hover:bg-blue-100 transition-colors">
            <Video className="h-3 w-3 text-blue-600 mx-auto mb-1" />
            <div className="text-sm font-bold text-gray-900">{course.lesson_count}</div>
            <div className="text-xs text-gray-500">Lessons</div>
          </div>
          <div className="bg-purple-50 rounded-md p-2 hover:bg-purple-100 transition-colors">
            <Users className="h-3 w-3 text-purple-600 mx-auto mb-1" />
            <div className="text-sm font-bold text-gray-900">{course.student_count}</div>
            <div className="text-xs text-gray-500">Students</div>
          </div>
          <div className="bg-green-50 rounded-md p-2 hover:bg-green-100 transition-colors">
            <Clock className="h-3 w-3 text-green-600 mx-auto mb-1" />
            <div className="text-sm font-bold text-gray-900">{formatDuration(course.total_duration)}</div>
            <div className="text-xs text-gray-500">Duration</div>
          </div>
        </div>

        {/* Course Metadata - Compact */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          <span className="capitalize bg-gray-100 px-1.5 py-0.5 rounded text-xs font-medium">
            {course.level || 'Beginner'}
          </span>
          <span className="text-gray-500 text-xs">
            {getTimeAgo(course.created_at)}
          </span>
        </div>

        {/* Action Buttons - Compact */}
        <div className="flex space-x-1.5">
          <Link
            to={`/courses/${course.id}`}
            className="flex-1 inline-flex items-center justify-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <PlayCircle className="mr-1 h-3 w-3" />
            View
          </Link>
          <Link
            to={`/record?course=${course.id}`}
            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            title="Add Lesson"
          >
            <Video className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;