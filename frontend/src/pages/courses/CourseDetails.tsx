import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { coursesApi } from '../../services/api';
import EnhancedVideoPlayer from '../../components/courses/EnhancedVideoPlayer';
import { ArrowLeft, BookOpen, Clock, PlayCircle, Video, Users, BarChart } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  order_number: number;
  created_at: string;
  duration?: number;
}

const CourseDetails: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [courseStats, setCourseStats] = useState({
    totalStudents: 0,
    completionRate: 0,
    averageRating: 0
  });

  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) return;

      try {
        setLoading(true);
        
        // Load course details
        const coursesResponse = await coursesApi.getCourses();
        const courseData = coursesResponse.data.courses.find((c: any) => c.id === parseInt(courseId));
        setCourse(courseData);

        // Load lessons
        const lessonsResponse = await coursesApi.getLessons(courseId);
        setLessons(lessonsResponse.data.lessons || []);

        // Auto-select first lesson if available
        if (lessonsResponse.data.lessons?.length > 0) {
          setSelectedLesson(lessonsResponse.data.lessons[0]);
        }

        // Mock stats - in real app, this would come from API
        setCourseStats({
          totalStudents: Math.floor(Math.random() * 100) + 50,
          completionRate: Math.floor(Math.random() * 30) + 70,
          averageRating: 4.5 + (Math.random() * 0.5)
        });

      } catch (error) {
        console.error('Failed to load course data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId]);

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleTimestampClick = (timestamp: number) => {
    console.log('Jumping to timestamp:', timestamp);
    // This will be handled by the EnhancedVideoPlayer component
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-t-2 border-blue-600 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course content...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Not Found</h3>
        <p className="text-gray-600 mb-4">The course you're looking for doesn't exist.</p>
        <Link
          to="/courses"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/courses"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
            <p className="text-gray-600 mt-1">{course.description}</p>
          </div>
        </div>
        <Link
          to={`/record?course=${courseId}`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700"
        >
          <Video className="mr-2 h-4 w-4" />
          Add Lesson
        </Link>
      </div>

      {/* Course Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Students Enrolled</p>
              <p className="text-2xl font-bold text-gray-900">{courseStats.totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <BarChart className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{courseStats.completionRate}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl mr-4">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{courseStats.averageRating}/5</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Video Player & Content - 3/4 width */}
        <div className="lg:col-span-3">
          {selectedLesson ? (
            <div className="space-y-6">
              {/* Enhanced Video Player */}
              <EnhancedVideoPlayer 
                videoUrl={`http://localhost:5000${selectedLesson.video_url}`}
                title={selectedLesson.title}
                lessonId={selectedLesson.id}
                onTimestampClick={handleTimestampClick}
              />
              
              {/* Lesson Details */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedLesson.title}</h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(selectedLesson.duration || 0)}</span>
                      </div>
                      <span>•</span>
                      <span>Lesson {selectedLesson.order_number + 1} of {lessons.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Completed by</span>
                    <span className="text-sm font-medium text-green-600">72%</span>
                  </div>
                </div>
                
                <p className="text-gray-700 leading-relaxed">{selectedLesson.description}</p>
                
                {/* Learning Objectives */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Learning Objectives</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Understand the core concepts presented in this lesson</li>
                    <li>• Apply the teachings to your spiritual practice</li>
                    <li>• Participate in discussions with other learners</li>
                    <li>• Complete the lesson quiz to test your understanding</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Lesson Selected</h3>
              <p className="text-gray-600 mb-4">Choose a lesson from the list to start watching.</p>
              <Link
                to={`/record?course=${courseId}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700"
              >
                <Video className="mr-2 h-4 w-4" />
                Create First Lesson
              </Link>
            </div>
          )}
        </div>

        {/* Lessons List - 1/4 width */}
        <div className="space-y-6">
          {/* Progress Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Progress</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Course Completion</span>
                  <span>25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Quizzes Completed</span>
                  <span>1/4</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Lessons List */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Course Lessons ({lessons.length})
              </h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {lessons.filter(l => l.id === selectedLesson?.id).length > 0 ? 
                 lessons.findIndex(l => l.id === selectedLesson?.id) + 1 : 0}/{lessons.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {lessons.map((lesson, index) => (
                <button
                  key={lesson.id}
                  onClick={() => setSelectedLesson(lesson)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-150 ${
                    selectedLesson?.id === lesson.id
                      ? 'border-blue-300 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      selectedLesson?.id === lesson.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium truncate ${
                        selectedLesson?.id === lesson.id ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {lesson.title}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(lesson.duration || 0)}</span>
                      </div>
                    </div>
                    <PlayCircle className={`flex-shrink-0 h-5 w-5 ${
                      selectedLesson?.id === lesson.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  </div>
                </button>
              ))}
            </div>

            {lessons.length === 0 && (
              <div className="text-center py-8">
                <Video className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No lessons yet</p>
                <Link
                  to={`/record?course=${courseId}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create First Lesson
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors duration-150">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm">Take Course Quiz</span>
                </div>
              </button>
              <button className="w-full text-left p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors duration-150">
                <div className="flex items-center space-x-2">
                  <Video className="h-4 w-4" />
                  <span className="text-sm">Download Resources</span>
                </div>
              </button>
              <button className="w-full text-left p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors duration-150">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Join Study Group</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;