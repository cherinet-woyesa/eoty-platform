import React from 'react';
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
    total_duration?: number;
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
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Course Header */}
      <div className={`bg-gradient-to-r ${getCategoryColor(course.category)} p-6 text-white`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2 line-clamp-2">{course.title}</h3>
            <p className="text-blue-100 text-sm line-clamp-2 opacity-90">
              {course.description || 'No description provided'}
            </p>
          </div>
          <div className="flex space-x-2 ml-4">
            <Link
              to={`/courses/${course.id}/edit`}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl transition-colors duration-150"
              title="Edit Course"
            >
              <Edit3 className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Course Stats */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-4 text-center">
          <div>
            <div className="flex items-center justify-center text-gray-500 mb-1">
              <Video className="h-4 w-4" />
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {course.lesson_count || 0}
            </div>
            <div className="text-xs text-gray-500">Lessons</div>
          </div>
          <div>
            <div className="flex items-center justify-center text-gray-500 mb-1">
              <Users className="h-4 w-4" />
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {course.student_count || 0}
            </div>
            <div className="text-xs text-gray-500">Students</div>
          </div>
          <div>
            <div className="flex items-center justify-center text-gray-500 mb-1">
              <Clock className="h-4 w-4" />
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDuration(course.total_duration || 0)}
            </div>
            <div className="text-xs text-gray-500">Duration</div>
          </div>
        </div>

        {/* Course Metadata */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <span className="capitalize bg-gray-100 px-2 py-1 rounded-lg">
            {course.level}
          </span>
          <span>
            Created {new Date(course.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Link
            to={`/courses/${course.id}`}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-150"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            View Lessons
          </Link>
          <Link
            to={`/record?course=${course.id}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
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