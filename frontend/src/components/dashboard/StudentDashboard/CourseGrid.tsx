import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, Clock, Users, Star, BookOpen, ArrowRight, Eye } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lastAccessed: string;
  instructor: string;
  rating: number;
  studentCount: number;
  duration: number;
  thumbnail?: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface CourseGridProps {
  courses: Course[];
  compact?: boolean;
}

const CourseGrid: React.FC<CourseGridProps> = ({ courses, compact = false }) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCourseClick = useCallback((courseId: string) => {
    // Track course click for analytics
    console.log('Course clicked:', courseId);
  }, []);

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
            My Courses ({courses.length})
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
              <div
                key={course.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                onClick={() => handleCourseClick(course.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">{course.title}</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(course.difficulty)}`}>
                      {course.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <PlayCircle className="h-3 w-3" />
                      <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span>{course.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Last accessed {new Date(course.lastAccessed).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">{course.progress}% complete</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Link
                    to={`/courses/${course.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PlayCircle className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No courses enrolled yet</p>
            <Link
              to="/courses"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Browse Available Courses
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
          <p className="text-gray-600 mt-1">Continue your learning journey</p>
        </div>
        <Link
          to="/courses"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Browse Courses
        </Link>
      </div>

      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group"
              onClick={() => handleCourseClick(course.id)}
            >
              {/* Course Thumbnail */}
              <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <BookOpen className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${
                    course.difficulty === 'beginner' ? 'bg-green-500' :
                    course.difficulty === 'intermediate' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {course.difficulty}
                  </span>
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-black/50 text-white">
                    {course.category}
                  </span>
                </div>
              </div>

              {/* Course Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {course.title}
                </h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{course.description}</p>
                
                <div className="space-y-2 text-xs text-gray-500 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{course.studentCount} students</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <PlayCircle className="h-3 w-3" />
                      <span>{course.totalLessons} lessons</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(course.duration)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span>{course.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
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

                {/* Instructor & Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    by {course.instructor}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/courses/${course.id}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {course.progress > 0 ? 'Continue' : 'Start'}
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Add to bookmarks
                      }}
                      className="text-xs text-gray-400 hover:text-yellow-500 transition-colors"
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Start your learning journey by enrolling in courses that match your interests and goals.
          </p>
          <Link
            to="/courses"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <BookOpen className="h-5 w-5 mr-2" />
            Explore Courses
          </Link>
        </div>
      )}

      {/* View All Courses */}
      {courses.length > 0 && (
        <div className="mt-6 text-center">
          <Link
            to="/courses"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All Courses
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default React.memo(CourseGrid);