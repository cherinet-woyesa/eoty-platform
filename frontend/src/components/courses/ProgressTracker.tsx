import React, { useState, useEffect } from 'react';
import { Clock, BookOpen, CheckCircle, Award, TrendingUp } from 'lucide-react';
import { interactiveApi } from '../../services/api';

interface LessonProgress {
  id: string;
  title: string;
  progress: number;
  is_completed: boolean;
  completed_at: string | null;
  last_accessed_at: string;
  duration: number; // in minutes
}

interface QuizProgress {
  id: string;
  title: string;
  score: number;
  max_score: number;
  is_completed: boolean;
  completed_at: string;
  attempts: number;
}

interface CourseProgress {
  course_id: string;
  course_title: string;
  overall_progress: number;
  total_lessons: number;
  completed_lessons: number;
  total_quizzes: number;
  completed_quizzes: number;
  average_quiz_score: number;
  time_spent: number; // in minutes
  last_accessed: string;
}

const ProgressTracker: React.FC = () => {
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [quizProgress, setQuizProgress] = useState<QuizProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'lessons' | 'quizzes'>('courses');

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      // In a real implementation, we would fetch this data from the backend
      // For now, we'll simulate the data structure
      const mockCourseProgress: CourseProgress[] = [
        {
          course_id: '1',
          course_title: 'Introduction to Orthodox Faith',
          overall_progress: 0.75,
          total_lessons: 12,
          completed_lessons: 9,
          total_quizzes: 8,
          completed_quizzes: 6,
          average_quiz_score: 85,
          time_spent: 120,
          last_accessed: '2023-05-15T14:30:00Z'
        },
        {
          course_id: '2',
          course_title: 'Church History Fundamentals',
          overall_progress: 0.45,
          total_lessons: 15,
          completed_lessons: 7,
          total_quizzes: 10,
          completed_quizzes: 4,
          average_quiz_score: 78,
          time_spent: 85,
          last_accessed: '2023-05-14T10:15:00Z'
        }
      ];

      const mockLessonProgress: LessonProgress[] = [
        {
          id: '1',
          title: 'The Nature of God',
          progress: 1,
          is_completed: true,
          completed_at: '2023-05-10T14:30:00Z',
          last_accessed_at: '2023-05-10T14:30:00Z',
          duration: 25
        },
        {
          id: '2',
          title: 'The Trinity',
          progress: 0.75,
          is_completed: false,
          completed_at: null,
          last_accessed_at: '2023-05-12T16:45:00Z',
          duration: 30
        },
        {
          id: '3',
          title: 'The Incarnation',
          progress: 0.3,
          is_completed: false,
          completed_at: null,
          last_accessed_at: '2023-05-15T14:30:00Z',
          duration: 35
        }
      ];

      const mockQuizProgress: QuizProgress[] = [
        {
          id: '1',
          title: 'Orthodox Beliefs Quiz',
          score: 18,
          max_score: 20,
          is_completed: true,
          completed_at: '2023-05-10T15:30:00Z',
          attempts: 1
        },
        {
          id: '2',
          title: 'Trinity Concepts Quiz',
          score: 15,
          max_score: 20,
          is_completed: true,
          completed_at: '2023-05-12T17:45:00Z',
          attempts: 2
        }
      ];

      setCourseProgress(mockCourseProgress);
      setLessonProgress(mockLessonProgress);
      setQuizProgress(mockQuizProgress);
    } catch (error) {
      console.error('Failed to load progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('courses')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'courses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Courses
          </button>
          <button
            onClick={() => setActiveTab('lessons')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'lessons'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Lessons
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'quizzes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Quizzes
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Total Courses</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-1">{courseProgress.length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Completed Lessons</span>
                </div>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {courseProgress.reduce((sum, course) => sum + course.completed_lessons, 0)}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Award className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-purple-800">Avg Quiz Score</span>
                </div>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {Math.round(courseProgress.reduce((sum, course) => sum + course.average_quiz_score, 0) / courseProgress.length || 0)}%
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {courseProgress.map((course) => (
                <div key={course.course_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{course.course_title}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{formatTime(course.time_spent)} spent</span>
                        <span className="mx-2">•</span>
                        <span>Last accessed {formatDate(course.last_accessed)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {Math.round(course.overall_progress * 100)}% Complete
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.round(course.overall_progress * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <div className="text-gray-500">Lessons</div>
                      <div className="font-medium">{course.completed_lessons}/{course.total_lessons}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Quizzes</div>
                      <div className="font-medium">{course.completed_quizzes}/{course.total_quizzes}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Avg Score</div>
                      <div className="font-medium">{Math.round(course.average_quiz_score)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Time</div>
                      <div className="font-medium">{formatTime(course.time_spent)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'lessons' && (
          <div className="space-y-4">
            {lessonProgress.map((lesson) => (
              <div key={lesson.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{lesson.duration} min</span>
                      {lesson.completed_at && (
                        <>
                          <span className="mx-2">•</span>
                          <span>Completed {formatDate(lesson.completed_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    {lesson.is_completed ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{Math.round(lesson.progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.round(lesson.progress * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="space-y-4">
            {quizProgress.map((quiz) => (
              <div key={quiz.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <span>{quiz.attempts} attempt{quiz.attempts !== 1 ? 's' : ''}</span>
                      <span className="mx-2">•</span>
                      <span>Completed {formatDate(quiz.completed_at)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {quiz.score}/{quiz.max_score}
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.round((quiz.score / quiz.max_score) * 100)}%
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    (quiz.score / quiz.max_score) >= 0.8 
                      ? 'bg-green-100 text-green-800' 
                      : (quiz.score / quiz.max_score) >= 0.6 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                  }`}>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {Math.round((quiz.score / quiz.max_score) * 100)}% Score
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTracker;