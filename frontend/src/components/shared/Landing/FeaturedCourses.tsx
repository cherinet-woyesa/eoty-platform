import React, { forwardRef } from 'react';
import { BookOpen, Clock, Users, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { brandColors } from '@/theme/brand';
import { useTranslation } from 'react-i18next';

interface FeaturedCoursesProps {
  featuredCourses: any[];
  visibleSections: Set<string>;
}

const FeaturedCourses = forwardRef<HTMLElement, FeaturedCoursesProps>(({ featuredCourses, visibleSections }, ref) => {
  const { t } = useTranslation();
  return (
    <section
      ref={ref}
      id="featured-courses"
      data-section-id="featured-courses"
      className={`relative py-20 sm:py-24 lg:py-32 overflow-hidden z-10 transition-all duration-1000 ${
        visibleSections.has('featured-courses') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(248,249,252,0.96) 0%, rgba(244,246,250,0.92) 50%, rgba(240,243,248,0.88) 100%)'
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-24 left-16 w-96 h-96 bg-gradient-to-br from-[#2f3f82]/8 to-[#3a4c94]/6 rounded-full blur-3xl animate-float" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-24 right-16 w-80 h-80 bg-gradient-to-br from-[#cfa15a]/7 to-[#d8b26d]/5 rounded-full blur-3xl animate-float" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-gradient-to-br from-[#2f3f82]/6 to-[#cfa15a]/5 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '8s' }} />
      </div>
      <div className="w-full px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 sm:mb-18 lg:mb-20">
            <div className={`inline-flex items-center space-x-2 sm:space-x-3 px-4 sm:px-6 py-2 sm:py-3 bg-white rounded-full border backdrop-blur-xl shadow-lg mb-6 sm:mb-8 transition-all duration-700 delay-200 ${
              visibleSections.has('featured-courses') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`} style={{ borderColor: `${brandColors.primaryHex}33` }}>
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" style={{ color: brandColors.primaryHex }} />
              <span className="text-xs sm:text-sm font-semibold" style={{ color: brandColors.primaryHex }}>{t('landing.courses.badge')}</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 transition-all duration-700 delay-300 ${
              visibleSections.has('featured-courses') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}>
              {t('landing.courses.title')}
            </h2>
            <p className={`text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto px-2 sm:px-0 transition-all duration-700 delay-400 ${
              visibleSections.has('featured-courses') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}>
              {t('landing.courses.subtitle')}
            </p>
          </div>

          {featuredCourses.length === 0 ? (
            <div className={`text-center py-12 transition-all duration-700 delay-500 ${
              visibleSections.has('featured-courses') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}>
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">{t('landing.courses.empty_title')}</h3>
              <p className="text-gray-600">{t('landing.courses.empty_subtitle')}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {featuredCourses.slice(0, 6).map((course, index) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className={`group bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-xl hover:shadow-3xl transition-all duration-500 border transform hover:-translate-y-4 hover:scale-[1.03] cursor-pointer relative ${
                    visibleSections.has('featured-courses')
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  {/* Animated background gradient on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                    style={{ background: `linear-gradient(135deg, ${brandColors.primaryHex}0D, ${brandColors.accentHex}14)` }} />
                  <div className="relative h-48 sm:h-56 bg-gradient-to-br from-[#1c2753]/18 to-[#243065]/12 overflow-hidden group-hover:h-48 transition-all duration-500">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-white/25 backdrop-blur-xl rounded-full flex items-center justify-center shadow-2xl shadow-white/10 transform group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="h-10 w-10 text-white" />
                      </div>
                    </div>
                    <div className="absolute top-4 left-4 flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#cfa15a] to-[#d8b26d] backdrop-blur-md rounded-full shadow-lg">
                      <Star className="h-4 w-4 text-white" />
                      <span className="text-xs text-white font-bold">FEATURED</span>
                    </div>
                    
                    {/* Preview Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="px-6 py-2 bg-white text-[#27AE60] font-bold rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        View Course
                      </span>
                    </div>
                  </div>

                    <div className="relative z-10 p-6 lg:p-8">
                    <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 line-clamp-2 leading-tight transition-colors" style={{ color: brandColors.primaryHex }}>
                      {course.title || t('landing.courses.untitled', 'Untitled course')}
                    </h3>
                    <p className="text-slate-700 leading-relaxed mb-4 sm:mb-6 line-clamp-3 text-sm sm:text-base">
                      {course.description || t('landing.courses.missing_description', 'Details coming soon.')}
                    </p>

                    {(course.duration || typeof course.enrolledCount === 'number') && (
                      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                        <div className="flex items-center space-x-4">
                          {course.duration && (
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4" style={{ color: brandColors.primaryHex }} />
                              <span className="font-medium">{course.duration}</span>
                            </div>
                          )}
                          {typeof course.enrolledCount === 'number' && (
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4" style={{ color: brandColors.primaryHoverHex }} />
                              <span className="font-medium">{t('landing.courses.learners', { defaultValue: '{{count}} learners', count: course.enrolledCount })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(course.level || course.category) && (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          {course.level && (
                            <span className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-xl font-semibold border"
                              style={{
                                background: `${brandColors.primaryHex}0d`,
                                color: brandColors.primaryHex,
                                borderColor: `${brandColors.primaryHex}33`
                              }}>
                              {course.level}
                            </span>
                          )}
                          {course.category && (
                            <span className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-xl font-semibold border"
                              style={{
                                background: `${brandColors.accentHex}14`,
                                color: brandColors.accentHex,
                                borderColor: `${brandColors.accentHex}33`
                              }}>
                              {course.category}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

export default FeaturedCourses;
