import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Video, BookOpen, Users, TrendingUp, FileVideo
} from 'lucide-react';
import EnhancedVideoRecorder from '@/components/shared/courses/EnhancedVideoRecorder';
import { teacherApi } from '@/services/api/teacher';

const RecordVideo: React.FC = () => {
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalStudents: 0,
    averageRating: 0,
    thisMonth: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await teacherApi.getDashboardStats();
        const data = res.data || res; // handle both {data:{}} or plain object
        setStats({
          totalVideos: data.totalLessons ?? 0,
          totalStudents: data.totalStudentsEnrolled ?? 0,
          averageRating: data.averageCourseRating ?? 0,
          thisMonth: data.lessonsRecordedThisMonth ?? 0
        });
      } catch (error) {
        // Fallback: keep zeros, don't break recording UI
        console.warn('Failed to load teacher recording stats:', error);
      }
    };

    void loadStats();
  }, []);

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-[#27AE60]/30 rounded-lg blur-md"></div>
                <div className="relative p-3 bg-gradient-to-br from-[#27AE60]/20 to-[#16A085]/20 rounded-lg border border-[#27AE60]/30">
                  <Video className="h-6 w-6 text-[#27AE60]" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-800">Video Recording Studio</h1>
                <p className="text-stone-600 mt-1">Record and upload your lesson videos</p>
              </div>
            </div>
            <Link
              to="/teacher/courses"
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/50 text-stone-700 hover:text-[#27AE60] rounded-lg transition-all font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Link>
          </div>
        </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
          {/* Main Recording Area - 3/4 width */}
          <div className="xl:col-span-3">
            <EnhancedVideoRecorder />
          </div>

          {/* Sidebar - 1/4 width */}
          <div className="space-y-4 sm:space-y-6">
            {/* Your Progress - compact stat cards */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-stone-800 flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4 text-[#27AE60]" />
                  Your Progress
                </h3>
                <span className="text-xs text-stone-400">Recording insights</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] uppercase tracking-wide text-stone-500">
                      This Month
                    </span>
                    <Video className="h-3.5 w-3.5 text-[#27AE60]" />
                  </div>
                  <p className="text-lg font-semibold text-stone-900">{stats.thisMonth}</p>
                  <p className="text-[11px] text-stone-500">Videos recorded</p>
                </div>
                <div className="rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] uppercase tracking-wide text-stone-500">
                      Library
                    </span>
                    <FileVideo className="h-3.5 w-3.5 text-[#16A085]" />
                  </div>
                  <p className="text-lg font-semibold text-stone-900">{stats.totalVideos}</p>
                  <p className="text-[11px] text-stone-500">Total videos</p>
                </div>
                <div className="rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] uppercase tracking-wide text-stone-500">
                      Reach
                    </span>
                    <Users className="h-3.5 w-3.5 text-[#2980B9]" />
                  </div>
                  <p className="text-lg font-semibold text-stone-900">{stats.totalStudents}</p>
                  <p className="text-[11px] text-stone-500">Students reached</p>
                </div>
                <div className="rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] uppercase tracking-wide text-stone-500">
                      Rating
                    </span>
                    <BookOpen className="h-3.5 w-3.5 text-[#F39C12]" />
                  </div>
                  <p className="text-lg font-semibold text-stone-900">
                    {stats.averageRating}
                    <span className="text-xs text-stone-500"> / 5</span>
                  </p>
                  <p className="text-[11px] text-stone-500">Average course rating</p>
                </div>
              </div>
            </div>

            {/* Quick Actions - clean links */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-800 mb-3">Quick actions</h3>
              <div className="space-y-2.5">
                <Link
                  to="/teacher/courses/new"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-stone-200 hover:border-[#27AE60]/50 hover:bg-stone-50/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-[#27AE60]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-stone-800">Create new course</span>
                      <span className="text-xs text-stone-500">
                        Start a fresh course for your recordings
                      </span>
                    </div>
                  </div>
                </Link>
                <Link
                  to="/teacher/courses"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-stone-200 hover:border-[#2980B9]/50 hover:bg-stone-50/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#2980B9]/10 to-sky-200/40 flex items-center justify-center">
                      <FileVideo className="h-4 w-4 text-[#2980B9]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-stone-800">View all courses</span>
                      <span className="text-xs text-stone-500">
                        Attach this recording to an existing course
                      </span>
                    </div>
                  </div>
                </Link>
                <Link
                  to="/teacher/students"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-stone-200 hover:border-[#00B8E6]/50 hover:bg-stone-50/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00D4FF]/10 to-[#00B8E6]/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-[#00B8E6]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-stone-800">Manage students</span>
                      <span className="text-xs text-stone-500">
                        See who is engaging with your content
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default RecordVideo;