import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  Award, 
  ArrowRight,
  Sparkles,
  Zap,
  Heart,
  Star,
  PlayCircle,
  Target,
  FileText,
  Calendar,
  User,
  ChevronUp,
  Shield,
  Clock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { landingApi } from '@/services/api';

const Landing: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    totalStudents: 10000,
    totalCourses: 500,
    satisfactionRate: 98
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { isAuthenticated, getRoleDashboard } = useAuth();

  // Fetch landing page statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);
        const response = await landingApi.getStats();
        if (response.success && response.data) {
          setStats({
            totalStudents: response.data.totalStudents || 10000,
            totalCourses: response.data.totalCourses || 500,
            satisfactionRate: response.data.satisfactionRate || 98
          });
        }
      } catch (error) {
        console.error('Failed to fetch landing stats:', error);
        // Keep default values on error
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // Fetch featured courses
  useEffect(() => {
    const fetchFeaturedCourses = async () => {
      try {
        const response = await landingApi.getFeaturedCourses();
        if (response.success && response.data) {
          setFeaturedCourses(response.data.courses || []);
        }
      } catch (error) {
        console.error('Failed to fetch featured courses:', error);
        // Keep empty array on error
      }
    };

    fetchFeaturedCourses();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-100px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section-id');
          if (sectionId) {
            setVisibleSections((prev) => new Set([...prev, sectionId]));
          }
        }
      });
    }, observerOptions);

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      {/* Background Image with Overlay - Optimized with lazy loading */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/eoc.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          imageRendering: 'auto',
          willChange: 'transform'
        }}
      >
        {/* Overlay for better text readability - lighter and more transparent */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FEFCF8]/85 via-[#FAF8F3]/80 to-[#F5F3ED]/85 backdrop-blur-[2px]" />
      </div>

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute top-20 left-10 w-72 h-72 bg-[#39FF14]/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '0s', animationDuration: '4s' }}
        />
        <div 
          className="absolute top-40 right-20 w-96 h-96 bg-[#FFD700]/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s', animationDuration: '5s' }}
        />
        <div 
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-[#00FFFF]/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s', animationDuration: '6s' }}
        />
        {/* Floating decorative elements */}
        <div 
          className="absolute top-1/4 right-1/4 w-4 h-4 bg-[#00FFC6]/30 rounded-full animate-float"
          style={{ animationDelay: '0.5s', animationDuration: '3s' }}
        />
        <div 
          className="absolute top-1/3 left-1/4 w-3 h-3 bg-[#FFD700]/30 rounded-full animate-float"
          style={{ animationDelay: '1.5s', animationDuration: '4s' }}
        />
        <div 
          className="absolute bottom-1/3 right-1/3 w-5 h-5 bg-[#39FF14]/30 rounded-full animate-float"
          style={{ animationDelay: '2s', animationDuration: '5s' }}
        />
      </div>

      {/* Header */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/95 backdrop-blur-md border-b border-stone-200/70 shadow-sm"
      >
        <div className="w-full">
          <div className="flex justify-between items-center py-4 px-4 lg:px-6">
            <Link to="/" className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-lg blur-md group-hover:blur-lg transition-all" />
                <BookOpen className="relative h-10 w-10 text-emerald-600 transform group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-2xl font-bold text-stone-800 group-hover:text-stone-900 transition-colors">
                EOTY Platform
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-stone-600 hover:text-stone-900 font-medium transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 font-semibold transition-colors duration-200 shadow-sm border border-stone-800/80"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Full Screen */}
      <section id="hero-section" className="relative min-h-screen flex items-center justify-center pt-20 z-10">
        <div className="w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center px-4 lg:px-6">
            {/* Left Content */}
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#FFFACD]/40 rounded-full border border-[#FFFACD]/60 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-[#FFD700]" />
                <span className="text-sm font-medium text-slate-700">For Ethiopian Orthodox Youths</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="block text-slate-700 animate-fade-in">Transform Your</span>
                <span className="block bg-gradient-to-r from-[#00FFC6] via-[#4FC3F7] to-[#00FFC6] bg-clip-text text-transparent animate-gradient">
                  Learning Journey
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
                Join our faith-centered learning community. Access courses, track progress, and grow in your spiritual journey.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                {!isAuthenticated && (
                  <>
                    <Link
                      to="/register"
                      className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#00FFC6]/90 to-[#4FC3F7]/90 text-white rounded-xl hover:from-[#00E6B8] hover:to-[#42B5E5] transition-all duration-300 font-semibold text-lg shadow-2xl hover:shadow-[#00FFC6]/40 transform hover:scale-105 backdrop-blur-sm border border-[#00FFC6]/30"
                    >
                      Start Learning Free
                      <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center px-8 py-4 bg-white/90 backdrop-blur-sm text-slate-700 rounded-xl border-2 border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Sign In
                    </Link>
                  </>
                )}
                {isAuthenticated && (
                  <Link
                    to={getRoleDashboard()}
                    className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#39FF14]/90 to-[#00FFC6]/90 text-stone-900 rounded-xl hover:from-[#32E60F] hover:to-[#00E6B8] transition-all duration-300 font-semibold text-lg shadow-2xl hover:shadow-[#39FF14]/40 transform hover:scale-105 backdrop-blur-sm border border-[#39FF14]/30"
                  >
                    Go to your dashboard
                    <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>

              {/* Enhanced Stats with Animations */}
              <div className="grid grid-cols-3 gap-4 pt-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <div className="group relative bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 hover:border-[#39FF14]/50 transition-all duration-300 hover:shadow-lg hover:scale-105">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-[#39FF14]/20 to-[#39FF14]/10 rounded-lg group-hover:scale-110 transition-transform">
                    <Users className="h-5 w-5 text-[#39FF14]" />
                  </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-slate-700 group-hover:text-[#39FF14] transition-colors">
                      {isLoadingStats ? '...' : `${(stats.totalStudents / 1000).toFixed(0)}K+`}
                    </div>
                      <div className="text-xs text-slate-600 font-medium">Active Students</div>
                  </div>
                </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#39FF14] rounded-full animate-ping opacity-75" />
                </div>
                <div className="group relative bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 hover:border-[#FFD700]/50 transition-all duration-300 hover:shadow-lg hover:scale-105">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/10 rounded-lg group-hover:scale-110 transition-transform">
                    <BookOpen className="h-5 w-5 text-[#FFD700]" />
                  </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-slate-700 group-hover:text-[#FFD700] transition-colors">
                      {isLoadingStats ? '...' : `${stats.totalCourses}+`}
                    </div>
                      <div className="text-xs text-slate-600 font-medium">Courses</div>
                  </div>
                </div>
                </div>
                <div className="group relative bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 hover:border-[#00FFFF]/50 transition-all duration-300 hover:shadow-lg hover:scale-105">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-[#00FFFF]/20 to-[#00FFFF]/10 rounded-lg group-hover:scale-110 transition-transform">
                    <Award className="h-5 w-5 text-[#00FFFF]" />
                  </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-slate-700 group-hover:text-[#00FFFF] transition-colors">
                      {isLoadingStats ? '...' : `${stats.satisfactionRate}%`}
                    </div>
                      <div className="text-xs text-slate-600 font-medium">Satisfaction</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Illustration Only (Desktop) */}
            <div className="relative lg:block hidden">
              <div className="relative">
                <div className="relative w-full h-[600px]">
                  {/* Decorative Circles */}
                  <div className="absolute top-10 right-10 w-32 h-32 bg-[#00FFC6]/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '3s' }} />
                  <div className="absolute bottom-20 left-10 w-24 h-24 bg-[#FFF59D]/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />

                  {/* Enhanced Dashboard Preview */}
                  <div className="relative transition-all duration-500 opacity-100 scale-100">
                    <div className="relative bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-200/30 transform hover:scale-[1.02] transition-all duration-500 group">
                      <div className="space-y-6">
                        {/* Enhanced Video Preview with Overlay */}
                        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-100/90 to-slate-200/90 aspect-video backdrop-blur-sm group-hover:shadow-2xl transition-shadow">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <button className="w-20 h-20 bg-[#39FF14] rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300 cursor-pointer group-hover:shadow-[#39FF14]/50">
                              <PlayCircle className="h-10 w-10 text-slate-900 ml-1" />
                            </button>
                            </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4">
                            <div className="text-white text-sm font-semibold mb-1">Interactive Video Lessons</div>
                            <div className="flex items-center space-x-2 text-xs text-white/80">
                              <Clock className="h-3 w-3" />
                              <span>15 min lesson</span>
                              <span>•</span>
                              <Users className="h-3 w-3" />
                              <span>2.5K watching</span>
                          </div>
                          </div>
                          {/* Live indicator */}
                          <div className="absolute top-3 left-3 flex items-center space-x-2 px-2 py-1 bg-red-500/90 backdrop-blur-sm rounded-full">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <span className="text-xs text-white font-medium">Live</span>
                          </div>
                        </div>
                        
                        {/* Enhanced Progress Cards */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-[#39FF14]/15 to-[#32E60F]/10 rounded-xl p-4 border border-[#39FF14]/25 backdrop-blur-sm hover:shadow-lg transition-all group/card">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-semibold text-slate-700">Learning Progress</span>
                              <span className="text-sm font-bold text-[#39FF14] group-hover/card:scale-110 transition-transform">75%</span>
                            </div>
                            <div className="w-full bg-slate-200/50 rounded-full h-2.5 mb-2 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-[#39FF14] to-[#32E60F] h-2.5 rounded-full transition-all duration-1000 relative overflow-hidden"
                                style={{ width: '75%' }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                            </div>
                          </div>
                            <div className="text-xs text-slate-500">3 of 4 courses completed</div>
                          </div>
                          <div className="bg-gradient-to-br from-[#FFD700]/15 to-[#FFD700]/10 rounded-xl p-4 border border-[#FFD700]/25 backdrop-blur-sm hover:shadow-lg transition-all group/card">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-slate-700">Achievements</span>
                              <Star className="h-4 w-4 text-[#FFD700] fill-current group-hover/card:scale-110 transition-transform" />
                            </div>
                            <div className="text-3xl font-bold text-slate-700 mb-1 group-hover/card:scale-110 transition-transform">12</div>
                            <div className="text-xs text-slate-500">Badges earned</div>
                          </div>
                        </div>
                        
                        {/* Quick Stats Row */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                          <div className="text-center">
                            <div className="text-lg font-bold text-slate-700">24</div>
                            <div className="text-xs text-slate-500">Hours Learned</div>
                      </div>
                          <div className="w-px h-8 bg-slate-200" />
                          <div className="text-center">
                            <div className="text-lg font-bold text-slate-700">8</div>
                            <div className="text-xs text-slate-500">Courses Enrolled</div>
                          </div>
                          <div className="w-px h-8 bg-slate-200" />
                          <div className="text-center">
                            <div className="text-lg font-bold text-slate-700">4.9</div>
                            <div className="text-xs text-slate-500">Avg Rating</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About/Mission Section */}
      <section 
        ref={(el) => (sectionRefs.current['about'] = el as HTMLDivElement | null)}
        data-section-id="about"
        className={`relative py-32 bg-gradient-to-br from-white/70 via-stone-50/70 to-slate-50/70 backdrop-blur-md z-10 transition-all duration-1000 ${
          visibleSections.has('about') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="w-full px-4 lg:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-[#FFD700]/25 rounded-full border border-[#FFD700]/40 backdrop-blur-sm mb-6 transition-all duration-700 delay-200 ${
                visibleSections.has('about') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}>
                <Heart className="h-4 w-4 text-[#FFD700]" />
                <span className="text-sm font-medium text-slate-700">Our Mission</span>
              </div>
              <h2 className={`text-4xl md:text-5xl font-bold text-slate-700 mb-6 transition-all duration-700 delay-300 ${
                visibleSections.has('about') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                Empowering Ethiopian Orthodox Youths
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <p className="text-xl text-slate-600 leading-relaxed">
                  Empowering Ethiopian Orthodox youths through faith-centered education. 
                  Nurturing spiritual growth with quality learning that honors our traditions.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50">
                    <Target className="h-5 w-5 text-[#39FF14]" />
                    <span className="text-sm font-medium text-slate-700">Faith-Centered</span>
                  </div>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50">
                    <Users className="h-5 w-5 text-[#00FFFF]" />
                    <span className="text-sm font-medium text-slate-700">Community-Driven</span>
                  </div>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/50">
                    <Award className="h-5 w-5 text-[#FFD700]" />
                    <span className="text-sm font-medium text-slate-700">Excellence in Education</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-200/50">
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-[#39FF14]/20 rounded-xl">
                        <BookOpen className="h-6 w-6 text-[#39FF14]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Comprehensive Learning</h3>
                        <p className="text-slate-600">Access courses covering theology, history, traditions, and more.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-[#00FFFF]/20 rounded-xl">
                        <Users className="h-6 w-6 text-[#00FFFF]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Community Support</h3>
                        <p className="text-slate-600">Connect with fellow learners and experienced teachers.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-[#FFD700]/20 rounded-xl">
                        <Award className="h-6 w-6 text-[#FFD700]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Track Progress</h3>
                        <p className="text-slate-600">Monitor your learning journey and celebrate achievements.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section 
        ref={(el) => (sectionRefs.current['how-it-works'] = el as HTMLDivElement | null)}
        data-section-id="how-it-works"
        className={`relative py-32 bg-white/60 backdrop-blur-md z-10 transition-all duration-1000 ${
          visibleSections.has('how-it-works') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="w-full px-4 lg:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-[#39FF14]/25 rounded-full border border-[#39FF14]/40 backdrop-blur-sm mb-6 transition-all duration-700 delay-200 ${
                visibleSections.has('how-it-works') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}>
                <Zap className="h-4 w-4 text-[#39FF14]" />
                <span className="text-sm font-medium text-slate-700">Simple Process</span>
              </div>
              <h2 className={`text-4xl md:text-5xl font-bold text-slate-700 mb-6 transition-all duration-700 delay-300 ${
                visibleSections.has('how-it-works') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                How It Works
              </h2>
              <p className={`text-lg text-slate-600 max-w-2xl mx-auto transition-all duration-700 delay-400 ${
                visibleSections.has('how-it-works') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                Start your learning journey in minutes
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { 
                  step: '01', 
                  icon: User, 
                  title: 'Create Account', 
                  desc: 'Sign up for free and join our community of learners',
                  color: '#39FF14',
                  features: ['Free forever', 'No credit card', 'Instant access']
                },
                { 
                  step: '02', 
                  icon: BookOpen, 
                  title: 'Browse Courses', 
                  desc: 'Explore our comprehensive library of faith-based courses',
                  color: '#00FFFF',
                  features: ['500+ courses', 'Expert teachers', 'Self-paced']
                },
                { 
                  step: '03', 
                  icon: PlayCircle, 
                  title: 'Start Learning', 
                  desc: 'Watch videos, complete lessons, and track your progress',
                  color: '#FFD700',
                  features: ['HD videos', 'Interactive quizzes', 'Progress tracking']
                },
                { 
                  step: '04', 
                  icon: Award, 
                  title: 'Earn Achievements', 
                  desc: 'Complete courses, earn badges, and grow in your faith journey',
                  color: '#39FF14',
                  features: ['Certificates', 'Badges', 'Leaderboards']
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className={`relative group transition-all duration-700 ${
                    visibleSections.has('how-it-works') 
                      ? `opacity-100 translate-y-0 delay-${index * 100}` 
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="bg-white/85 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200/40 transform hover:-translate-y-2 hover:scale-105 h-full cursor-pointer relative overflow-hidden">
                    {/* Animated background gradient on hover */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: `linear-gradient(135deg, ${item.color}08, transparent)` }}
                    />
                    
                    <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div 
                          className="w-14 h-14 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg"
                          style={{ 
                            backgroundColor: `${item.color}20`, 
                            borderColor: `${item.color}30`, 
                            borderWidth: '2px',
                            boxShadow: `0 0 20px ${item.color}20`
                          }}
                        >
                          <item.icon className="h-7 w-7 transition-transform group-hover:scale-110" style={{ color: item.color }} />
                      </div>
                      <span className="text-3xl font-bold text-slate-300 group-hover:text-slate-400 transition-colors">{item.step}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-3 group-hover:text-slate-800 transition-colors">{item.title}</h3>
                      <p className="text-slate-600 leading-relaxed mb-4">{item.desc}</p>
                      
                      {/* Feature list */}
                      <div className="space-y-2 pt-3 border-t border-slate-200/50">
                        {item.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-sm">
                            <div 
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-slate-600">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {index < 3 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <div className="relative">
                        <ArrowRight className="h-6 w-6 text-slate-400 animate-pulse" />
                        <div className="absolute inset-0 bg-[#00FFC6]/20 rounded-full blur-md animate-ping" style={{ animationDuration: '2s' }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section 
        ref={(el) => (sectionRefs.current['featured-courses'] = el as HTMLDivElement | null)}
        data-section-id="featured-courses"
        className={`relative py-32 bg-gradient-to-br from-white/70 via-stone-50/70 to-slate-50/70 backdrop-blur-md z-10 transition-all duration-1000 ${
          visibleSections.has('featured-courses') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
          <div className="w-full px-4 lg:px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-[#00FFC6]/25 rounded-full border border-[#00FFC6]/40 backdrop-blur-sm mb-6 transition-all duration-700 delay-200 ${
                  visibleSections.has('featured-courses') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}>
                  <Star className="h-4 w-4 text-[#00FFC6]" />
                  <span className="text-sm font-medium text-slate-700">Popular Courses</span>
                </div>
                <h2 className={`text-4xl md:text-5xl font-bold text-slate-700 mb-6 transition-all duration-700 delay-300 ${
                  visibleSections.has('featured-courses') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                }`}>
                  Featured Courses
                </h2>
                <p className={`text-lg text-slate-600 max-w-2xl mx-auto transition-all duration-700 delay-400 ${
                  visibleSections.has('featured-courses') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                }`}>
                  Discover our most popular courses
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredCourses.length > 0 ? featuredCourses.map((course, index) => (
                  <Link
                    key={course.id}
                    to={`/courses/${course.id}`}
                    className={`group bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/50 transform hover:-translate-y-3 hover:scale-[1.02] cursor-pointer relative ${
                      visibleSections.has('featured-courses') 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-10'
                    }`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    {/* Course Image with Video Preview Overlay */}
                    <div className="relative h-48 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                      {course.coverImage ? (
                        <img
                          src={course.coverImage}
                          alt={course.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="h-16 w-16 text-slate-400/50 group-hover:scale-110 transition-transform" />
                        </div>
                      )}
                      
                      {/* Video Play Overlay on Hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                          <PlayCircle className="h-8 w-8 text-slate-700 ml-1" />
                        </div>
                      </div>
                      
                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {course.isNew && (
                          <div className="px-2 py-1 rounded-md backdrop-blur-sm text-xs font-bold bg-[#39FF14] text-white">
                            NEW
                          </div>
                        )}
                        {course.isPopular && (
                          <div className="px-2 py-1 rounded-md backdrop-blur-sm text-xs font-bold bg-[#FFD700] text-slate-900">
                            HOT
                          </div>
                        )}
                      </div>
                      
                      <div className="absolute top-3 right-3">
                        <div className="px-3 py-1 rounded-full backdrop-blur-sm text-xs font-semibold bg-white/90 text-slate-700 border border-slate-200/50">
                          {course.level || 'Beginner'}
                        </div>
                      </div>
                      
                      {/* Progress Bar (if enrolled) */}
                      {course.progress && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                          <div 
                            className="h-full bg-[#39FF14] transition-all duration-500"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Course Content */}
                    <div className="p-6">
                      {/* Instructor Info */}
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00FFC6] to-[#4FC3F7] flex items-center justify-center text-white text-xs font-bold">
                          {course.instructor?.charAt(0) || 'T'}
                        </div>
                        <span className="text-xs text-slate-600 font-medium">
                          {course.instructor || 'Expert Teacher'}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-700 mb-2 group-hover:text-slate-800 transition-colors line-clamp-2 min-h-[3rem]">
                        {course.title}
                      </h3>
                      
                      {/* Rating and Reviews */}
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-[#FFD700] fill-current" />
                          <span className="text-sm font-semibold text-slate-700">
                            {(course.rating || 4.5).toFixed(1)}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          ({course.ratingCount || Math.floor(Math.random() * 500) + 50})
                        </span>
                      </div>
                      
                      {/* Course Meta */}
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pb-4 border-b border-slate-200/50">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3.5 w-3.5" />
                          <span>{course.studentCount || Math.floor(Math.random() * 5000) + 100} students</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{course.duration || '8h'} total</span>
                        </div>
                      </div>
                      
                      {/* Price/CTA */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {course.price ? (
                            <>
                              <span className="text-lg font-bold text-slate-700">${course.price}</span>
                              {course.originalPrice && (
                                <span className="text-sm text-slate-400 line-through">${course.originalPrice}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-[#39FF14] bg-[#39FF14]/10 px-2 py-1 rounded">
                              FREE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-[#00FFC6] font-semibold text-sm group-hover:gap-2 transition-all">
                          <span>Explore</span>
                          <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                )) : (
                  // Placeholder when no courses available
                  <div className="col-span-full text-center py-12">
                    <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 text-lg">Featured courses coming soon</p>
                  </div>
                )}
              </div>

              <div className="text-center mt-12">
                <Link
                  to="/courses"
                  className="inline-flex items-center px-8 py-4 bg-white/90 backdrop-blur-sm text-slate-700 rounded-xl border-2 border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  View All Courses
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

      {/* Video Section */}
      <section 
        ref={(el) => (sectionRefs.current['video'] = el as HTMLDivElement | null)}
        data-section-id="video"
        className={`relative py-32 bg-white/60 backdrop-blur-md z-10 transition-all duration-1000 ${
          visibleSections.has('video') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="w-full px-4 lg:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-[#00FFFF]/25 rounded-full border border-[#00FFFF]/40 backdrop-blur-sm mb-6 transition-all duration-700 delay-200 ${
                visibleSections.has('video') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}>
                <PlayCircle className="h-4 w-4 text-[#00FFFF]" />
                <span className="text-sm font-medium text-slate-700">Watch & Learn</span>
              </div>
              <h2 className={`text-4xl md:text-5xl font-bold text-slate-700 mb-6 transition-all duration-700 delay-300 ${
                visibleSections.has('video') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                Interactive Video Learning
              </h2>
              <p className={`text-lg text-slate-600 max-w-2xl mx-auto transition-all duration-700 delay-400 ${
                visibleSections.has('video') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                Experience engaging video lessons designed to enhance your understanding
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className={`group bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/50 transform hover:-translate-y-3 hover:scale-[1.02] cursor-pointer relative ${
                visibleSections.has('video') 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-10'
              }`}>
                <div className="relative h-64 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button className="w-20 h-20 bg-[#00FFFF] rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300 cursor-pointer group-hover:scale-125 group-hover:shadow-[#00FFFF]/50">
                      <PlayCircle className="h-10 w-10 text-white ml-1" />
                    </button>
                    </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
                    <div className="text-white text-sm font-semibold mb-1">Interactive Video Lessons</div>
                    <div className="flex items-center space-x-3 text-xs text-white/80">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>HD Quality</span>
                  </div>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>2.5K+ watching</span>
                      </div>
                    </div>
                  </div>
                  {/* Live indicator */}
                  <div className="absolute top-3 left-3 flex items-center space-x-2 px-2 py-1 bg-red-500/90 backdrop-blur-sm rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-xs text-white font-medium">Live</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="p-2 bg-[#00FFFF]/20 rounded-lg">
                      <PlayCircle className="h-5 w-5 text-[#00FFFF]" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 group-hover:text-slate-800 transition-colors">
                    High-Quality Video Content
                  </h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    Access professionally produced video lessons covering theology, history, traditions, and more. Each lesson is designed to be engaging and easy to follow.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs bg-slate-100 rounded-md text-slate-600">HD Quality</span>
                    <span className="px-2 py-1 text-xs bg-slate-100 rounded-md text-slate-600">Subtitles</span>
                    <span className="px-2 py-1 text-xs bg-slate-100 rounded-md text-slate-600">Downloadable</span>
                  </div>
                </div>
              </div>

              <div className={`group bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/50 transform hover:-translate-y-3 hover:scale-[1.02] cursor-pointer relative ${
                visibleSections.has('video') 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: '150ms' }}>
                <div className="relative h-64 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button className="w-20 h-20 bg-[#39FF14] rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300 cursor-pointer group-hover:scale-125 group-hover:shadow-[#39FF14]/50">
                      <PlayCircle className="h-10 w-10 text-slate-900 ml-1" />
                    </button>
                    </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
                    <div className="text-white text-sm font-semibold mb-1">Progress Tracking</div>
                    <div className="flex items-center space-x-3 text-xs text-white/80">
                      <div className="flex items-center space-x-1">
                        <Award className="h-3 w-3" />
                        <span>Real-time updates</span>
                  </div>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Target className="h-3 w-3" />
                        <span>Goal tracking</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="p-2 bg-[#39FF14]/20 rounded-lg">
                      <Target className="h-5 w-5 text-[#39FF14]" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 group-hover:text-slate-800 transition-colors">
                    Track Your Progress
                  </h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    Monitor your learning journey with detailed progress tracking. See which lessons you've completed and pick up exactly where you left off.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Overall Progress</span>
                      <span className="font-semibold text-[#39FF14]">75%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-[#39FF14] to-[#32E60F] h-2 rounded-full" style={{ width: '75%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blogs Section */}
      <section 
        ref={(el) => (sectionRefs.current['blogs'] = el as HTMLDivElement | null)}
        data-section-id="blogs"
        className={`relative py-32 bg-white/60 backdrop-blur-md z-10 transition-all duration-1000 ${
          visibleSections.has('blogs') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="w-full px-4 lg:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-[#FFD700]/25 rounded-full border border-[#FFD700]/40 backdrop-blur-sm mb-6 transition-all duration-700 delay-200 ${
                visibleSections.has('blogs') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}>
                <FileText className="h-4 w-4 text-[#FFD700]" />
                <span className="text-sm font-medium text-slate-700">Latest Articles</span>
              </div>
              <h2 className={`text-4xl md:text-5xl font-bold text-slate-700 mb-6 transition-all duration-700 delay-300 ${
                visibleSections.has('blogs') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                Insights & Stories
              </h2>
              <p className={`text-lg text-slate-600 max-w-2xl mx-auto transition-all duration-700 delay-400 ${
                visibleSections.has('blogs') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                Discover insights and stories from our community
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { 
                  title: 'The Importance of Faith-Based Education', 
                  excerpt: 'Discover how faith-centered learning shapes character and spiritual growth in young Orthodox Christians.',
                  author: 'Fr. Michael',
                  date: '2 days ago',
                  category: 'Education',
                  color: '#39FF14'
                },
                { 
                  title: 'Building Community Through Learning', 
                  excerpt: 'Learn how our platform fosters connections and strengthens the bonds within the Orthodox community.',
                  author: 'Sister Mary',
                  date: '5 days ago',
                  category: 'Community',
                  color: '#00FFFF'
                },
                { 
                  title: 'Navigating Modern Challenges with Ancient Wisdom', 
                  excerpt: 'Explore how traditional Orthodox teachings provide guidance for contemporary life challenges.',
                  author: 'Dr. Samuel',
                  date: '1 week ago',
                  category: 'Faith',
                  color: '#FFD700'
                },
              ].map((blog, index) => (
                <div
                  key={index}
                  className={`group bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/50 transform hover:-translate-y-3 hover:scale-[1.02] cursor-pointer ${
                    visibleSections.has('blogs') 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className="h-48 bg-gradient-to-br from-slate-200 to-slate-300 relative overflow-hidden group-hover:scale-110 transition-transform duration-500">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="h-16 w-16 text-slate-400/50 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="absolute top-4 left-4">
                      <div 
                        className="px-3 py-1 rounded-full backdrop-blur-sm text-xs font-semibold transform group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: `${blog.color}30`, color: blog.color }}
                      >
                        {blog.category}
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mb-3">
                      <Calendar className="h-3 w-3" />
                      <span>{blog.date}</span>
                      <span>•</span>
                      <User className="h-3 w-3" />
                      <span>{blog.author}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-3 group-hover:text-slate-800 transition-colors">
                      {blog.title}
                    </h3>
                    <p className="text-slate-600 mb-4 leading-relaxed line-clamp-3">
                      {blog.excerpt}
                    </p>
                    <Link
                      to="/register"
                      className="inline-flex items-center text-sm font-medium transition-all group-hover:gap-2"
                      style={{ color: blog.color }}
                    >
                      Read More
                      <ArrowRight className="ml-1 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Link
                to="/register"
                className="inline-flex items-center px-8 py-4 bg-white/90 backdrop-blur-sm text-slate-700 rounded-xl border-2 border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                View All Articles
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section 
        ref={(el) => (sectionRefs.current['testimonials'] = el as HTMLDivElement | null)}
        data-section-id="testimonials"
        className={`relative py-32 bg-gradient-to-br from-white/70 via-stone-50/70 to-slate-50/70 backdrop-blur-md z-10 transition-all duration-1000 ${
          visibleSections.has('testimonials') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="w-full px-4 lg:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-[#FFD700]/25 rounded-full border border-[#FFD700]/40 backdrop-blur-sm mb-6 transition-all duration-700 delay-200 ${
                visibleSections.has('testimonials') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}>
                <Star className="h-4 w-4 text-[#FFD700] fill-current" />
                <span className="text-sm font-medium text-slate-700">What Our Students Say</span>
              </div>
              <h2 className={`text-4xl md:text-5xl font-bold text-slate-700 mb-6 transition-all duration-700 delay-300 ${
                visibleSections.has('testimonials') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                Trusted by Thousands
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  name: 'Mariam T.',
                  role: 'Student',
                  image: null,
                  rating: 5,
                  text: 'This platform has transformed my understanding of our faith. The courses are comprehensive and the community support is incredible.',
                  color: '#39FF14'
                },
                {
                  name: 'Daniel K.',
                  role: 'Student',
                  image: null,
                  rating: 5,
                  text: 'As a busy professional, I love being able to learn at my own pace. The video lessons are engaging and the progress tracking keeps me motivated.',
                  color: '#00FFFF'
                },
                {
                  name: 'Sarah M.',
                  role: 'Student',
                  image: null,
                  rating: 5,
                  text: 'The best investment in my spiritual growth. The teachers are knowledgeable and the content is relevant to modern Orthodox life.',
                  color: '#FFD700'
                },
              ].map((testimonial, index) => (
                <div
                  key={index}
                  className={`bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/50 transform hover:-translate-y-3 ${
                    visibleSections.has('testimonials') 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className="flex items-center space-x-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= testimonial.rating
                            ? 'text-[#FFD700] fill-current'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-6 leading-relaxed italic">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center border-2"
                      style={{ 
                        background: `linear-gradient(135deg, ${testimonial.color}20, ${testimonial.color}10)`,
                        borderColor: `${testimonial.color}30`
                      }}
                    >
                      <User className="h-6 w-6" style={{ color: testimonial.color }} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700">{testimonial.name}</div>
                      <div className="text-sm text-slate-500">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 bg-gradient-to-br from-slate-200/50 via-stone-200/50 to-slate-300/50 backdrop-blur-md z-10 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#00FFC6]/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#4FC3F7]/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        </div>
        
        <div className="w-full text-center px-4 lg:px-6 relative z-10">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#39FF14]/20 rounded-full border border-[#39FF14]/30 backdrop-blur-sm mb-8 animate-bounce" style={{ animationDuration: '2s' }}>
            <Heart className="h-4 w-4 text-[#39FF14]" />
            <span className="text-sm font-medium text-slate-700">Join Our Community</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-700">
            Ready to Start Learning?
          </h2>
          <p className="text-lg mb-12 text-slate-600 max-w-2xl mx-auto">
            Start your faith-centered learning journey today. Join thousands of students already learning and growing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="group inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-[#00FFC6]/90 to-[#4FC3F7]/90 text-white rounded-xl hover:from-[#00E6B8] hover:to-[#42B5E5] transition-all duration-300 font-semibold text-lg shadow-2xl hover:shadow-[#00FFC6]/40 transform hover:scale-105 backdrop-blur-sm border border-[#00FFC6]/30"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-10 py-5 bg-white/90 backdrop-blur-sm text-slate-700 rounded-xl border-2 border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Sign In to Existing Account
            </Link>
          </div>
          
          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-600">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-[#39FF14]" />
              <span>100% Free to Start</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-[#00FFFF]" />
              <span>10K+ Active Students</span>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-[#FFD700]" />
              <span>98% Satisfaction Rate</span>
            </div>
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-[#00FFC6]" />
              <span>500+ Courses Available</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-slate-300/80 backdrop-blur-md text-slate-700 py-16 border-t border-slate-400/40 z-10">
        <div className="w-full px-4 lg:px-6">
          <div className="text-center">
            <p className="text-slate-600">
              &copy; {new Date().getFullYear()} EOTY Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-50 p-4 bg-gradient-to-r from-[#00FFC6]/90 to-[#4FC3F7]/90 text-white rounded-full shadow-2xl hover:from-[#00E6B8] hover:to-[#42B5E5] transition-all duration-300 transform hover:scale-110 backdrop-blur-sm border border-[#00FFC6]/30 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
        aria-label="Back to top"
      >
        <ChevronUp className="h-6 w-6" />
      </button>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        
        .animate-shimmer {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        /* Better focus states for accessibility */
        a:focus-visible,
        button:focus-visible {
          outline: 2px solid #39FF14;
          outline-offset: 2px;
        }
        
        /* Smooth transitions for all interactive elements */
        * {
          transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          /* Reduce padding on mobile */
          section {
            padding-top: 4rem;
            padding-bottom: 4rem;
          }
          
          /* Optimize touch targets */
          button, a {
            min-height: 44px;
            min-width: 44px;
          }
          
          /* Stack elements vertically on mobile */
          .grid {
            grid-template-columns: 1fr !important;
          }
        }
        
        /* Image optimization */
        img {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        /* Lazy loading placeholder */
        img[loading="lazy"] {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }
        
        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Landing;
