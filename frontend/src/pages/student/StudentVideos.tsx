import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlayCircle, Search, Clock, BookOpen, 
  Filter, Grid, List, Loader2, AlertCircle, 
  RefreshCw, CheckCircle, Eye, TrendingUp, X, 
  SortAsc, SortDesc, Download
} from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';
import UnifiedVideoPlayer from '@/components/shared/courses/UnifiedVideoPlayer';

interface Video {
  id: string;
  lesson_id: string;
  title: string;
  description?: string;
  course_id: string;
  course_title: string;
  duration?: number;
  thumbnail?: string;
  progress?: number;
  is_completed?: boolean;
  mux_playback_id?: string;
  mux_asset_id?: string;
  mux_status?: string;
  video_provider?: 'mux' | 's3';
  created_at?: string;
  views?: number;
}

interface StudentVideosData {
  videos: Video[];
  totalVideos: number;
  completedVideos: number;
  inProgressVideos: number;
}

// Loading component
const LoadingSpinner = React.memo(() => (
  <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#39FF14] mx-auto mb-4" />
        <p className="text-stone-600 text-lg">Loading videos...</p>
      </div>
    </div>
  </div>
));

// Error component
const ErrorDisplay = React.memo(({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 text-lg mb-4">{error}</p>
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 rounded-lg hover:shadow-lg transition-all font-semibold"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
));

const StudentVideos: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<StudentVideosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'completed' | 'not-started'>('all');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'progress' | 'duration' | 'recent'>('recent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load videos from enrolled courses with caching
  const loadVideos = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // First get enrolled courses
      const dashboardResponse = await apiClient.get('/students/dashboard');
      if (!dashboardResponse.data.success) {
        throw new Error('Failed to load enrolled courses');
      }
      
      const enrolledCourses = dashboardResponse.data.data.enrolledCourses || [];
      
      // Fetch videos for each enrolled course
      const videoPromises = enrolledCourses.map(async (course: any) => {
        try {
          const response = await apiClient.get(`/videos/courses/${course.id}/lessons`);
          if (response.data.success) {
            const lessons = response.data.data.lessons || response.data.data || [];
            return lessons.map((lesson: any) => ({
              id: lesson.id || lesson.lesson_id,
              lesson_id: lesson.id || lesson.lesson_id,
              title: lesson.title || lesson.lesson_title || 'Untitled Video',
              description: lesson.description || lesson.lesson_description,
              course_id: course.id,
              course_title: course.title,
              duration: lesson.duration || lesson.video_duration || 0,
              thumbnail: lesson.thumbnail || lesson.cover_image || course.coverImage,
              progress: lesson.progress || lesson.completion_percentage || 0,
              is_completed: lesson.is_completed || lesson.progress === 100,
              mux_playback_id: lesson.mux_playback_id,
              mux_asset_id: lesson.mux_asset_id,
              mux_status: lesson.mux_status,
              video_provider: lesson.video_provider || 'mux',
              created_at: lesson.created_at,
              views: lesson.views || 0
            }));
          }
          return [];
        } catch (err) {
          console.warn(`Failed to load videos for course ${course.id}:`, err);
          return [];
        }
      });
      
      const allVideos = (await Promise.all(videoPromises)).flat();
      
      const completedVideos = allVideos.filter((v: Video) => v.is_completed || v.progress === 100).length;
      const inProgressVideos = allVideos.filter((v: Video) => v.progress > 0 && v.progress < 100).length;
      
      setData({
        videos: allVideos,
        totalVideos: allVideos.length,
        completedVideos,
        inProgressVideos
      });
      
      console.log('✅ Videos loaded:', allVideos);
    } catch (err: any) {
      console.error('Failed to load videos:', err);
      setError('Failed to load videos. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);
  
  // Refresh handler
  const handleRefresh = useCallback(() => {
    loadVideos(true);
  }, [loadVideos]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Get unique courses for filter
  const courses = useMemo(() => {
    if (!data?.videos) return [];
    const courseMap = new Map<string, string>();
    data.videos.forEach(video => {
      if (!courseMap.has(video.course_id)) {
        courseMap.set(video.course_id, video.course_title);
      }
    });
    return Array.from(courseMap.entries()).map(([id, title]) => ({ id, title }));
  }, [data?.videos]);

  // Continue Watching Videos
  const continueWatchingVideos = useMemo(() => {
    if (!data?.videos) return [];
    return data.videos
      .filter(v => v.progress > 0 && v.progress < 100)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 3);
  }, [data?.videos]);

  // Filtered and sorted videos
  const filteredVideos = useMemo(() => {
    if (!data?.videos) return [];
    
    let filtered = data.videos.filter(video => {
      // Search filter (using debounced term)
      const matchesSearch = video.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           video.course_title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           (video.description || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      // Status filter
      let matchesStatus = true;
      if (filterStatus === 'in-progress') {
        matchesStatus = video.progress > 0 && video.progress < 100;
      } else if (filterStatus === 'completed') {
        matchesStatus = video.is_completed || video.progress === 100;
      } else if (filterStatus === 'not-started') {
        matchesStatus = video.progress === 0;
      }
      
      // Course filter
      const matchesCourse = selectedCourse === 'all' || video.course_id === selectedCourse;
      
      return matchesSearch && matchesStatus && matchesCourse;
    });
    
    // Sort videos
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'progress':
          comparison = (a.progress || 0) - (b.progress || 0);
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
        case 'recent':
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          comparison = dateB - dateA;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [data?.videos, debouncedSearchTerm, filterStatus, selectedCourse, sortBy, sortOrder]);

  // Format duration
  const formatDuration = useCallback((seconds: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle video click
  const handleVideoClick = useCallback((video: Video) => {
    setSelectedVideo(video);
  }, []);

  // Close video player
  const handleClosePlayer = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  // Navigate to course
  const handleCourseClick = useCallback((courseId: string) => {
    navigate(`/student/courses/${courseId}`);
  }, [navigate]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={loadVideos} />;
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-800 mb-2">My Videos</h1>
          <p className="text-stone-600">Watch and learn from your enrolled courses</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-stone-200 text-stone-600 hover:bg-stone-300 transition-all disabled:opacity-50"
            title="Refresh videos"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900'
                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
            }`}
            title="Grid view"
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'list'
                ? 'bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900'
                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
            }`}
            title="List view"
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Total Videos</p>
                <p className="text-2xl font-bold text-stone-800">{data.totalVideos}</p>
              </div>
              <PlayCircle className="h-8 w-8 text-[#39FF14]" />
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">In Progress</p>
                <p className="text-2xl font-bold text-stone-800">{data.inProgressVideos}</p>
              </div>
              <Clock className="h-8 w-8 text-[#00FFC6]" />
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Completed</p>
                <p className="text-2xl font-bold text-stone-800">{data.completedVideos}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-[#FFD700]" />
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Courses</p>
                <p className="text-2xl font-bold text-stone-800">{courses.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-[#00FFFF]" />
            </div>
          </div>
        </div>
      )}

      {/* Continue Watching Section */}
      {continueWatchingVideos.length > 0 && !searchTerm && filterStatus === 'all' && selectedCourse === 'all' && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#39FF14]" />
            Continue Watching
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {continueWatchingVideos.map((video) => (
              <div
                key={`continue-${video.id}`}
                onClick={() => handleVideoClick(video)}
                className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-stone-200 cursor-pointer flex flex-col md:flex-row h-auto md:h-32"
              >
                <div className="relative w-full md:w-48 h-32 md:h-full bg-stone-200 flex-shrink-0">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-800">
                      <PlayCircle className="h-10 w-10 text-white/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="h-10 w-10 text-white drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800/50">
                    <div
                      className="h-full bg-[#39FF14]"
                      style={{ width: `${video.progress}%` }}
                    />
                  </div>
                </div>
                <div className="p-4 flex flex-col justify-center flex-1 min-w-0">
                  <h3 className="font-bold text-stone-800 mb-1 line-clamp-1 group-hover:text-[#39FF14] transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-xs text-stone-500 mb-2">{video.course_title}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs font-medium text-[#39FF14]">
                      {Math.round(video.progress || 0)}% complete
                    </span>
                    <span className="text-xs text-stone-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(video.duration || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search videos by title, course, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchTerm('');
                  searchInputRef.current?.blur();
                }
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-stone-100 rounded"
              >
                <X className="h-4 w-4 text-stone-400" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
            >
              <option value="all">All Videos</option>
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-lg px-2">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 hover:bg-stone-100 rounded transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 py-2 bg-transparent border-none focus:outline-none focus:ring-0 text-sm"
              >
                <option value="recent">Recent</option>
                <option value="title">Title</option>
                <option value="progress">Progress</option>
                <option value="duration">Duration</option>
              </select>
            </div>
          </div>
        </div>
        {filteredVideos.length > 0 && (
          <div className="text-sm text-stone-600">
            Showing {filteredVideos.length} of {data?.totalVideos || 0} videos
          </div>
        )}
      </div>

      {/* Videos Grid/List */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200">
          <PlayCircle className="h-16 w-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">No videos found</h3>
          <p className="text-stone-600">
            {searchTerm || filterStatus !== 'all' || selectedCourse !== 'all'
              ? 'Try adjusting your search or filters'
              : 'You don\'t have any videos yet. Enroll in a course to get started!'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => handleVideoClick(video)}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 hover:border-[#39FF14]/30 cursor-pointer flex flex-col h-full"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-stone-900 overflow-hidden">
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="h-12 w-12 text-white/20 group-hover:text-white/40 transition-colors" />
                  </div>
                )}
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                
                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                  {formatDuration(video.duration || 0)}
                </div>

                {/* Progress bar */}
                {video.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div
                      className="h-full bg-[#39FF14] shadow-[0_0_10px_#39FF14]"
                      style={{ width: `${video.progress}%` }}
                    />
                  </div>
                )}
                
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
                  <div className="w-12 h-12 bg-[#39FF14] rounded-full flex items-center justify-center shadow-lg shadow-[#39FF14]/40">
                    <PlayCircle className="h-6 w-6 text-stone-900 ml-0.5" />
                  </div>
                </div>
                
                {/* Status badge */}
                {video.is_completed && (
                  <div className="absolute top-2 right-2 bg-[#FFD700] text-stone-900 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Done
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <div className="mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 line-clamp-1">
                    {video.course_title}
                  </span>
                </div>
                <h3 className="font-bold text-stone-800 mb-2 line-clamp-2 group-hover:text-[#39FF14] transition-colors leading-tight">
                  {video.title}
                </h3>
                
                <div className="mt-auto pt-3 flex items-center justify-between border-t border-stone-100">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    {video.views !== undefined && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {video.views}
                      </span>
                    )}
                  </div>
                  
                  {video.progress > 0 ? (
                    <span className="text-xs font-medium text-[#39FF14]">
                      {Math.round(video.progress)}%
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">Not started</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => handleVideoClick(video)}
              className="group bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 border border-stone-200/50 cursor-pointer"
            >
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="relative w-32 h-20 bg-gradient-to-br from-stone-200 to-stone-300 rounded-lg overflow-hidden flex-shrink-0">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayCircle className="h-8 w-8 text-stone-400/50" />
                    </div>
                  )}
                  {video.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800/30">
                      <div
                        className="h-full bg-gradient-to-r from-[#39FF14] to-[#00FFC6]"
                        style={{ width: `${video.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-stone-800 mb-1 group-hover:text-[#39FF14] transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-sm text-stone-600 mb-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCourseClick(video.course_id);
                          }}
                          className="hover:text-[#39FF14] transition-colors"
                        >
                          {video.course_title}
                        </button>
                      </p>
                      {video.description && (
                        <p className="text-xs text-stone-500 line-clamp-2 mb-2">
                          {video.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(video.duration || 0)}
                        </span>
                        {video.views !== undefined && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {video.views} views
                          </span>
                        )}
                        {video.progress > 0 && (
                          <span className="text-[#39FF14] font-semibold">
                            {Math.round(video.progress)}% watched
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {video.is_completed && (
                        <CheckCircle className="h-5 w-5 text-[#FFD700]" />
                      )}
                      <PlayCircle className="h-6 w-6 text-[#39FF14] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-black w-full h-full sm:h-auto sm:max-w-7xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-stone-900/50">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{selectedVideo.title}</h2>
                <p className="text-sm text-stone-400 truncate">{selectedVideo.course_title}</p>
              </div>
              <button
                onClick={handleClosePlayer}
                className="p-2 hover:bg-white/10 rounded-full transition-colors ml-4"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative">
              <div className="w-full h-full max-h-[80vh]">
                <UnifiedVideoPlayer
                  lesson={{
                    id: selectedVideo.lesson_id,
                    title: selectedVideo.title,
                    video_provider: selectedVideo.video_provider || 'mux',
                    mux_playback_id: selectedVideo.mux_playback_id || null,
                    mux_asset_id: selectedVideo.mux_asset_id || null,
                    mux_status: selectedVideo.mux_status || null,
                    allow_download: false
                  }}
                  autoPlay={true}
                  courseTitle={selectedVideo.course_title}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentVideos;

