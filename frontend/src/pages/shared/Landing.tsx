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
  X
} from 'lucide-react';
import LoginForm from '@/components/shared/auth/LoginForm';
import RegisterForm from '@/components/shared/auth/RegisterForm';
import { useAuth } from '@/context/AuthContext';

const Landing: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { isAuthenticated } = useAuth();

  // Close form when user successfully authenticates
  useEffect(() => {
    if (isAuthenticated) {
      setAuthMode(null);
    }
  }, [isAuthenticated]);

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
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/eoc.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
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
      </div>

      {/* Header */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrollY > 50 ? 'rgba(254, 252, 248, 0.98)' : 'rgba(254, 252, 248, 0.90)',
          backdropFilter: 'blur(20px)',
          boxShadow: scrollY > 50 ? '0 4px 20px rgba(0,0,0,0.05)' : 'none',
          borderBottom: '1px solid rgba(220, 220, 220, 0.3)'
        }}
      >
        <div className="w-full">
          <div className="flex justify-between items-center py-4 px-4 lg:px-6">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-[#39FF14]/15 rounded-lg blur-md group-hover:blur-lg transition-all" />
                <BookOpen className="relative h-10 w-10 text-[#39FF14] transform group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-2xl font-bold text-slate-700">
                EOTY Platform
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setAuthMode('login')}
                className="text-slate-600 hover:text-slate-800 font-medium transition-all duration-200 hover:scale-105"
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className="px-6 py-2.5 bg-gradient-to-r from-[#00FFC6]/90 to-[#4FC3F7]/90 text-white rounded-lg hover:from-[#00E6B8] hover:to-[#42B5E5] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:shadow-[#00FFC6]/30 transform hover:scale-105 backdrop-blur-sm border border-[#00FFC6]/30"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Full Screen */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 z-10">
        <div className="w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center px-4 lg:px-6">
            {/* Left Content */}
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#FFFACD]/40 rounded-full border border-[#FFFACD]/60 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-[#FFD700]" />
                <span className="text-sm font-medium text-slate-700">For Ethiopian Orthodox Youths</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="block text-slate-700">Transform Your</span>
                <span className="block bg-gradient-to-r from-[#00FFC6] via-[#4FC3F7] to-[#00FFC6] bg-clip-text text-transparent animate-gradient">
                  Learning Journey
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-xl">
                Join thousands of students and teachers on our comprehensive educational platform. 
                Access courses, track progress, and connect with a vibrant learning community.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setAuthMode('register')}
                  className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#00FFC6]/90 to-[#4FC3F7]/90 text-white rounded-xl hover:from-[#00E6B8] hover:to-[#42B5E5] transition-all duration-300 font-semibold text-lg shadow-2xl hover:shadow-[#00FFC6]/40 transform hover:scale-105 backdrop-blur-sm border border-[#00FFC6]/30"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setAuthMode('login')}
                  className="inline-flex items-center justify-center px-8 py-4 bg-white/90 backdrop-blur-sm text-slate-700 rounded-xl border-2 border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Sign In
                </button>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 pt-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-[#39FF14]/20 rounded-lg backdrop-blur-sm">
                    <Users className="h-5 w-5 text-[#39FF14]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-700">10K+</div>
                    <div className="text-sm text-slate-600">Active Students</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-[#FFD700]/20 rounded-lg backdrop-blur-sm">
                    <BookOpen className="h-5 w-5 text-[#FFD700]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-700">500+</div>
                    <div className="text-sm text-slate-600">Courses</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-[#00FFFF]/20 rounded-lg backdrop-blur-sm">
                    <Award className="h-5 w-5 text-[#00FFFF]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-700">98%</div>
                    <div className="text-sm text-slate-600">Satisfaction</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Form or Illustration (Desktop) */}
            <div className="relative lg:block hidden">
              <div className="relative">
                <div className="relative w-full h-[600px]">
                  {/* Decorative Circles */}
                  <div className="absolute top-10 right-10 w-32 h-32 bg-[#00FFC6]/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '3s' }} />
                  <div className="absolute bottom-20 left-10 w-24 h-24 bg-[#FFF59D]/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
                  
                  {/* Auth Form Overlay */}
                  {authMode && (
                    <div className={`absolute inset-0 z-20 transform transition-all duration-500 ${
                      authMode ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                    }`}>
                      <div className="relative bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-200/30 h-full overflow-y-auto">
                        {/* Close Button */}
                        <button
                          onClick={() => setAuthMode(null)}
                          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100/80 hover:bg-slate-200/80 transition-colors z-30"
                          aria-label="Close form"
                        >
                          <X className="h-5 w-5 text-slate-600" />
                        </button>
                        
                        {/* Form Header */}
                        <div className="text-center mb-6 pt-2">
                          <div className="flex justify-center mb-3">
                            <div className="relative">
                              <div className="absolute inset-0 bg-[#39FF14]/20 rounded-xl blur-lg" />
                              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#39FF14]/20 to-[#32E60F]/15 flex items-center justify-center border border-[#39FF14]/30 backdrop-blur-sm">
                                <BookOpen className="h-6 w-6 text-[#39FF14]" />
                              </div>
                            </div>
                          </div>
                          <h2 className="text-2xl font-bold text-slate-700 mb-1">
                            {authMode === 'login' ? 'Welcome back' : 'Join our community'}
                          </h2>
                          <p className="text-sm text-slate-600">
                            {authMode === 'login' 
                              ? 'Sign in to continue your spiritual journey' 
                              : 'Create your account to start learning'}
                          </p>
                        </div>
                        
                        {/* Form Content */}
                        <div className="px-2">
                          {authMode === 'login' ? (
                            <LoginForm />
                          ) : (
                            <RegisterForm />
                          )}
                        </div>
                        
                        {/* Switch Form Link */}
                        <div className="mt-4 pt-4 border-t border-slate-200/50 text-center">
                          <button
                            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                            className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
                          >
                            {authMode === 'login' 
                              ? "Don't have an account? " 
                              : 'Already have an account? '}
                            <span className="font-semibold text-[#39FF14]">
                              {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Default Illustration - Hidden when form is shown */}
                  <div className={`relative transition-all duration-500 ${
                    authMode ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'
                  }`}>
                    <div className="relative bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-200/30 transform hover:scale-105 transition-all duration-500">
                      <div className="space-y-6">
                        {/* Video Preview */}
                        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-100/90 to-slate-200/90 aspect-video backdrop-blur-sm">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 bg-[#39FF14] rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform cursor-pointer">
                              <PlayCircle className="h-10 w-10 text-slate-900 ml-1" />
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                            <div className="text-white text-sm font-medium">Interactive Video Lessons</div>
                          </div>
                        </div>
                        
                        {/* Progress Cards */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-[#39FF14]/15 to-[#32E60F]/10 rounded-xl p-4 border border-[#39FF14]/25 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-slate-700">Progress</span>
                              <span className="text-sm font-bold text-[#39FF14]">75%</span>
                            </div>
                            <div className="w-full bg-slate-200/50 rounded-full h-2">
                              <div className="bg-[#39FF14] h-2 rounded-full" style={{ width: '75%' }} />
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-[#FFD700]/15 to-[#FFD700]/10 rounded-xl p-4 border border-[#FFD700]/25 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-slate-700">Achievements</span>
                              <Star className="h-4 w-4 text-[#FFD700] fill-current" />
                            </div>
                            <div className="text-2xl font-bold text-slate-700">12</div>
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

      {/* Mobile Auth Form Modal */}
      {authMode && (
        <div 
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setAuthMode(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal Content */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md rounded-t-3xl shadow-2xl border-t border-slate-200/50 max-h-[90vh] overflow-y-auto transform transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-slate-700">
                {authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </h2>
              <button
                onClick={() => setAuthMode(null)}
                className="p-2 rounded-full bg-slate-100/80 hover:bg-slate-200/80 transition-colors"
                aria-label="Close form"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-slate-600">
                  {authMode === 'login' 
                    ? 'Sign in to continue your spiritual journey' 
                    : 'Create your account to start learning'}
                </p>
              </div>
              
              {authMode === 'login' ? (
                <LoginForm />
              ) : (
                <RegisterForm />
              )}
              
              {/* Switch Form Link */}
              <div className="mt-6 pt-6 border-t border-slate-200/50 text-center">
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  {authMode === 'login' 
                    ? "Don't have an account? " 
                    : 'Already have an account? '}
                  <span className="font-semibold text-[#39FF14]">
                    {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  The EOTY Platform is dedicated to providing comprehensive, faith-aligned education 
                  for Ethiopian Orthodox youths. We believe in nurturing spiritual growth through 
                  quality learning experiences that honor our rich traditions and values.
                </p>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Our mission is to create an accessible, engaging, and supportive learning environment 
                  where students can deepen their understanding of Orthodox Christianity, connect with 
                  their community, and grow in their faith journey.
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
              <p className={`text-xl text-slate-600 max-w-2xl mx-auto transition-all duration-700 delay-400 ${
                visibleSections.has('how-it-works') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                Get started in just a few simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { 
                  step: '01', 
                  icon: User, 
                  title: 'Create Account', 
                  desc: 'Sign up for free and join our community of learners',
                  color: '#39FF14'
                },
                { 
                  step: '02', 
                  icon: BookOpen, 
                  title: 'Browse Courses', 
                  desc: 'Explore our comprehensive library of faith-based courses',
                  color: '#00FFFF'
                },
                { 
                  step: '03', 
                  icon: PlayCircle, 
                  title: 'Start Learning', 
                  desc: 'Watch videos, complete lessons, and track your progress',
                  color: '#FFD700'
                },
                { 
                  step: '04', 
                  icon: Award, 
                  title: 'Earn Achievements', 
                  desc: 'Complete courses, earn badges, and grow in your faith journey',
                  color: '#39FF14'
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
                  <div className="bg-white/85 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200/40 transform hover:-translate-y-2 hover:scale-105 h-full cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm transition-transform group-hover:scale-110 group-hover:rotate-3"
                        style={{ backgroundColor: `${item.color}20`, borderColor: `${item.color}30`, borderWidth: '1px' }}
                      >
                        <item.icon className="h-6 w-6 transition-transform group-hover:scale-110" style={{ color: item.color }} />
                      </div>
                      <span className="text-3xl font-bold text-slate-300 group-hover:text-slate-400 transition-colors">{item.step}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-3 group-hover:text-slate-800 transition-colors">{item.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                  {index < 3 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10 animate-pulse">
                      <ArrowRight className="h-6 w-6 text-slate-400" />
                    </div>
                  )}
                </div>
              ))}
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
              <p className={`text-xl text-slate-600 max-w-2xl mx-auto transition-all duration-700 delay-400 ${
                visibleSections.has('blogs') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                Read articles, stories, and insights from our community
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

      {/* CTA Section */}
      <section className="relative py-32 bg-gradient-to-br from-slate-200/50 via-stone-200/50 to-slate-300/50 backdrop-blur-md z-10">
        <div className="w-full text-center px-4 lg:px-6">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#39FF14]/20 rounded-full border border-[#39FF14]/30 backdrop-blur-sm mb-8">
            <Heart className="h-4 w-4 text-[#39FF14]" />
            <span className="text-sm font-medium text-slate-700">Join Our Community</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-700">
            Ready to Start Learning?
          </h2>
          <p className="text-xl mb-12 text-slate-600 max-w-2xl mx-auto">
            Join our platform today and unlock a world of knowledge and opportunities for Ethiopian Orthodox youths.
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
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-slate-300/80 backdrop-blur-md text-slate-700 py-16 border-t border-slate-400/40 z-10">
        <div className="w-full px-4 lg:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="p-2 bg-[#39FF14]/20 rounded-lg backdrop-blur-sm">
                <BookOpen className="h-6 w-6 text-[#39FF14]" />
              </div>
              <span className="text-xl font-bold text-slate-700">EOTY Platform</span>
            </div>
            <div className="flex space-x-8">
              <Link to="/login" className="hover:text-slate-800 transition-colors font-medium">
                Sign In
              </Link>
              <Link to="/register" className="hover:text-slate-800 transition-colors font-medium">
                Sign Up
              </Link>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-400/40 text-center text-sm">
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
      `}</style>
    </div>
  );
};

export default Landing;
