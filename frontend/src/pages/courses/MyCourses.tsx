import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { coursesApi } from '../../services/api';
import CourseCard from '../../components/courses/CourseCard';
import { BookOpen, Plus, Search, Filter, Video, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MyCourses: React.FC = () => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await coursesApi.getCourses();
        setCourses(response.data.courses || []);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to load courses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      loadCourses();
    }, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, [coursesApi]);

  const categories = [
    { value: 'all', label: t('common.filter') },
    { value: 'faith', label: t('courses.faith_doctrine') },
    { value: 'history', label: t('courses.church_history') },
    { value: 'spiritual', label: t('courses.spiritual_development') },
    { value: 'bible', label: t('courses.bible_study') },
    { value: 'liturgical', label: t('courses.liturgical_studies') },
    { value: 'youth', label: t('courses.youth_ministry') }
  ];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const refreshCourses = async () => {
    setLoading(true);
    try {
      const response = await coursesApi.getCourses();
      setCourses(response.data.courses || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="text-gray-600 mt-4 text-xl">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('courses.my_courses')}</h1>
            <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
              {t('courses.manage_organize')}
            </p>
            <p className="text-blue-200 text-xs mt-1">
              {t('courses.last_updated')}: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 lg:mt-0">
            <button
              onClick={refreshCourses}
              className="inline-flex items-center px-5 py-2.5 border border-blue-300 text-sm font-semibold rounded-xl text-white bg-transparent hover:bg-blue-500 transition-all duration-200 transform hover:scale-105"
              disabled={loading}
            >
              <svg className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? t('common.loading') : t('courses.refresh')}
            </button>
            <Link
              to="/courses/new"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-blue-600 bg-white hover:bg-blue-50 transition-all duration-200 transform hover:scale-105 shadow-xl"
            >
              <Plus className="mr-2 h-5 w-5" />
              {t('courses.create_new')}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Summary with enhanced design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl border border-gray-200 p-5 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm mr-3">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">{t('courses.total_courses')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{courses.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl border border-gray-200 p-5 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm mr-3">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">{t('courses.total_lessons')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {courses.reduce((total, course) => total + (course.lesson_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl border border-gray-200 p-5 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm mr-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">{t('courses.active_students')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {courses.reduce((total, course) => total + (course.student_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-orange-50 rounded-2xl border border-gray-200 p-5 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-sm mr-3">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">{t('courses.completion_rate')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">89%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter with enhanced design */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-md">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          {/* Category Filter */}
          <div className="md:w-64">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-base bg-white"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-12 text-center shadow-md">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {courses.length === 0 ? t('courses.no_courses') : t('courses.no_courses_found')}
          </h3>
          <p className="text-gray-600 text-base mb-6 max-w-xl mx-auto">
            {courses.length === 0 
              ? t('courses.create_first_course')
              : t('courses.adjust_search')
            }
          </p>
          <Link
            to="/courses/new"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus className="mr-2 h-5 w-5" />
            {t('courses.create_first_course')}
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyCourses;