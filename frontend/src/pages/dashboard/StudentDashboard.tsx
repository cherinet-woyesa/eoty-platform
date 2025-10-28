import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Users, Clock, Star, Target, Award,
  PlayCircle, CheckCircle, TrendingUp, Calendar,
  MessageCircle, Bookmark, Zap, Activity,
  Loader2, AlertCircle, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { coursesApi } from '../../services/api';

interface StudentProgress {
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
  studyStreak: number;
  totalPoints: number;
  nextGoal: string;
}

interface EnrolledCourse {
  id: number;
  title: string;
  description: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lastAccessed: string;
  instructor: string;
  rating: number;
  thumbnail?: string;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch enrolled courses
        const coursesResponse = await coursesApi.getCourses();
        
        if (coursesResponse.success) {
          // Transform courses data for student view
          const courses = coursesResponse.data.courses.map((course: any) => ({
            id: course.id,
            title: course.title,
            description: course.description,
            progress: Math.floor(Math.random() * 100), // Mock progress - would come from progress tracking
            totalLessons: course.lesson_count || 0,
            completedLessons: Math.floor((course.lesson_count || 0) * Math.random()),
            lastAccessed: new Date().toISOString(),
            instructor: 'Instructor Name', // Would come from user data
            rating: 4.5 + Math.random() * 0.5,
            thumbnail: undefined
          }));
          
          setEnrolledCourses(courses);

          // Calculate progress stats
          const totalCourses = courses.length;
          const completedCourses = courses.filter(c => c.progress === 100).length;
          const totalLessons = courses.reduce((sum: number, c: EnrolledCourse) => sum + c.totalLessons, 0);
          const completedLessons = courses.reduce((sum: number, c: EnrolledCourse) => sum + c.completedLessons, 0);

          setProgress({
            totalCourses,
            completedCourses,
            totalLessons,
            completedLessons,
            studyStreak: 7, // Mock data - would come from progress tracking
            totalPoints: 1250, // Mock data - would come from achievement system
            nextGoal: 'Complete 5 more lessons'
          });
        }

      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Loading your learning dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
              <div className="hidden sm:flex items-center space-x-2 text-blue-100">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{formatTime(currentTime)}</span>
              </div>
            </div>
            <p className="text-blue-100 text-sm sm:text-base">
              {formatDate(currentTime)}
            </p>
            <p className="text-blue-200 text-xs sm:text-sm mt-1">
              Ready to continue your learning journey?
            </p>
          </div>
          <div className="mt-4 lg:mt-0 lg:ml-6">
            <Link
              to="/courses"
              className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Browse Courses
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {progress && [
          { 
            name: 'Courses Enrolled', 
            value: progress.totalCourses.toString(), 
            icon: BookOpen, 
            change: '+1', 
            changeType: 'positive',
            color: 'from-blue-500 to-blue-600',
            bgColor: 'from-blue-50 to-blue-100'
          },
          { 
            name: 'Lessons Completed', 
            value: progress.completedLessons.toString(), 
            icon: CheckCircle, 
            change: '+3', 
            changeType: 'positive',
            color: 'from-green-500 to-green-600',
            bgColor: 'from-green-50 to-green-100'
          },
          { 
            name: 'Study Streak', 
            value: `${progress.studyStreak} days`, 
            icon: Zap, 
            change: '+2', 
            changeType: 'positive',
            color: 'from-purple-500 to-purple-600',
            bgColor: 'from-purple-50 to-purple-100'
          },
          { 
            name: 'Total Points', 
            value: progress.totalPoints.toString(), 
            icon: Award, 
            change: '+50', 
            changeType: 'positive',
            color: 'from-orange-500 to-orange-600',
            bgColor: 'from-orange-50 to-orange-100'
          }
        ].map((stat, index) => (
          <div key={index} className={`bg-gradient-to-br ${stat.bgColor} rounded-xl p-3 sm:p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} shadow-sm`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-green-700">{stat.change}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-500" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to="/courses"
                className="flex flex-col items-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors group"
              >
                <BookOpen className="h-6 w-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-blue-800">My Courses</span>
              </Link>
              <Link
                to="/achievements"
                className="flex flex-col items-center p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors group"
              >
                <Award className="h-6 w-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-green-800">Achievements</span>
              </Link>
              <Link
                to="/forums"
                className="flex flex-col items-center p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors group"
              >
                <MessageCircle className="h-6 w-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-purple-800">Discussions</span>
              </Link>
              <Link
                to="/ai-assistant"
                className="flex flex-col items-center p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors group"
              >
                <Activity className="h-6 w-6 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-orange-800">AI Assistant</span>
              </Link>
            </div>
          </div>

          {/* Enrolled Courses */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
                My Courses ({enrolledCourses.length})
              </h3>
              <Link
                to="/courses"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            
            {enrolledCourses.length > 0 ? (
              <div className="space-y-3">
                {enrolledCourses.slice(0, 4).map((course) => (
                  <div key={course.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{course.title}</h4>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3" />
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
        </div>

        {/* Sidebar - 1/3 width */}
        <div className="space-y-4 sm:space-y-6">
          {/* Learning Progress */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-green-500" />
              Learning Progress
            </h3>
            {progress && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Course Completion</span>
                    <span className="font-medium">{progress.completedCourses}/{progress.totalCourses}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progress.totalCourses > 0 ? (progress.completedCourses / progress.totalCourses) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Lesson Completion</span>
                    <span className="font-medium">{progress.completedLessons}/{progress.totalLessons}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progress.totalLessons > 0 ? (progress.completedLessons / progress.totalLessons) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600 mb-1">Next Goal:</p>
                  <p className="text-sm font-medium text-gray-900">{progress.nextGoal}</p>
                </div>
              </div>
            )}
          </div>

          {/* Study Streak */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-500" />
              Study Streak
            </h3>
            {progress && (
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-2">{progress.studyStreak}</div>
                <p className="text-sm text-gray-600 mb-4">Days in a row</p>
                <div className="flex justify-center space-x-1">
                  {Array.from({ length: 7 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < progress.studyStreak ? 'bg-yellow-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;