import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { coursesApi } from '../../services/api';
import EnhancedVideoPlayer from '../../components/courses/EnhancedVideoPlayer';
import { CoursePublisher } from '../../components/courses/CoursePublisher';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowLeft, BookOpen, Clock, PlayCircle, Video, Users, BarChart, 
  Search, Filter, CheckCircle, Circle, Star, MessageSquare, 
  Download, Share2, Edit, TrendingUp, Award, Calendar, Settings
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  order: number;
  created_at: string;
  duration?: number;
  completed?: boolean;
}

type TabType = 'overview' | 'lessons' | 'resources' | 'discussions';

const CourseDetails: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('lessons');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [courseStats, setCourseStats] = useState({
    totalStudents: 0,
    completionRate: 0,
    averageRating: 0,
    totalLessons: 0,
    completedLessons: 0,
    activeStudents: 0
  });

  // Check if user is admin
  const isAdmin = user?.role === 'chapter_admin' || user?.role === 'platform_admin';
  // Check if user is teacher who owns this course
  const isOwner = user?.role === 'teacher' && course?.created_by === user?.userId;

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
        const lessonsData = lessonsResponse.data.lessons || [];
        
        setLessons(lessonsData);

        // Auto-select first lesson if available
        if (lessonsData.length > 0) {
          setSelectedLesson(lessonsData[0]);
        }

        // Load real analytics data
        try {
          const analyticsResponse = await coursesApi.getEngagementAnalytics(courseId, {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
            granularity: 'daily'
          });

          const analyticsData = analyticsResponse.data;
          
          // Get enrolled students count
          const studentsResponse = await coursesApi.getEnrolledStudents(courseId, {
            page: 1,
            pageSize: 1
          });

          const totalStudents = studentsResponse.data.pagination?.totalItems || 0;
          const activeStudents = analyticsData.dailyActiveStudents?.reduce((sum: number, day: any) => 
            Math.max(sum, day.active_students || 0), 0) || 0;

          // Calculate completion rate from lesson stats
          const lessonStats = analyticsData.lessonStats || [];
          const avgCompletionRate = lessonStats.length > 0
            ? lessonStats.reduce((sum: number, lesson: any) => sum + (lesson.completionRate || 0), 0) / lessonStats.length
            : 0;

          // Calculate completed lessons (lessons with >80% completion rate)
          const completedLessons = lessonStats.filter((lesson: any) => 
            (lesson.completionRate || 0) > 80
          ).length;

          setCourseStats({
            totalStudents,
            completionRate: Math.round(avgCompletionRate),
            averageRating: 4.5, // TODO: Implement rating system
            totalLessons: lessonsData.length,
            completedLessons,
            activeStudents
          });

        } catch (analyticsError) {
          console.error('Failed to load analytics:', analyticsError);
          // Fallback to basic stats
          setCourseStats({
            totalStudents: 0,
            completionRate: 0,
            averageRating: 0,
            totalLessons: lessonsData.length,
            completedLessons: 0,
            activeStudents: 0
          });
        }

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
  };

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    // Note: Lesson completion status would come from user progress data
    // For now, show all lessons regardless of filter
    const matchesFilter = filterCompleted === 'all' || 
                         (filterCompleted === 'completed' && lesson.completed) ||
                         (filterCompleted === 'incomplete' && !lesson.completed);
    return matchesSearch && (filterCompleted === 'all' || matchesFilter);
  });

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: BookOpen },
    { id: 'lessons' as TabType, label: 'Lessons', icon: PlayCircle, count: lessons.length },
    { id: 'resources' as TabType, label: 'Resources', icon: Download },
    { id: 'discussions' as TabType, label: 'Discussions', icon: MessageSquare }
  ];

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

  // Determine back link based on user role
  const getBackLink = () => {
    if (isAdmin) return '/admin/courses';
    if (isOwner || user?.role === 'teacher') return '/teacher/courses';
    return '/courses';
  };

  const getBackLabel = () => {
    if (isAdmin) return 'Back to Admin Courses';
    if (isOwner || user?.role === 'teacher') return 'Back to My Courses';
    return 'Back to Courses';
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header Section - Matching MyCourses Style */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-3 sm:p-4 text-white shadow-lg">
        <Link
          to={getBackLink()}
          className="inline-flex items-center text-xs sm:text-sm font-medium text-white/90 hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3 w-3" />
          {getBackLabel()}
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-lg sm:text-xl font-bold">{course.title}</h1>
              {course.level && (
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                  {course.level}
                </span>
              )}
            </div>
            <p className="text-blue-100 text-xs sm:text-sm mb-2">
              {course.description}
            </p>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{courseStats.averageRating.toFixed(1)}</span>
                <span className="text-white/70">rating</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span className="font-semibold">{courseStats.totalStudents}</span>
                <span className="text-white/70">students</span>
              </div>
              <div className="flex items-center space-x-1">
                <PlayCircle className="h-3 w-3" />
                <span className="font-semibold">{courseStats.totalLessons}</span>
                <span className="text-white/70">lessons</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span className="font-semibold">{formatDuration(lessons.reduce((acc, l) => acc + (l.duration || 0), 0))}</span>
                <span className="text-white/70">total</span>
              </div>
            </div>
          </div>
          
          <div className="mt-3 lg:mt-0 lg:ml-4">
            <div className="flex flex-col sm:flex-row gap-1.5">
              {/* Admin/Teacher Actions */}
              {(isAdmin || isOwner) && (
                <>
                  <Link
                    to={`/teacher/courses/${courseId}/edit`}
                    className="inline-flex items-center px-3 py-1.5 bg-white text-blue-600 hover:bg-blue-50 text-xs font-medium rounded-lg transition-colors"
                  >
                    <Edit className="h-3 w-3 mr-1.5" />
                    Edit Course
                  </Link>
                  {isAdmin && (
                    <Link
                      to={`/admin/courses/${courseId}`}
                      className="inline-flex items-center px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Settings className="h-3 w-3 mr-1.5" />
                      Admin View
                    </Link>
                  )}
                </>
              )}
              <button className="inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors backdrop-blur-sm">
                <Share2 className="h-3 w-3 mr-1.5" />
                Share
              </button>
              <Link
                to={`/courses/${courseId}/edit`}
                className="inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors backdrop-blur-sm"
              >
                <Edit className="h-3 w-3 mr-1.5" />
                Edit
              </Link>
              <Link
                to={`/record?course=${courseId}`}
                className="inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors backdrop-blur-sm"
              >
                <Video className="h-3 w-3 mr-1.5" />
                Add Lesson
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Course Publisher */}
      <CoursePublisher 
        course={course} 
        onPublishSuccess={(updatedCourse) => {
          setCourse(updatedCourse);
        }}
      />

      {/* Stats Grid - Matching MyCourses Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2.5 sm:p-3 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-1.5">
            <div className="p-1.5 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm">
              <Users className="h-3 w-3 text-white" />
            </div>
            <TrendingUp className="h-2.5 w-2.5 text-blue-600" />
          </div>
          <div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5">{courseStats.totalStudents}</p>
            <p className="text-xs text-gray-600 font-medium">Total Students</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2.5 sm:p-3 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-1.5">
            <div className="p-1.5 rounded-md bg-gradient-to-r from-green-500 to-green-600 shadow-sm">
              <BarChart className="h-3 w-3 text-white" />
            </div>
            <Award className="h-2.5 w-2.5 text-green-600" />
          </div>
          <div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5">{courseStats.completionRate}%</p>
            <p className="text-xs text-gray-600 font-medium">Completion Rate</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2.5 sm:p-3 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-1.5">
            <div className="p-1.5 rounded-md bg-gradient-to-r from-purple-500 to-purple-600 shadow-sm">
              <Star className="h-3 w-3 text-white" />
            </div>
            <Star className="h-2.5 w-2.5 text-purple-600 fill-purple-600" />
          </div>
          <div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5">{courseStats.averageRating.toFixed(1)}/5</p>
            <p className="text-xs text-gray-600 font-medium">Average Rating</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-2.5 sm:p-3 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-1.5">
            <div className="p-1.5 rounded-md bg-gradient-to-r from-orange-500 to-orange-600 shadow-sm">
              <PlayCircle className="h-3 w-3 text-white" />
            </div>
            <CheckCircle className="h-2.5 w-2.5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5">{courseStats.completedLessons}/{courseStats.totalLessons}</p>
            <p className="text-xs text-gray-600 font-medium">Lessons Progress</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Matching MyCourses Style */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player & Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {selectedLesson ? (
              <>
                {/* Enhanced Video Player - Matching MyCourses Style */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <EnhancedVideoPlayer 
                    videoUrl={selectedLesson.video_url}
                    title={selectedLesson.title}
                    lessonId={selectedLesson.id}
                    onTimestampClick={handleTimestampClick}
                  />
                </div>
                
                {/* Lesson Details - Matching MyCourses Style */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <h2 className="text-lg font-bold text-gray-900">{selectedLesson.title}</h2>
                        {selectedLesson.completed && (
                          <span className="flex items-center space-x-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle className="h-3 w-3" />
                            <span>Completed</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(selectedLesson.duration || 0)}</span>
                        </div>
                        <span>•</span>
                        <span>Lesson {(selectedLesson.order !== undefined ? selectedLesson.order + 1 : 1)} of {lessons.length}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(selectedLesson.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium">
                      {selectedLesson.completed ? 'Review' : 'Mark Complete'}
                    </button>
                  </div>
                  
                  <div className="prose max-w-none">
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedLesson.description}</p>
                  </div>
                  
                  {/* Learning Objectives - Matching MyCourses Style */}
                  <div className="mt-4 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                      <Award className="h-4 w-4 mr-1.5" />
                      Learning Objectives
                    </h4>
                    <ul className="text-xs text-blue-800 space-y-1.5">
                      <li className="flex items-start">
                        <CheckCircle className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0" />
                        <span>Understand the core concepts presented in this lesson</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0" />
                        <span>Apply the teachings to your spiritual practice</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0" />
                        <span>Participate in discussions with other learners</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0" />
                        <span>Complete the lesson quiz to test your understanding</span>
                      </li>
                    </ul>
                  </div>

                  {/* Action Buttons - Matching MyCourses Style */}
                  <div className="mt-4 flex items-center space-x-2">
                    <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium">
                      Take Quiz
                    </button>
                    <button className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors text-xs font-medium">
                      Download Resources
                    </button>
                    <button className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors">
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Video className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Lesson Selected</h3>
                  <p className="text-sm text-gray-600 mb-4">Choose a lesson from the list to start watching.</p>
                  <Link
                    to={`/record?course=${courseId}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Create First Lesson
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Lessons Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Search and Filter - Matching MyCourses Style */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search lessons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-3.5 w-3.5 text-gray-500" />
                <select
                  value={filterCompleted}
                  onChange={(e) => setFilterCompleted(e.target.value as any)}
                  className="flex-1 px-2.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white"
                >
                  <option value="all">All Lessons</option>
                  <option value="completed">Completed</option>
                  <option value="incomplete">Incomplete</option>
                </select>
              </div>
            </div>

            {/* Progress Summary - Matching MyCourses Style */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-3 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <TrendingUp className="mr-1.5 h-4 w-4 text-green-600" />
                Your Progress
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-700 mb-1.5">
                    <span>Course Completion</span>
                    <span className="text-green-600">
                      {courseStats.totalLessons > 0 
                        ? Math.round((courseStats.completedLessons / courseStats.totalLessons) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${courseStats.totalLessons > 0 
                          ? (courseStats.completedLessons / courseStats.totalLessons) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {courseStats.completedLessons} of {courseStats.totalLessons} lessons completed
                  </p>
                </div>
              </div>
            </div>

            {/* Lessons List - Matching MyCourses Style */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center justify-between">
                  <span className="flex items-center">
                    <PlayCircle className="mr-1.5 h-4 w-4 text-blue-600" />
                    Course Lessons
                  </span>
                  <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full">
                    {filteredLessons.length}
                  </span>
                </h3>
              </div>
              
              <div className="max-h-[600px] overflow-y-auto p-3 space-y-2">
                {filteredLessons.length > 0 ? (
                  filteredLessons.map((lesson, index) => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                        selectedLesson?.id === lesson.id
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          lesson.completed
                            ? 'bg-green-500 text-white'
                            : selectedLesson?.id === lesson.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {lesson.completed ? <CheckCircle className="h-4 w-4" /> : (lesson.order !== undefined ? lesson.order + 1 : index + 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-semibold mb-0.5 ${
                            selectedLesson?.id === lesson.id ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {lesson.title}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(lesson.duration || 0)}</span>
                            {lesson.completed && (
                              <>
                                <span>•</span>
                                <span className="text-green-600 font-medium">Completed</span>
                              </>
                            )}
                          </div>
                        </div>
                        <PlayCircle className={`flex-shrink-0 h-4 w-4 ${
                          selectedLesson?.id === lesson.id ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Circle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No lessons found</p>
                  </div>
                )}
              </div>

              {lessons.length === 0 && (
                <div className="p-6 text-center border-t border-gray-200">
                  <Video className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm mb-3">No lessons yet</p>
                  <Link
                    to={`/record?course=${courseId}`}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create First Lesson
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overview Tab - Matching MyCourses Style */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Course Overview</h2>
          <p className="text-sm text-gray-700 mb-4">{course.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">What You'll Learn</h3>
              <ul className="space-y-1.5 text-sm text-gray-700">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1.5 mt-0.5 flex-shrink-0" />
                  <span>Master the fundamental concepts</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1.5 mt-0.5 flex-shrink-0" />
                  <span>Apply practical techniques</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1.5 mt-0.5 flex-shrink-0" />
                  <span>Build real-world projects</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Course Details</h3>
              <div className="space-y-1.5 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Level:</span>
                  <span className="font-medium">{course.level || 'All Levels'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{formatDuration(lessons.reduce((acc, l) => acc + (l.duration || 0), 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lessons:</span>
                  <span className="font-medium">{lessons.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Language:</span>
                  <span className="font-medium">English</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resources Tab - Matching MyCourses Style */}
      {activeTab === 'resources' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Course Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Download className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Resource {i}</h4>
                    <p className="text-xs text-gray-500">PDF Document</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discussions Tab - Matching MyCourses Style */}
      {activeTab === 'discussions' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Course Discussions</h2>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-2">No Discussions Yet</h3>
            <p className="text-sm text-gray-600 mb-4">Start a conversation with your fellow students</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              Start Discussion
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;
