import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Video, BookOpen, Settings, 
  Play, Clock, Users, Star, TrendingUp,
  Camera, Mic, Monitor, Wifi, AlertCircle,
  CheckCircle, Upload, FileVideo, Zap
} from 'lucide-react';
import EnhancedVideoRecorder from '../../components/courses/EnhancedVideoRecorder';
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

  const handleComplete = (lessonId: string, videoUrl: string) => {
    console.log('Lesson created:', { lessonId, videoUrl });
    // Navigate to the course details page
    if (selectedCourse) {
      navigate(`/courses/${selectedCourse}`);
    } else {
      navigate('/dashboard');
    }
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
            <EnhancedVideoRecorder 
              onComplete={handleComplete}
              initialCourseId={selectedCourse}
            />
          </div>

          {/* Sidebar - 1/4 width */}
          <div className="space-y-6">
            {/** Course Selection card removed as redundant per request **/}

            {/* Recording Tips - temporarily disabled */}
            {/**
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                <Video className="mr-2 h-5 w-5" />
                Recording Tips
              </h3>
              ...
            </div>
            **/}

            {/* Best Practices - temporarily disabled */}
            {/**
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="mr-2 h-5 w-5 text-yellow-500" />
                Best Practices
              </h3>
              ...
            </div>
            **/}

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