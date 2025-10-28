import * as React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Clock, PlayCircle, Edit3, Video } from 'lucide-react';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    created_at: string;
    lesson_count?: number;
    student_count?: number;
    total_duration?: number; // Added back since we're now providing it from the backend
  };
}

const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
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

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5">
      {/* Course Header with enhanced gradient */}
      <div className={`bg-gradient-to-r ${getCategoryColor(course.category)} p-5 text-white`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2 line-clamp-2">{course.title}</h3>
            <p className="text-blue-100 text-sm line-clamp-2 opacity-90">
              {course.description || 'No description provided'}
            </p>
          </div>
          <div className="flex space-x-1.5 ml-3">
            <Link
              to={`/courses/${course.id}/edit`}
              className="p-2.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all duration-150 transform hover:scale-105 shadow-sm"
              title="Edit Course"
            >
              <Edit3 className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Course Stats with enhanced design */}
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3 mb-5 text-center">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-3 shadow-sm hover:shadow transition-all duration-150">
            <div className="flex items-center justify-center text-blue-600 mb-1.5">
              <Video className="h-5 w-5" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {course.lesson_count || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">Lessons</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-3 shadow-sm hover:shadow transition-all duration-150">
            <div className="flex items-center justify-center text-purple-600 mb-1.5">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {course.student_count || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">Students</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-3 shadow-sm hover:shadow transition-all duration-150">
            <div className="flex items-center justify-center text-green-600 mb-1.5">
              <Clock className="h-5 w-5" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatDuration(course.total_duration || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Duration</div>
          </div>
        </div>

        {/* Course Metadata with enhanced styling */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-5">
          <span className="capitalize bg-gradient-to-r from-gray-100 to-gray-200 px-2.5 py-1.5 rounded-lg font-medium">
            {course.level || 'Beginner'}
          </span>
          <span className="text-gray-500 text-xs">
            Created {new Date(course.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Action Buttons with enhanced design */}
        <div className="flex space-x-3">
          <Link
            to={`/courses/${course.id}`}
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 transition-all duration-150 shadow-sm hover:shadow transform hover:-translate-y-0.5"
          >
            <PlayCircle className="mr-1.5 h-4 w-4" />
            View Lessons
          </Link>
          <Link
            to={`/record?course=${course.id}`}
            className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-150 shadow-sm hover:shadow transform hover:-translate-y-0.5"
            title="Add Lesson"
          >
            <Video className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;