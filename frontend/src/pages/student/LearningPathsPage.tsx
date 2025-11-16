import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Target, BookOpen, CheckCircle, Clock, ArrowRight, 
  PlayCircle, Loader2, AlertCircle, TrendingUp, Award,
  Zap, Star, Lock, Unlock, Users, Calendar
} from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number; // in hours
  courses: PathCourse[];
  progress: number;
  is_enrolled: boolean;
  thumbnail?: string;
  student_count: number;
  rating: number;
}

interface PathCourse {
  id: string;
  title: string;
  order: number;
  is_completed: boolean;
  is_locked: boolean;
  progress: number;
  estimated_duration: number;
}

const LearningPathsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Load learning paths from enrolled courses
  const loadLearningPaths = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get enrolled courses
      const dashboardResponse = await apiClient.get('/students/dashboard');
      if (!dashboardResponse.data.success) {
        throw new Error('Failed to load courses');
      }
      
      const enrolledCourses = dashboardResponse.data.data.enrolledCourses || [];
      
      // Create learning paths from enrolled courses
      // Group courses by category and create paths
      const pathsMap = new Map<string, LearningPath>();
      
      enrolledCourses.forEach((course: any, index: number) => {
        const category = course.category || 'General';
        const pathId = `path_${category.toLowerCase().replace(/\s+/g, '_')}`;
        
        if (!pathsMap.has(pathId)) {
          pathsMap.set(pathId, {
            id: pathId,
            title: `${category} Learning Path`,
            description: `Master ${category} through structured courses`,
            category: category,
            difficulty: (course.level || 'beginner').toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
            estimated_duration: 0,
            courses: [],
            progress: 0,
            is_enrolled: true,
            student_count: course.studentCount || 0,
            rating: 4.5
          });
        }
        
        const path = pathsMap.get(pathId)!;
        path.courses.push({
          id: course.id.toString(),
          title: course.title,
          order: path.courses.length + 1,
          is_completed: course.progress === 100,
          is_locked: false,
          progress: course.progress || 0,
          estimated_duration: 0
        });
        
        path.estimated_duration += course.duration || 0;
        path.progress = Math.round(
          path.courses.reduce((sum, c) => sum + c.progress, 0) / path.courses.length
        );
      });
      
      // Add some recommended paths
      const recommendedPaths: LearningPath[] = [
        {
          id: 'path_faith_foundations',
          title: 'Faith Foundations',
          description: 'Build a strong foundation in Orthodox faith and doctrine',
          category: 'Faith & Doctrine',
          difficulty: 'beginner',
          estimated_duration: 20,
          courses: [],
          progress: 0,
          is_enrolled: false,
          student_count: 1250,
          rating: 4.8
        },
        {
          id: 'path_church_history',
          title: 'Church History Journey',
          description: 'Explore the rich history of the Orthodox Church',
          category: 'History',
          difficulty: 'intermediate',
          estimated_duration: 30,
          courses: [],
          progress: 0,
          is_enrolled: false,
          student_count: 890,
          rating: 4.7
        },
        {
          id: 'path_spiritual_growth',
          title: 'Spiritual Growth',
          description: 'Deepen your spiritual practice and understanding',
          category: 'Spiritual Development',
          difficulty: 'intermediate',
          estimated_duration: 25,
          courses: [],
          progress: 0,
          is_enrolled: false,
          student_count: 1100,
          rating: 4.9
        }
      ];
      
      const allPaths = [...Array.from(pathsMap.values()), ...recommendedPaths];
      setPaths(allPaths);
    } catch (err: any) {
      console.error('Failed to load learning paths:', err);
      setError('Failed to load learning paths. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLearningPaths();
  }, [loadLearningPaths]);

  // Filtered paths
  const filteredPaths = useMemo(() => {
    return paths.filter(path => {
      const matchesCategory = selectedCategory === 'all' || path.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || path.difficulty === selectedDifficulty;
      return matchesCategory && matchesDifficulty;
    });
  }, [paths, selectedCategory, selectedDifficulty]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(paths.map(p => p.category));
    return Array.from(cats);
  }, [paths]);

  // Get difficulty color
  const getDifficultyColor = useCallback((difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]/30';
      case 'intermediate':
        return 'bg-[#00FFC6]/20 text-[#00FFC6] border-[#00FFC6]/30';
      case 'advanced':
        return 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30';
      default:
        return 'bg-stone-200 text-stone-600 border-stone-300';
    }
  }, []);

  // Handle path enrollment
  const handleEnroll = useCallback((pathId: string) => {
    // Navigate to browse courses with category filter
    const path = paths.find(p => p.id === pathId);
    if (path) {
      navigate(`/student/browse-courses?category=${encodeURIComponent(path.category)}`);
    }
  }, [paths, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-[#27AE60] mx-auto mb-4" />
              <p className="text-stone-600 text-lg">Loading learning paths...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 text-lg mb-4">{error}</p>
              <button 
                onClick={loadLearningPaths}
                className="px-4 py-2 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors font-semibold shadow-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-800 mb-2">Learning Paths</h1>
        <p className="text-stone-600">Follow structured paths to master your learning</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50"
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Learning Paths */}
      {filteredPaths.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200">
          <Target className="h-16 w-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">No learning paths found</h3>
          <p className="text-stone-600">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPaths.map((path) => (
            <div
              key={path.id}
              className="bg-white/90 backdrop-blur-md rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-stone-200/50"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#27AE60]/10 via-[#16A085]/10 to-[#2980B9]/10 p-6 border-b border-stone-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-[#27AE60]" />
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getDifficultyColor(path.difficulty)}`}>
                        {path.difficulty}
                      </span>
                      {path.is_enrolled && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-[#27AE60]/15 text-[#27AE60] border border-[#27AE60]/30">
                          Enrolled
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-stone-800 mb-2">{path.title}</h2>
                    <p className="text-stone-600 text-sm">{path.description}</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {path.is_enrolled && path.progress > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(path.progress)}%</span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#27AE60] to-[#16A085] h-2 rounded-full transition-all"
                        style={{ width: `${path.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Course List */}
              <div className="p-6">
                {path.courses.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {path.courses.map((course, index) => (
                      <div
                        key={course.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 hover:border-[#27AE60] transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm font-semibold text-stone-600">
                          {course.order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-stone-800 text-sm">{course.title}</h3>
                            {course.is_completed ? (
                              <CheckCircle className="h-4 w-4 text-[#27AE60] flex-shrink-0" />
                            ) : course.is_locked ? (
                              <Lock className="h-4 w-4 text-stone-400 flex-shrink-0" />
                            ) : (
                              <Unlock className="h-4 w-4 text-[#16A085] flex-shrink-0" />
                            )}
                          </div>
                          {course.progress > 0 && !course.is_completed && (
                            <div className="w-full bg-stone-200 rounded-full h-1 mt-1">
                              <div
                                className="bg-gradient-to-r from-[#27AE60] to-[#16A085] h-1 rounded-full"
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-stone-500">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Courses will appear here</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                  <div className="flex items-center gap-4 text-xs text-stone-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {path.estimated_duration}h
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {path.student_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-[#FFD700] text-[#FFD700]" />
                      {path.rating}
                    </span>
                  </div>
                  {path.is_enrolled ? (
                    <Link
                      to={`/student/courses`}
                      className="px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 hover:shadow-lg transition-all font-semibold text-sm flex items-center gap-1"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleEnroll(path.id)}
                      className="px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 hover:shadow-lg transition-all font-semibold text-sm flex items-center gap-1"
                    >
                      Start Path
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
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

export default LearningPathsPage;
