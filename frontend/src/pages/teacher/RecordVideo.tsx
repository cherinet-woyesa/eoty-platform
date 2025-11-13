import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Video, BookOpen, Users, TrendingUp, FileVideo
} from 'lucide-react';
import EnhancedVideoRecorder from '@/components/shared/courses/EnhancedVideoRecorder';

const RecordVideo: React.FC = () => {
  const [stats] = useState({
    totalVideos: 12,
    totalStudents: 247,
    averageRating: 4.8,
    thisMonth: 8
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#39FF14]/20 via-[#00FFC6]/20 to-[#00FFFF]/20 rounded-xl p-6 border border-[#39FF14]/30 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-[#39FF14]/30 rounded-lg blur-md"></div>
                <div className="relative p-3 bg-gradient-to-br from-[#39FF14]/20 to-[#00FFC6]/20 rounded-lg border border-[#39FF14]/30">
                  <Video className="h-6 w-6 text-[#39FF14]" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-800">Video Recording Studio</h1>
                <p className="text-stone-600 mt-1">Record and upload your lesson videos</p>
              </div>
            </div>
            <Link
              to="/teacher/courses"
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#39FF14]/50 text-stone-700 hover:text-[#39FF14] rounded-lg transition-all font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Recording Area - 3/4 width */}
          <div className="xl:col-span-3">
            <EnhancedVideoRecorder />
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
            <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-5 shadow-md">
              <h3 className="text-sm font-semibold text-stone-800 mb-4 flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-[#39FF14]" />
                Your Progress
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-stone-600">Videos This Month</span>
                  <span className="font-bold text-lg text-[#39FF14]">{stats.thisMonth}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-stone-600">Total Videos</span>
                  <span className="font-bold text-lg text-[#00FFC6]">{stats.totalVideos}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-stone-600">Students Reached</span>
                  <span className="font-bold text-lg text-[#00FFFF]">{stats.totalStudents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-stone-600">Average Rating</span>
                  <span className="font-bold text-lg text-[#FFD700]">{stats.averageRating}/5</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-5 shadow-md">
              <h3 className="text-sm font-semibold text-stone-800 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  to="/teacher/courses/new"
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50/50 transition-colors duration-200 border border-slate-200/50"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 rounded-lg flex items-center justify-center border border-[#FFD700]/30">
                    <BookOpen className="h-4 w-4 text-[#FFD700]" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Create New Course</span>
                </Link>
                <Link
                  to="/teacher/courses"
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50/50 transition-colors duration-200 border border-slate-200/50"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg flex items-center justify-center border border-blue-300">
                    <FileVideo className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">View All Courses</span>
                </Link>
                <Link
                  to="/teacher/students"
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50/50 transition-colors duration-200 border border-slate-200/50"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-[#00D4FF]/20 to-[#00B8E6]/20 rounded-lg flex items-center justify-center border border-[#00D4FF]/30">
                    <Users className="h-4 w-4 text-[#00D4FF]" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Manage Students</span>
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