import React, { useCallback, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/services/api/apiClient';
import { 
  PlayCircle, Clock, Users, Star, BookOpen, ArrowRight, Eye, 
  Bookmark, Filter, Search, SortAsc, MoreVertical, Download 
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lastAccessed: string;
  instructor: string;
  rating: number;
  studentCount: number;
  duration: number;
  thumbnail?: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  isBookmarked?: boolean;
  isFeatured?: boolean;
}

interface CourseGridProps {
  courses: Course[];
  compact?: boolean;
  onCourseAction?: (courseId: string, action: string) => void;
}

const CourseGrid: React.FC<CourseGridProps> = ({ 
  courses, 
  compact = false,
  onCourseAction 
}) => {
  const [bookmarkedCourses, setBookmarkedCourses] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'progress' | 'recent' | 'title' | 'difficulty'>('recent');
  const [filterBy, setFilterBy] = useState<'all' | 'in-progress' | 'completed' | 'not-started'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load bookmarks
  React.useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const response = await apiClient.get('/bookmarks?type=course');
        if (response.data) {
          const bookmarkedIds = new Set(response.data.map((b: any) => b.entity_id.toString()));
          setBookmarkedCourses(bookmarkedIds);
        }
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      }
    };
    
    loadBookmarks();
  }, []);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '🟢';
      case 'intermediate':
        return '🟡';
      case 'advanced':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const handleCourseClick = useCallback((courseId: string) => {
    onCourseAction?.(courseId, 'view');
    // Analytics tracking
    console.log('Course clicked:', courseId);
  }, [onCourseAction]);

  const toggleBookmark = useCallback((courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
        onCourseAction?.(courseId, 'unbookmark');
      } else {
        newSet.add(courseId);
        onCourseAction?.(courseId, 'bookmark');
      }
      return newSet;
    });
  }, [onCourseAction]);

  const downloadCertificate = useCallback((courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onCourseAction?.(courseId, 'download-certificate');
  }, [onCourseAction]);

  // Filter and sort courses
  const filteredAndSortedCourses = useMemo(() => {
    let filtered = courses.filter(course => 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Apply progress filters
    switch (filterBy) {
      case 'in-progress':
        filtered = filtered.filter(course => course.progress > 0 && course.progress < 100);
        break;
      case 'completed':
        filtered = filtered.filter(course => course.progress === 100);
        break;
      case 'not-started':
        filtered = filtered.filter(course => course.progress === 0);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'progress':
        return [...filtered].sort((a, b) => b.progress - a.progress);
      case 'recent':
        return [...filtered].sort((a, b) => 
          new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
        );
      case 'title':
        return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
      case 'difficulty':
        const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
        return [...filtered].sort((a, b) => 
          difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
        );
      default:
        return filtered;
    }
  }, [courses, searchQuery, filterBy, sortBy]);

  const CourseCardSkeleton: React.FC = () => (
    <div className="border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <div className="h-32 bg-gray-300"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded w-full"></div>
        <div className="h-3 bg-gray-300 rounded w-2/3"></div>
        <div className="h-2 bg-gray-300 rounded w-1/2"></div>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-stone-50 to-neutral-50 rounded-xl p-6 border border-stone-200/50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-800 flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-stone-600" />
            My Courses ({filteredAndSortedCourses.length})
          </h3>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
              />
            </div>
            <Link
              to="/courses"
              className="text-sm text-[#27AE60] hover:text-[#16A085] font-medium flex items-center"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        
        {filteredAndSortedCourses.length > 0 ? (
          <div className="space-y-3">
            {filteredAndSortedCourses.slice(0, 4).map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between p-3 rounded-lg border border-stone-200/50 hover:border-stone-300/50 bg-white/50 hover:bg-white transition-all duration-200 cursor-pointer group hover:shadow-sm"
                onClick={() => handleCourseClick(course.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-stone-800 truncate group-hover:text-stone-900 transition-colors">
                      {course.title}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getDifficultyColor(course.difficulty)}`}>
                      {getDifficultyIcon(course.difficulty)} {course.difficulty}
                    </span>
                    {course.isFeatured && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        ⭐ Featured
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <PlayCircle className="h-3 w-3" />
                      <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span>{course.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Last: {new Date(course.lastAccessed).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          course.progress === 100 ? 'bg-green-500' : 'bg-[#27AE60]'
                        }`}
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{course.progress}% complete</span>
                      {course.progress === 100 && (
                        <span className="text-green-600 font-medium">Completed! 🎉</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={(e) => toggleBookmark(course.id, e)}
                    className={`p-2 transition-colors rounded-lg ${
                      bookmarkedCourses.has(course.id) 
                        ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100' 
                        : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-50'
                    }`}
                  >
                    <Bookmark 
                      className={`h-4 w-4 ${bookmarkedCourses.has(course.id) ? 'fill-current' : ''}`} 
                    />
                  </button>
                  <Link
                    to={`/student/courses/${course.id}`}
                    className="p-2 text-gray-400 hover:text-[#27AE60] transition-colors rounded-lg hover:bg-[#27AE60]/10"
                    onClick={(e) => e.stopPropagation()}
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
            <p className="text-gray-500 mb-2">
              {searchQuery ? 'No courses match your search' : 'No courses enrolled yet'}
            </p>
            <p className="text-gray-400 text-sm mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Start your learning journey today'}
            </p>
            <Link
              to="/student/browse-courses"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 text-sm font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {searchQuery ? 'Browse All Courses' : 'Browse Available Courses'}
            </Link>
          </div>
        )}

        {/* Filters for compact view */}
        {filteredAndSortedCourses.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-500">Filter:</span>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
              >
                <option value="all">All Courses</option>
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-stone-50 to-neutral-50 rounded-xl p-6 border border-stone-200/50 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-stone-800">My Courses</h2>
          <p className="text-stone-600 mt-1">
            {filteredAndSortedCourses.length} course{filteredAndSortedCourses.length !== 1 ? 's' : ''} • Continue your learning journey
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-48"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="recent">Recently Accessed</option>
            <option value="progress">Progress</option>
            <option value="title">Title</option>
            <option value="difficulty">Difficulty</option>
          </select>

          {/* Filter */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
          >
            <option value="all">All Courses</option>
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <Link
            to="/courses"
            className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 text-sm font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Browse Courses
          </Link>
        </div>
      </div>

      {filteredAndSortedCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedCourses.map((course) => (
            <div
              key={course.id}
              className="border border-stone-200/50 bg-white/50 rounded-lg hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group"
              onClick={() => handleCourseClick(course.id)}
            >
              {/* Course Thumbnail */}
              <div className="h-32 bg-gradient-to-r from-[#27AE60] to-[#2980B9] relative overflow-hidden">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <BookOpen className="h-8 w-8" />
                  </div>
                )}
                
                {/* Featured Badge */}
                {course.isFeatured && (
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500 text-white">
                      ⭐ Featured
                    </span>
                  </div>
                )}
                
                {/* Difficulty Badge */}
                <div className="absolute top-2 right-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${
                    course.difficulty === 'beginner' ? 'bg-green-500' :
                    course.difficulty === 'intermediate' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {getDifficultyIcon(course.difficulty)} {course.difficulty}
                  </span>
                </div>
                
                {/* Category Badge */}
                <div className="absolute bottom-2 left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-black/50 text-white">
                    {course.category}
                  </span>
                </div>

                {/* Progress Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                  <div className="flex justify-between items-center">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="w-full bg-white/30 rounded-full h-1 mt-1">
                    <div 
                      className={`h-1 rounded-full ${
                        course.progress === 100 ? 'bg-green-400' : 'bg-[#27AE60]'
                      }`}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Course Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-stone-800 line-clamp-2 group-hover:text-stone-900 transition-colors flex-1 mr-2">
                    {course.title}
                  </h3>
                  <button
                    onClick={(e) => toggleBookmark(course.id, e)}
                    className={`p-1 transition-colors rounded ${
                      bookmarkedCourses.has(course.id) 
                        ? 'text-yellow-500 hover:text-yellow-600' 
                        : 'text-gray-400 hover:text-yellow-500'
                    }`}
                  >
                    <Bookmark 
                      className={`h-4 w-4 ${bookmarkedCourses.has(course.id) ? 'fill-current' : ''}`} 
                    />
                  </button>
                </div>
                
                <p className="text-stone-600 text-sm mb-3 line-clamp-2">{course.description}</p>
                
                {/* Instructor */}
                <div className="flex items-center text-xs text-stone-500 mb-3">
                  <span>by {course.instructor}</span>
                </div>
                
                {/* Metadata */}
                <div className="space-y-2 text-xs text-stone-500 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{course.studentCount.toLocaleString()} students</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <PlayCircle className="h-3 w-3" />
                      <span>{course.totalLessons} lessons</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(course.duration)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span>{course.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {course.tags && course.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {course.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-stone-100 text-stone-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {course.tags.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-stone-100 text-stone-700">
                        +{course.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-200/50">
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/courses/${course.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 hover:shadow-lg transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {course.progress === 100 ? 'Review' : course.progress > 0 ? 'Continue' : 'Start'}
                    </Link>
                    
                    {course.progress === 100 && (
                      <button
                        onClick={(e) => downloadCertificate(course.id, e)}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center space-x-1"
                      >
                        <Download className="h-3 w-3" />
                        <span>Certificate</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCourseAction?.(course.id, 'more');
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No courses found' : 'No courses yet'}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {searchQuery 
              ? 'No courses match your search criteria. Try adjusting your filters or search terms.'
              : 'Start your learning journey by enrolling in courses that match your interests and goals.'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/courses"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              <BookOpen className="h-5 w-5 mr-2" />
              Explore Courses
            </Link>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterBy('all');
                  setSortBy('recent');
                }}
                className="inline-flex items-center px-6 py-3 bg-stone-100 text-stone-700 font-medium rounded-lg hover:bg-stone-200 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* View All Courses */}
      {filteredAndSortedCourses.length > 0 && (
        <div className="mt-6 text-center">
          <Link
            to="/courses"
            className="inline-flex items-center text-sm text-[#27AE60] hover:text-[#16A085] font-medium"
          >
            View All Courses
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default React.memo(CourseGrid);