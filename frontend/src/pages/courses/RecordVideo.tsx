import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Video, BookOpen, Settings, 
  Play, Clock, Users, Star, TrendingUp,
  Camera, Mic, Monitor, Wifi, AlertCircle,
  CheckCircle, Upload, FileVideo, Zap
} from 'lucide-react';
import VideoRecorder from '../../components/courses/VideoRecorder';
import { coursesApi } from '../../services/api';

interface Course {
  id: string;
  title: string;
  description?: string;
  category?: string;
  student_count?: number;
  rating?: number;
}

const RecordVideo: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVideos: 12,
    totalStudents: 247,
    averageRating: 4.8,
    thisMonth: 8
  });

  // Load courses and stats
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await coursesApi.getCourses();
        setCourses(response.data.courses || []);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load courses:', error);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleRecordingComplete = (videoUrl: string) => {
    console.log('Recording completed:', videoUrl);
  };

  const handleUploadComplete = (lessonId: string, videoUrl: string) => {
    console.log('Upload completed:', { lessonId, videoUrl });
    // Navigate to course or show success message
  };

  const selectedCourseData = courses.find(course => course.id === selectedCourse);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Record Video Lesson</h1>
                <p className="text-sm text-gray-600">Create engaging content for your students</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Recording Area - 3/4 width */}
          <div className="xl:col-span-3">
            <VideoRecorder 
              onRecordingComplete={handleRecordingComplete}
              onUploadComplete={handleUploadComplete}
              courseId={selectedCourse}
            />
          </div>

          {/* Sidebar - 1/4 width */}
          <div className="space-y-6">
            {/* Course Selection */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BookOpen className="mr-2 h-5 w-5 text-blue-600" />
                Select Course
              </h3>
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              )}
              
              {selectedCourseData && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-medium text-blue-900">{selectedCourseData.title}</h4>
                  {selectedCourseData.description && (
                    <p className="text-sm text-blue-700 mt-1">{selectedCourseData.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-blue-600">
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {selectedCourseData.student_count || 0} students
                    </span>
                    <span className="flex items-center">
                      <Star className="h-3 w-3 mr-1" />
                      {selectedCourseData.rating || 0}/5
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Recording Tips */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                <Video className="mr-2 h-5 w-5" />
                Recording Tips
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">1</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Good Lighting</h4>
                    <p className="text-xs text-blue-700">Face a window or use a ring light for best results</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">2</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Clear Audio</h4>
                    <p className="text-xs text-blue-700">Use a quiet environment and speak clearly</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">3</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Eye Contact</h4>
                    <p className="text-xs text-blue-700">Look directly at the camera, not the screen</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">4</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Keep it Focused</h4>
                    <p className="text-xs text-blue-700">One main topic per video works best</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Best Practices */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="mr-2 h-5 w-5 text-yellow-500" />
                Best Practices
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Play className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Structure Your Content</h4>
                    <p className="text-xs text-gray-600 mt-1">Start with intro, cover main points, then summarize</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Engage Students</h4>
                    <p className="text-xs text-gray-600 mt-1">Ask questions and encourage participation</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Optimal Length</h4>
                    <p className="text-xs text-gray-600 mt-1">Keep videos under 15 minutes for better retention</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Your Progress */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Your Progress
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Videos This Month</span>
                  <span className="font-semibold text-lg">{stats.thisMonth}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Videos</span>
                  <span className="font-semibold text-lg">{stats.totalVideos}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Students Reached</span>
                  <span className="font-semibold text-lg">{stats.totalStudents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Rating</span>
                  <span className="font-semibold text-lg">{stats.averageRating}/5</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to="/courses/create"
                  className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Create New Course</span>
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileVideo className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">View All Videos</span>
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Manage Students</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordVideo;