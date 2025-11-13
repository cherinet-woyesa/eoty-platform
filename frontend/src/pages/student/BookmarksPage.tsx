import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bookmark, BookmarkCheck, Search, X, Clock, BookOpen, 
  PlayCircle, Trash2, Loader2, AlertCircle, Grid, List,
  Eye, CheckCircle, Calendar
} from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';

interface BookmarkedItem {
  id: string;
  type: 'lesson' | 'course';
  title: string;
  description?: string;
  course_id?: string;
  course_title?: string;
  lesson_id?: string;
  thumbnail?: string;
  duration?: number;
  progress?: number;
  is_completed?: boolean;
  bookmarked_at: string;
  mux_playback_id?: string;
  mux_status?: string;
}

const BookmarksPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<BookmarkedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'lesson' | 'course'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Load bookmarks from enrolled courses and lessons
  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get enrolled courses
      const dashboardResponse = await apiClient.get('/students/dashboard');
      if (!dashboardResponse.data.success) {
        throw new Error('Failed to load courses');
      }
      
      const enrolledCourses = dashboardResponse.data.data.enrolledCourses || [];
      const allBookmarks: BookmarkedItem[] = [];
      
      // Fetch lessons for each course and check for bookmarked items
      for (const course of enrolledCourses) {
        try {
          const response = await apiClient.get(`/videos/courses/${course.id}/lessons`);
          if (response.data.success) {
            const lessons = response.data.data.lessons || response.data.data || [];
            
            // For now, we'll simulate bookmarks by checking localStorage
            // In a real implementation, this would come from the backend
            lessons.forEach((lesson: any) => {
              const bookmarkKey = `bookmark_${user?.id}_${lesson.id || lesson.lesson_id}`;
              const isBookmarked = localStorage.getItem(bookmarkKey) === 'true';
              
              if (isBookmarked) {
                allBookmarks.push({
                  id: `lesson_${lesson.id || lesson.lesson_id}`,
                  type: 'lesson',
                  title: lesson.title || lesson.lesson_title || 'Untitled Lesson',
                  description: lesson.description || lesson.lesson_description,
                  course_id: course.id,
                  course_title: course.title,
                  lesson_id: lesson.id || lesson.lesson_id,
                  thumbnail: lesson.thumbnail || course.coverImage,
                  duration: lesson.duration || lesson.video_duration || 0,
                  progress: lesson.progress || lesson.completion_percentage || 0,
                  is_completed: lesson.is_completed || lesson.progress === 100,
                  bookmarked_at: localStorage.getItem(`${bookmarkKey}_date`) || new Date().toISOString(),
                  mux_playback_id: lesson.mux_playback_id,
                  mux_status: lesson.mux_status
                });
              }
            });
            
            // Add course bookmark if exists
            const courseBookmarkKey = `bookmark_${user?.id}_course_${course.id}`;
            if (localStorage.getItem(courseBookmarkKey) === 'true') {
              allBookmarks.push({
                id: `course_${course.id}`,
                type: 'course',
                title: course.title,
                description: course.description,
                course_id: course.id,
                thumbnail: course.coverImage,
                progress: course.progress || 0,
                bookmarked_at: localStorage.getItem(`${courseBookmarkKey}_date`) || new Date().toISOString()
              });
            }
          }
        } catch (err) {
          console.warn(`Failed to load lessons for course ${course.id}:`, err);
        }
      }
      
      // Sort by bookmark date (most recent first)
      allBookmarks.sort((a, b) => 
        new Date(b.bookmarked_at).getTime() - new Date(a.bookmarked_at).getTime()
      );
      
      setBookmarks(allBookmarks);
    } catch (err: any) {
      console.error('Failed to load bookmarks:', err);
      setError('Failed to load bookmarks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // Filtered bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.course_title || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || item.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [bookmarks, searchTerm, filterType]);

  // Remove bookmark
  const handleRemoveBookmark = useCallback(async (item: BookmarkedItem) => {
    try {
      setRemovingId(item.id);
      
      if (item.type === 'lesson' && item.lesson_id) {
        const bookmarkKey = `bookmark_${user?.id}_${item.lesson_id}`;
        localStorage.removeItem(bookmarkKey);
        localStorage.removeItem(`${bookmarkKey}_date`);
      } else if (item.type === 'course' && item.course_id) {
        const bookmarkKey = `bookmark_${user?.id}_course_${item.course_id}`;
        localStorage.removeItem(bookmarkKey);
        localStorage.removeItem(`${bookmarkKey}_date`);
      }
      
      // Reload bookmarks
      await loadBookmarks();
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
    } finally {
      setRemovingId(null);
    }
  }, [user?.id, loadBookmarks]);

  // Format duration
  const formatDuration = useCallback((seconds: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  // Format date
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  }, []);

  // Navigate to item
  const handleItemClick = useCallback((item: BookmarkedItem) => {
    if (item.type === 'lesson' && item.course_id && item.lesson_id) {
      navigate(`/student/courses/${item.course_id}?lesson=${item.lesson_id}`);
    } else if (item.type === 'course' && item.course_id) {
      navigate(`/student/courses/${item.course_id}`);
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#39FF14] mx-auto mb-4" />
            <p className="text-stone-600 text-lg">Loading bookmarks...</p>
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
              onClick={loadBookmarks}
              className="px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 rounded-lg hover:shadow-lg transition-all font-semibold"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const lessonCount = bookmarks.filter(b => b.type === 'lesson').length;
  const courseCount = bookmarks.filter(b => b.type === 'course').length;

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-800 mb-2">My Bookmarks</h1>
          <p className="text-stone-600">Your saved lessons and courses</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900'
                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
            }`}
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
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-stone-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-600">Total Bookmarks</p>
              <p className="text-2xl font-bold text-stone-800">{bookmarks.length}</p>
            </div>
            <Bookmark className="h-8 w-8 text-[#39FF14]" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-stone-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-600">Lessons</p>
              <p className="text-2xl font-bold text-stone-800">{lessonCount}</p>
            </div>
            <PlayCircle className="h-8 w-8 text-[#00FFC6]" />
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-stone-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-600">Courses</p>
              <p className="text-2xl font-bold text-stone-800">{courseCount}</p>
            </div>
            <BookOpen className="h-8 w-8 text-[#FFD700]" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
          <input
            type="text"
            placeholder="Search bookmarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
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
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
        >
          <option value="all">All Bookmarks</option>
          <option value="lesson">Lessons</option>
          <option value="course">Courses</option>
        </select>
      </div>

      {/* Bookmarks Grid/List */}
      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200">
          <Bookmark className="h-16 w-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">No bookmarks found</h3>
          <p className="text-stone-600 mb-4">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start bookmarking lessons and courses to access them quickly!'}
          </p>
          <Link
            to="/student/browse-courses"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            Browse Courses
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredBookmarks.map((item) => (
            <div
              key={item.id}
              className="group bg-white/90 backdrop-blur-md rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-stone-200/50 transform hover:-translate-y-2 hover:scale-[1.02] cursor-pointer relative"
            >
              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveBookmark(item);
                }}
                disabled={removingId === item.id}
                className="absolute top-2 right-2 z-10 p-2 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                title="Remove bookmark"
              >
                {removingId === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>

              {/* Thumbnail */}
              <div 
                onClick={() => handleItemClick(item)}
                className="relative h-48 bg-gradient-to-br from-stone-200 to-stone-300 overflow-hidden"
              >
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {item.type === 'lesson' ? (
                      <PlayCircle className="h-16 w-16 text-stone-400/50" />
                    ) : (
                      <BookOpen className="h-16 w-16 text-stone-400/50" />
                    )}
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    item.type === 'lesson' 
                      ? 'bg-[#39FF14]/90 text-stone-900' 
                      : 'bg-[#00FFC6]/90 text-stone-900'
                  }`}>
                    {item.type === 'lesson' ? 'Lesson' : 'Course'}
                  </div>
                </div>
                {item.progress > 0 && item.type === 'lesson' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800/30">
                    <div
                      className="h-full bg-gradient-to-r from-[#39FF14] to-[#00FFC6]"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-stone-800 mb-1 line-clamp-2 group-hover:text-[#39FF14] transition-colors">
                  {item.title}
                </h3>
                {item.course_title && item.type === 'lesson' && (
                  <p className="text-sm text-stone-600 mb-2 line-clamp-1">
                    {item.course_title}
                  </p>
                )}
                {item.description && (
                  <p className="text-xs text-stone-500 line-clamp-2 mb-3">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(item.bookmarked_at)}
                  </span>
                  {item.type === 'lesson' && item.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(item.duration)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookmarks.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="group bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 border border-stone-200/50 cursor-pointer relative"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveBookmark(item);
                }}
                disabled={removingId === item.id}
                className="absolute top-4 right-4 p-2 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                title="Remove bookmark"
              >
                {removingId === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>

              <div className="flex gap-4">
                <div className="relative w-32 h-20 bg-gradient-to-br from-stone-200 to-stone-300 rounded-lg overflow-hidden flex-shrink-0">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {item.type === 'lesson' ? (
                        <PlayCircle className="h-8 w-8 text-stone-400/50" />
                      ) : (
                        <BookOpen className="h-8 w-8 text-stone-400/50" />
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          item.type === 'lesson' 
                            ? 'bg-[#39FF14]/20 text-[#39FF14]' 
                            : 'bg-[#00FFC6]/20 text-[#00FFC6]'
                        }`}>
                          {item.type === 'lesson' ? 'Lesson' : 'Course'}
                        </span>
                        {item.is_completed && item.type === 'lesson' && (
                          <CheckCircle className="h-4 w-4 text-[#FFD700]" />
                        )}
                      </div>
                      <h3 className="font-bold text-stone-800 mb-1 group-hover:text-[#39FF14] transition-colors">
                        {item.title}
                      </h3>
                      {item.course_title && item.type === 'lesson' && (
                        <p className="text-sm text-stone-600 mb-2">
                          {item.course_title}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-xs text-stone-500 line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Bookmarked {formatDate(item.bookmarked_at)}
                        </span>
                        {item.type === 'lesson' && item.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(item.duration)}
                          </span>
                        )}
                        {item.progress > 0 && item.type === 'lesson' && (
                          <span className="text-[#39FF14] font-semibold">
                            {Math.round(item.progress)}% watched
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.type === 'lesson' ? (
                        <PlayCircle className="h-6 w-6 text-[#39FF14] opacity-0 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <BookOpen className="h-6 w-6 text-[#00FFC6] opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarksPage;
