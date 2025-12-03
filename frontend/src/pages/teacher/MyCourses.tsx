import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Plus, Search, Video, Users,
  Sparkles,
  AlertCircle, RefreshCw, Grid, List,
  SortAsc, SortDesc
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { coursesApi } from '@/services/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { BulkActions } from '@/components/shared/courses/BulkActions';
import type { Course } from '@/types/courses';

interface CourseStats {
  totalCourses: number;
  activeStudents: number;
  recordedVideos: number;
  hoursTaught: number;
  publishedCourses: number;
  averageRating: number;
  completionRate: number;
}

const MyCourses: React.FC = () => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // Memoize categories and sort options to prevent re-creation on each render
  const categories = useMemo(() => [
    { value: 'all', label: t('teacher_courses.all_categories_filter'), count: 0 },
    { value: 'faith', label: t('teacher_courses.faith_doctrine_filter'), count: 0 },
    { value: 'history', label: t('teacher_courses.church_history_filter'), count: 0 },
    { value: 'spiritual', label: t('teacher_courses.spiritual_development_filter'), count: 0 },
    { value: 'bible', label: t('teacher_courses.bible_study_filter'), count: 0 },
    { value: 'liturgical', label: t('teacher_courses.liturgical_studies_filter'), count: 0 },
    { value: 'youth', label: t('teacher_courses.youth_ministry_filter'), count: 0 }
  ], [t]);

  const sortOptions = useMemo(() => [
    { value: 'created_at', label: t('teacher_courses.sort_by_date_created') },
    { value: 'updated_at', label: t('teacher_courses.sort_by_last_updated') },
    { value: 'title', label: t('teacher_courses.sort_by_title') },
    { value: 'lesson_count', label: t('teacher_courses.sort_by_lesson_count') },
    { value: 'student_count', label: t('teacher_courses.sort_by_student_count') },
    { value: 'total_duration', label: t('teacher_courses.sort_by_duration') }
  ], [t]);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await coursesApi.getCourses();
      
      if (response.success) {
        const coursesData = response.data.courses || [];
        setCourses(coursesData);
        
        // Calculate stats
        const courseStats: CourseStats = {
          totalCourses: coursesData.length,
          activeStudents: coursesData.reduce((sum: number, course: Course) => sum + (course.student_count || 0), 0),
          recordedVideos: coursesData.reduce((sum: number, course: Course) => sum + (course.lesson_count || 0), 0),
          hoursTaught: Math.round(coursesData.reduce((sum: number, course: Course) => sum + (course.total_duration || 0), 0) / 60),
          publishedCourses: coursesData.filter((course: Course) => course.is_published).length,
          averageRating: 4.8, // Mock data - would come from ratings system
          completionRate: 87 // Mock data - would come from progress tracking
        };
        
        setStats(courseStats);
        
        // Update category counts
        categories.forEach(category => {
          if (category.value !== 'all') {
            category.count = coursesData.filter((course: Course) => course.category === category.value).length;
          } else {
            category.count = coursesData.length;
          }
        });
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError(t('teacher_courses.load_courses_fail'));
    } finally {
      setLoading(false);
    }
  }, [categories, t]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Memoize filtered and sorted courses to prevent unnecessary re-calculations
  const filteredAndSortedCourses = useMemo(() => {
    return courses
      .filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             course.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
        const matchesTab = activeTab === 'all' ||
                           (activeTab === 'published' && course.is_published) ||
                           (activeTab === 'drafts' && !course.is_published);
        return matchesSearch && matchesCategory && matchesTab;
      })
      .sort((a, b) => {
        let aValue: any = a[sortBy as keyof Course];
        let bValue: any = b[sortBy as keyof Course];
        
        if (sortBy === 'created_at' || sortBy === 'updated_at') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [courses, searchTerm, filterCategory, activeTab, sortBy, sortOrder]);

  const getCategoryColor = useCallback((category: string) => {
    const colors: { [key: string]: string } = {
      faith: 'from-emerald-500 to-emerald-600',
      history: 'from-amber-500 to-amber-600',
      spiritual: 'from-teal-500 to-teal-600',
      bible: 'from-green-500 to-green-600',
      liturgical: 'from-red-500 to-red-600',
      youth: 'from-cyan-500 to-cyan-600'
    };
    return colors[category] || 'from-stone-500 to-stone-600';
  }, []);

  const formatDuration = useCallback((minutes: number) => {
    if (!minutes) return t('teacher_courses.duration_minutes', { minutes: 0 });
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? t('teacher_courses.duration_hours_minutes', { hours, minutes: mins }) : t('teacher_courses.duration_minutes', { minutes: mins });
  }, [t]);

  const getTimeAgo = useCallback((date: string | Date) => {
    const now = new Date();
    const courseDate = typeof date === 'string' ? new Date(date) : date;
    const diffInHours = Math.floor((now.getTime() - courseDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('teacher_courses.just_now');
    if (diffInHours < 24) return t('teacher_courses.hours_ago', { count: diffInHours });
    if (diffInHours < 168) return t('teacher_courses.days_ago', { count: Math.floor(diffInHours / 24) });
    return courseDate.toLocaleDateString();
  }, [t]);

  // Memoize compact course rendering to prevent unnecessary re-renders
  const renderCourseCard = useCallback((course: Course) => (
    <div key={course.id} className={`relative ${viewMode === 'grid'
      ? "bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 overflow-hidden hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 hover:border-[#27AE60]/50"
      : "bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-2 hover:shadow-md transition-all duration-200 hover:border-[#27AE60]/50"
    } ${selectedCourses.includes(course.id) ? 'ring-1 ring-[#27AE60] bg-gradient-to-br from-[#27AE60]/10 to-[#16A085]/10' : ''}`}>
      {/* Selection Checkbox */}
      <div className="absolute top-1.5 left-1.5 z-10">
        <input
          type="checkbox"
          checked={selectedCourses.includes(course.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedCourses([...selectedCourses, course.id]);
            } else {
              setSelectedCourses(selectedCourses.filter(id => id !== course.id));
            }
          }}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
        />
      </div>
      {viewMode === 'grid' ? (
        // Compact Grid View
        <>
          <div className="relative h-32">
            {course.cover_image ? (
              <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${getCategoryColor(course.category)} flex items-center justify-center`}>
                <BookOpen className="h-8 w-8 text-white/50" />
              </div>
            )}
            <div className="absolute top-1.5 right-1.5">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${course.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-800'}`}>
                {course.is_published ? t('common.published') : t('common.draft')}
              </span>
            </div>
          </div>
          <div className="p-3">
            <h3 className="font-semibold text-sm text-stone-800 truncate mb-1">{course.title}</h3>
            <div className="flex items-center text-xs text-stone-500 space-x-2">
              <div className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                <span>{t('common.student_count', { count: course.student_count || 0 })}</span>
              </div>
              <div className="flex items-center">
                <Video className="h-3 w-3 mr-1" />
                <span>{t('common.lesson_count', { count: course.lesson_count || 0 })}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        // List View
        <div className="flex items-center">
          <div className="w-1/12 pl-6">
            <input
              type="checkbox"
              checked={selectedCourses.includes(course.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedCourses([...selectedCourses, course.id]);
                } else {
                  setSelectedCourses(selectedCourses.filter(id => id !== course.id));
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
          </div>
          <div className="w-4/12">
            <Link to={`/teacher/courses/${course.id}/edit`} className="font-semibold text-stone-800 hover:text-emerald-600">{course.title}</Link>
          </div>
          <div className="w-2/12 text-sm text-stone-600">{t('common.student_count', { count: course.student_count || 0 })}</div>
          <div className="w-2/12 text-sm text-stone-600">{formatDuration(course.total_duration || 0)}</div>
          <div className="w-2/12 text-sm text-stone-600">{getTimeAgo(course.updated_at)}</div>
          <div className="w-1/12">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${course.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-800'}`}>
              {course.is_published ? t('common.published') : t('common.draft')}
            </span>
          </div>
        </div>
      )}
    </div>
  ), [viewMode, selectedCourses, getCategoryColor, formatDuration, getTimeAgo, t]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCourses(filteredAndSortedCourses.map(c => c.id));
    } else {
      setSelectedCourses([]);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><LoadingSpinner text={t('common.loading')} /></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-red-50 text-red-700 rounded-lg p-4">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="font-semibold">{t('common.error')}</p>
        <p>{error}</p>
        <button onClick={() => loadCourses()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.try_again')}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{t('teacher_courses.title')}</h1>
          <p className="text-sm text-stone-600 mt-1">{t('teacher_courses.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/teacher/courses/new" className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center font-semibold text-sm">
            <Plus className="h-4 w-4 mr-1" />
            {t('teacher_courses.new_course_btn')}
          </Link>
          <button onClick={() => setShowTemplates(true)} className="px-4 py-2 bg-white border border-stone-300 text-stone-700 rounded-md hover:bg-stone-50 flex items-center font-semibold text-sm">
            <Sparkles className="h-4 w-4 mr-1 text-amber-500" />
            {t('teacher_courses.use_template_btn')}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4 text-center">
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-stone-200"><p className="text-xs text-stone-500">{t('teacher_courses.stats_total_courses')}</p><p className="font-bold text-lg text-stone-800">{stats.totalCourses}</p></div>
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-stone-200"><p className="text-xs text-stone-500">{t('teacher_courses.stats_active_students')}</p><p className="font-bold text-lg text-stone-800">{stats.activeStudents}</p></div>
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-stone-200"><p className="text-xs text-stone-500">{t('teacher_courses.stats_recorded_videos')}</p><p className="font-bold text-lg text-stone-800">{stats.recordedVideos}</p></div>
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-stone-200"><p className="text-xs text-stone-500">{t('teacher_courses.stats_hours_taught')}</p><p className="font-bold text-lg text-stone-800">{stats.hoursTaught}</p></div>
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-stone-200"><p className="text-xs text-stone-500">{t('teacher_courses.stats_published_courses')}</p><p className="font-bold text-lg text-stone-800">{stats.publishedCourses}</p></div>
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-stone-200"><p className="text-xs text-stone-500">{t('teacher_courses.stats_avg_rating')}</p><p className="font-bold text-lg text-stone-800">{stats.averageRating}</p></div>
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-stone-200"><p className="text-xs text-stone-500">{t('teacher_courses.stats_completion_rate')}</p><p className="font-bold text-lg text-stone-800">{stats.completionRate}%</p></div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white/90 backdrop-blur-md p-3 rounded-lg border border-stone-200 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div className="flex-grow sm:max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-md text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadCourses()} className="p-2 text-stone-600 hover:text-emerald-600"><RefreshCw className="h-4 w-4" /></button>
            <div className="flex items-center gap-1">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-700' : 'text-stone-500 hover:bg-stone-100'}`}><Grid className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-700' : 'text-stone-500 hover:bg-stone-100'}`}><List className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setSortOrder('asc')} className={`p-2 rounded-md ${sortOrder === 'asc' ? 'bg-emerald-100 text-emerald-700' : 'text-stone-500 hover:bg-stone-100'}`}><SortAsc className="h-4 w-4" /></button>
              <button onClick={() => setSortOrder('desc')} className={`p-2 rounded-md ${sortOrder === 'desc' ? 'bg-emerald-100 text-emerald-700' : 'text-stone-500 hover:bg-stone-100'}`}><SortDesc className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex items-center border border-stone-200 rounded-md">
            <button onClick={() => setActiveTab('all')} className={`px-3 py-1 rounded-l-md ${activeTab === 'all' ? 'bg-emerald-600 text-white' : 'hover:bg-stone-50'}`}>{t('teacher_courses.all_tab')}</button>
            <button onClick={() => setActiveTab('published')} className={`px-3 py-1 border-l ${activeTab === 'published' ? 'bg-emerald-600 text-white' : 'hover:bg-stone-50'}`}>{t('teacher_courses.published_tab')}</button>
            <button onClick={() => setActiveTab('drafts')} className={`px-3 py-1 border-l rounded-r-md ${activeTab === 'drafts' ? 'bg-emerald-600 text-white' : 'hover:bg-stone-50'}`}>{t('teacher_courses.drafts_tab')}</button>
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border border-stone-300 rounded-md py-1 text-sm">
            {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label} ({cat.count})</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-stone-300 rounded-md py-1 text-sm">
            {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCourses.length > 0 && (
        <BulkActions
          courses={courses}
          selectedCourses={selectedCourses}
          onActionComplete={() => {
            setSelectedCourses([]);
            loadCourses();
          }}
          onClearSelection={() => setSelectedCourses([])}
        />
      )}

      {/* Courses Grid/List */}
      {filteredAndSortedCourses.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAndSortedCourses.map(renderCourseCard)}
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200">
            <div className="flex items-center p-2 border-b border-stone-200 text-xs font-semibold text-stone-500">
              <div className="w-1/12 pl-6"><input type="checkbox" onChange={handleSelectAll} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" /></div>
              <div className="w-4/12">{t('common.title')}</div>
              <div className="w-2/12">{t('common.students')}</div>
              <div className="w-2/12">{t('common.duration')}</div>
              <div className="w-2/12">{t('common.last_updated')}</div>
              <div className="w-1/12">{t('common.status')}</div>
            </div>
            <div className="divide-y divide-stone-100">
              {filteredAndSortedCourses.map(renderCourseCard)}
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-16 bg-white/50 rounded-lg border border-dashed border-stone-200">
          <BookOpen className="mx-auto h-12 w-12 text-stone-400" />
          <h3 className="mt-2 text-lg font-medium text-stone-800">
            {searchTerm || filterCategory !== 'all' || activeTab !== 'all' ? t('teacher_courses.no_courses_found') : t('teacher_courses.no_courses_yet')}
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            {searchTerm || filterCategory !== 'all' || activeTab !== 'all' ? t('teacher_courses.adjust_filters_prompt') : t('teacher_courses.create_first_course_prompt')}
          </p>
          {!(searchTerm || filterCategory !== 'all' || activeTab !== 'all') && (
            <div className="mt-6">
              <Link to="/teacher/courses/new" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('teacher_courses.create_first_course_btn')}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Course Templates Modal. */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowTemplates(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{t('teacher_courses.templates_modal_title')}</h2>
            <p className="text-stone-600 mb-4">{t('teacher_courses.templates_modal_description')}</p>
            {/* Template options would be listed here */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border p-4 rounded-md hover:bg-stone-50 cursor-pointer">
                <h3 className="font-semibold">{t('teacher_courses.template_intro_faith_title')}</h3>
                <p className="text-sm text-stone-500">{t('teacher_courses.template_intro_faith_desc')}</p>
              </div>
              <div className="border p-4 rounded-md hover:bg-stone-50 cursor-pointer">
                <h3 className="font-semibold">{t('teacher_courses.template_church_history_title')}</h3>
                <p className="text-sm text-stone-500">{t('teacher_courses.template_church_history_desc')}</p>
              </div>
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => setShowTemplates(false)} className="px-4 py-2 bg-stone-200 text-stone-800 rounded-md hover:bg-stone-300">{t('teacher_courses.templates_modal_close_btn')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;