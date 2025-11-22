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
  Clock,
  MessageCircle,
  Play
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { landingApi } from '@/services/api';
import * as THREE from 'three';

const Landing: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    totalStudents: 10000,
    totalCourses: 500,
    satisfactionRate: 98
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);
  const [landingContent, setLandingContent] = useState<any>({});
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});


  // Helper function to render How It Works step
  const renderHowItWorksStep = (item: any, index: number) => {
    const iconMap: any = { User, BookOpen, PlayCircle, Award };
    const IconComponent = iconMap[item.icon] || User;
    const colors = ['#00FFC6', '#FF00FF', '#FFD700', '#00D4FF'];
    const color = colors[index % colors.length];

    return (
      <div
        key={index}
        className={`relative group transition-all duration-700 ${
          visibleSections.has('how-it-works')
            ? `opacity-100 translate-y-0 delay-${index * 100}`
            : 'opacity-0 translate-y-10'
        }`}
        style={{ transitionDelay: `${index * 100}ms` }}
      >
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200/50 transform hover:-translate-y-2 hover:scale-105 h-full cursor-pointer relative overflow-hidden">
          {/* Animated background gradient on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: `linear-gradient(135deg, ${color}15, transparent)` }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all group-hover:scale-110 group-hover:rotate-3"
                style={{
                  backgroundColor: `${color}20`,
                  borderColor: `${color}40`,
                  borderWidth: '2px',
                  boxShadow: `0 0 20px ${color}30`
                }}
              >
                <IconComponent className="h-7 w-7 transition-transform group-hover:scale-110" style={{ color: color }} />
              </div>
              <span className="text-3xl font-bold text-gray-300 group-hover:text-gray-400 transition-colors">{item.step}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3 transition-colors" style={{ color: visibleSections.has('how-it-works') ? 'inherit' : undefined }}>{item.title}</h3>
            <p className="text-gray-600 leading-relaxed mb-4">{item.description}</p>

            {/* Feature list */}
            <div className="space-y-2 pt-3 border-t border-gray-200/50">
              {item.features.map((feature: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-2 text-sm">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-gray-600">{feature}</span>
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
    );
  };
  const { isAuthenticated, getRoleDashboard } = useAuth();
  
  // Three.js refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<THREE.Points | null>(null);

  // Fetch landing page content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        console.log('🎬 Landing: Fetching content...');
        const response = await landingApi.getContent();
        console.log('📥 Landing: API Response:', response);
        if (response.success && response.data) {
          console.log('✅ Landing: Setting content:', response.data);
          setLandingContent(response.data);
        } else {
          console.log('❌ Landing: No success or data in response');
        }
      } catch (error) {
        console.error('Failed to fetch landing content:', error);
        // Keep empty object on error - will use defaults
      }
    };

    fetchContent();
  }, []);

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

  // Three.js Particle Network Effect
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.position.z = 50;

    // Create particles with muted colors
    const particleCount = 150;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: number[] = [];

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;
      positions[i + 1] = (Math.random() - 0.5) * 100;
      positions[i + 2] = (Math.random() - 0.5) * 50;
      
      velocities.push(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Light silver/grey color palette for particles
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xC0C0C0, // Silver
      size: 2,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
    particlesRef.current = particleSystem;

    // Create connection lines between nearby particles
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xD3D3D3, // Light grey
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending
    });

    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(particleCount * particleCount * 6);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Mouse interaction
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const positionsArray = particleSystem.geometry.attributes.position.array as Float32Array;
      const linePositionsArray = lines.geometry.attributes.position.array as Float32Array;
      let lineIndex = 0;

      // Update particle positions
      for (let i = 0; i < particleCount * 3; i += 3) {
        positionsArray[i] += velocities[i];
        positionsArray[i + 1] += velocities[i + 1];
        positionsArray[i + 2] += velocities[i + 2];

        // Bounce particles at boundaries
        if (Math.abs(positionsArray[i]) > 50) velocities[i] *= -1;
        if (Math.abs(positionsArray[i + 1]) > 50) velocities[i + 1] *= -1;
        if (Math.abs(positionsArray[i + 2]) > 25) velocities[i + 2] *= -1;

        // Mouse interaction - particles move away from cursor
        const dx = positionsArray[i] - mouseRef.current.x * 50;
        const dy = positionsArray[i + 1] - mouseRef.current.y * 50;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 15) {
          positionsArray[i] += dx * 0.01;
          positionsArray[i + 1] += dy * 0.01;
        }
      }

      // Draw lines between nearby particles
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = positionsArray[i * 3] - positionsArray[j * 3];
          const dy = positionsArray[i * 3 + 1] - positionsArray[j * 3 + 1];
          const dz = positionsArray[i * 3 + 2] - positionsArray[j * 3 + 2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (distance < 15) {
            linePositionsArray[lineIndex++] = positionsArray[i * 3];
            linePositionsArray[lineIndex++] = positionsArray[i * 3 + 1];
            linePositionsArray[lineIndex++] = positionsArray[i * 3 + 2];
            linePositionsArray[lineIndex++] = positionsArray[j * 3];
            linePositionsArray[lineIndex++] = positionsArray[j * 3 + 1];
            linePositionsArray[lineIndex++] = positionsArray[j * 3 + 2];
          }
        }
      }

      // Fill remaining line positions with zeros
      for (let i = lineIndex; i < linePositionsArray.length; i++) {
        linePositionsArray[i] = 0;
      }

      particleSystem.geometry.attributes.position.needsUpdate = true;
      lines.geometry.attributes.position.needsUpdate = true;

      // Gentle rotation
      particleSystem.rotation.y += 0.0005;
      lines.rotation.y += 0.0005;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      particles.dispose();
      particleMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      {/* Three.js Particle Network Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, #F5F5F0 0%, #E8E8E3 50%, #D4D4CE 100%)' }}
      />

      {/* Background Image - Temporarily disabled video to fix conflicts */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/eoc.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          imageRendering: 'auto',
          willChange: 'transform',
          opacity: 0.08
        }}
      />

      {/* Overlay for better text readability - light beige overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F5F5DC]/80 via-[#FAF0E6]/70 to-[#FFF8DC]/80 backdrop-blur-sm pointer-events-none" />

      {/* Animated Background Elements - Neon accent colors */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute top-20 left-10 w-72 h-72 bg-[#00FFC6]/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '0s', animationDuration: '4s' }}
        />
        <div 
          className="absolute top-40 right-20 w-96 h-96 bg-[#FF00FF]/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s', animationDuration: '5s' }}
        />
        <div 
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-[#00D4FF]/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s', animationDuration: '6s' }}
        />
        {/* Floating geometric shapes with light borders */}
        <div 
          className="absolute top-1/4 right-1/4 w-16 h-16 border-2 border-gray-300/30 rounded-lg animate-float rotate-45"
          style={{ animationDelay: '0.5s', animationDuration: '3s' }}
        />
        <div 
          className="absolute top-1/3 left-1/4 w-12 h-12 border-2 border-gray-300/30 rounded-full animate-float"
          style={{ animationDelay: '1.5s', animationDuration: '4s' }}
        />
        <div 
          className="absolute bottom-1/3 right-1/3 w-20 h-20 border-2 border-gray-300/30 animate-float"
          style={{ 
            animationDelay: '2s', 
            animationDuration: '5s',
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
          }}
        />
      </div>

      {/* Header - Light Glassmorphism */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 shadow-lg"
      >
        <div className="w-full">
          <div className="flex justify-between items-center py-4 px-4 lg:px-6">
            <Link to="/" className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-[#00FFC6]/20 rounded-lg blur-md group-hover:blur-lg transition-all" />
                <BookOpen className="relative h-10 w-10 text-gray-700 transform group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                EOTY Platform
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00FFC6] to-[#00D4FF] text-gray-900 hover:from-[#00E6B3] hover:to-[#00BFEA] font-semibold transition-all duration-200 shadow-lg shadow-[#00FFC6]/30 hover:shadow-[#00FFC6]/50 border border-[#00FFC6]/50"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Full Screen with Glassmorphism */}
      <section id="hero-section" className="relative min-h-screen flex items-center justify-center pt-20 z-10">
        <div className="w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center px-4 lg:px-6">
            {/* Left Content - Light Glassmorphism Card */}
            <div className="space-y-8 animate-fade-in bg-white/60 backdrop-blur-2xl rounded-3xl p-8 lg:p-12 border border-gray-200/50 shadow-2xl">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#FFD700]/20 rounded-full border border-[#FFD700]/40 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-[#FFD700]" />
                <span className="text-sm font-medium text-gray-700">
                  {landingContent.hero?.badge || 'For Ethiopian Orthodox Youths'}
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="block text-gray-800 animate-fade-in">
                  {landingContent.hero?.title || 'Transform Your'}
                </span>
                <span className="block bg-gradient-to-r from-[#00FFC6] via-[#00D4FF] to-[#FF00FF] bg-clip-text text-transparent animate-gradient">
                  {landingContent.hero?.titleGradient || 'Learning Journey'}
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
                {landingContent.hero?.description || 'Join our faith-centered learning community. Access courses, track progress, and grow in your spiritual journey.'}
              </p>

              {/* CTA Buttons - Neon Colors */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                {!isAuthenticated && (
                  <>
                    <Link
                      to="/register"
                      className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#00FFC6] to-[#00D4FF] text-gray-900 rounded-xl hover:from-[#00E6B3] hover:to-[#00BFEA] transition-all duration-300 font-semibold text-lg shadow-2xl shadow-[#00FFC6]/40 hover:shadow-[#00FFC6]/60 transform hover:scale-105 backdrop-blur-sm border border-[#00FFC6]/50"
                    >
                      Start Learning Free
                      <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center px-8 py-4 bg-white/70 backdrop-blur-sm text-gray-700 rounded-xl border-2 border-gray-300/50 hover:bg-white/90 hover:border-gray-400/50 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Sign In
                    </Link>
                  </>
                )}
                {isAuthenticated && (
                  <Link
                    to={getRoleDashboard()}
                    className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#00FFC6] to-[#00D4FF] text-gray-900 rounded-xl hover:from-[#00E6B3] hover:to-[#00BFEA] transition-all duration-300 font-semibold text-lg shadow-2xl shadow-[#00FFC6]/40 hover:shadow-[#00FFC6]/60 transform hover:scale-105 backdrop-blur-sm border border-[#00FFC6]/50"
                  >
                    Go to your dashboard
                    <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>

              {/* Enhanced Stats with Animations - Light Glassmorphism with Neon Accents */}
              <div className="grid grid-cols-3 gap-4 pt-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <div className="group relative bg-white/50 backdrop-blur-md rounded-xl p-4 border border-gray-200/50 hover:border-[#00FFC6]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#00FFC6]/20 hover:scale-105">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-[#00FFC6]/30 to-[#00FFC6]/10 rounded-lg group-hover:scale-110 transition-transform">
                      <Users className="h-5 w-5 text-[#00FFC6]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-800 group-hover:text-[#00FFC6] transition-colors">
                        {isLoadingStats ? '...' : `${(stats.totalStudents / 1000).toFixed(0)}K+`}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Active Students</div>
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00FFC6] rounded-full animate-ping opacity-75" />
                </div>
                <div className="group relative bg-white/50 backdrop-blur-md rounded-xl p-4 border border-gray-200/50 hover:border-[#FF00FF]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#FF00FF]/20 hover:scale-105">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-[#FF00FF]/30 to-[#FF00FF]/10 rounded-lg group-hover:scale-110 transition-transform">
                      <BookOpen className="h-5 w-5 text-[#FF00FF]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-800 group-hover:text-[#FF00FF] transition-colors">
                        {isLoadingStats ? '...' : `${stats.totalCourses}+`}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Courses</div>
                    </div>
                  </div>
                </div>
                <div className="group relative bg-white/50 backdrop-blur-md rounded-xl p-4 border border-gray-200/50 hover:border-[#FFD700]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#FFD700]/20 hover:scale-105">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-[#FFD700]/30 to-[#FFD700]/10 rounded-lg group-hover:scale-110 transition-transform">
                      <Award className="h-5 w-5 text-[#FFD700]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-800 group-hover:text-[#FFD700] transition-colors">
                        {isLoadingStats ? '...' : `${stats.satisfactionRate}%`}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Satisfaction</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Illustration Only (Desktop) - Light Glassmorphism */}
            <div className="relative lg:block hidden">
              <div className="relative">
                <div className="relative w-full h-[600px]">
                  {/* Decorative Circles - Neon Accents */}
                  <div className="absolute top-10 right-10 w-32 h-32 bg-[#00FFC6]/15 rounded-full blur-xl animate-bounce" style={{ animationDuration: '3s' }} />
                  <div className="absolute bottom-20 left-10 w-24 h-24 bg-[#FF00FF]/15 rounded-full blur-xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />

                  {/* Enhanced Dashboard Preview - Light Glassmorphism */}
                  <div className="relative transition-all duration-500 opacity-100 scale-100">
                    <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-gray-200/50 transform hover:scale-[1.02] transition-all duration-500 group">
                      <div className="space-y-6">
                        {/* Hero Video Display */}
                        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 aspect-video group">
                          {(() => {
                            const videoSrc = `http://localhost:5000${landingContent.hero?.videoUrl || ''}`;
                            console.log('🎥 Video element rendering with src:', videoSrc);
                            console.log('🎥 Full landingContent.hero:', landingContent.hero);
                            return (
                              <video
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                autoPlay
                                muted
                                loop
                                playsInline
                                poster="/eoc.jpg"
                              >
                                <source src={videoSrc} type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                            );
                          })()}

                          {/* Overlay Effects */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />

                          {/* Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 transform scale-75 group-hover:scale-100 transition-all duration-300">
                              <PlayCircle className="h-8 w-8 text-white ml-1" />
                            </div>
                          </div>

                          {/* Video Info Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-white text-lg font-bold mb-1">Watch Our Story</h3>
                                <p className="text-white/80 text-sm">Experience our faith-centered learning community</p>
                              </div>
                              <div className="flex items-center space-x-2 text-white/80 text-sm">
                                <Play className="h-4 w-4" />
                                <span>HD Video</span>
                              </div>
                            </div>
                          </div>

                          {/* Duration Badge */}
                          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full border border-white/20">
                            Auto-playing
                          </div>
                        </div>

                        {/* Video Stats Below */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                            <div className="text-2xl font-bold text-white mb-1">
                              <span className="inline-flex items-center">
                                <Play className="h-5 w-5 mr-1" />
                                4.8K
                              </span>
                            </div>
                            <div className="text-white/80 text-xs">Views</div>
                          </div>
                          <div className="text-center p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                            <div className="text-2xl font-bold text-white mb-1">
                              <span className="inline-flex items-center">
                                <Heart className="h-5 w-5 mr-1" />
                                892
                              </span>
                            </div>
                            <div className="text-white/80 text-xs">Likes</div>
                          </div>
                          <div className="text-center p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                            <div className="text-2xl font-bold text-white mb-1">
                              <span className="inline-flex items-center">
                                <MessageCircle className="h-5 w-5 mr-1" />
                                156
                              </span>
                            </div>
                            <div className="text-white/80 text-xs">Comments</div>
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

      {/* About/Mission Section - Light & Elegant */}
      <section 
        ref={(el) => (sectionRefs.current['about'] = el as HTMLDivElement | null)}
        data-section-id="about"
        className={`relative py-32 bg-gradient-to-br from-[#FAF0E6]/90 via-white/80 to-[#F5F5DC]/90 backdrop-blur-md z-10 transition-all duration-1000 ${
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
                <span className="text-sm font-medium text-gray-700">
                  {landingContent.about?.badge || 'Our Mission'}
                </span>
              </div>
              <h2 className={`text-4xl md:text-5xl font-bold text-gray-800 mb-6 transition-all duration-700 delay-300 ${
                visibleSections.has('about') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                {landingContent.about?.title || 'Empowering Ethiopian Orthodox Youths'}
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <p className="text-xl text-gray-600 leading-relaxed">
                  {landingContent.about?.description || 'Empowering Ethiopian Orthodox youths through faith-centered education. Nurturing spiritual growth with quality learning that honors our traditions.'}
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg border border-[#00FFC6]/30 hover:border-[#00FFC6]/50 hover:shadow-lg hover:shadow-[#00FFC6]/20 transition-all">
                    <Target className="h-5 w-5 text-[#00FFC6]" />
                    <span className="text-sm font-medium text-gray-700">Faith-Centered</span>
                  </div>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg border border-[#FF00FF]/30 hover:border-[#FF00FF]/50 hover:shadow-lg hover:shadow-[#FF00FF]/20 transition-all">
                    <Users className="h-5 w-5 text-[#FF00FF]" />
                    <span className="text-sm font-medium text-gray-700">Community-Driven</span>
                  </div>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg border border-[#FFD700]/30 hover:border-[#FFD700]/50 hover:shadow-lg hover:shadow-[#FFD700]/20 transition-all">
                    <Award className="h-5 w-5 text-[#FFD700]" />
                    <span className="text-sm font-medium text-gray-700">Excellence in Education</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-200/50">
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4 group hover:scale-105 transition-transform">
                      <div className="p-3 bg-[#00FFC6]/20 rounded-xl group-hover:shadow-lg group-hover:shadow-[#00FFC6]/30 transition-all">
                        <BookOpen className="h-6 w-6 text-[#00FFC6]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Comprehensive Learning</h3>
                        <p className="text-gray-600">Access courses covering theology, history, traditions, and more.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4 group hover:scale-105 transition-transform">
                      <div className="p-3 bg-[#FF00FF]/20 rounded-xl group-hover:shadow-lg group-hover:shadow-[#FF00FF]/30 transition-all">
                        <Users className="h-6 w-6 text-[#FF00FF]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Community Support</h3>
                        <p className="text-gray-600">Connect with fellow learners and experienced teachers.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4 group hover:scale-105 transition-transform">
                      <div className="p-3 bg-[#FFD700]/20 rounded-xl group-hover:shadow-lg group-hover:shadow-[#FFD700]/30 transition-all">
                        <Award className="h-6 w-6 text-[#FFD700]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Track Progress</h3>
                        <p className="text-gray-600">Monitor your learning journey and celebrate achievements.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Light with Neon Accents */}
      <section 
        ref={(el) => (sectionRefs.current['how-it-works'] = el as HTMLDivElement | null)}
        data-section-id="how-it-works"
        className={`relative py-32 bg-white/80 backdrop-blur-md z-10 transition-all duration-1000 ${
          visibleSections.has('how-it-works') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="w-full px-4 lg:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-[#00FFC6]/25 rounded-full border border-[#00FFC6]/40 backdrop-blur-sm mb-6 transition-all duration-700 delay-200 ${
                visibleSections.has('how-it-works') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}>
                <Zap className="h-4 w-4 text-[#00FFC6]" />
                <span className="text-sm font-medium text-gray-700">
                  {landingContent.howItWorks?.badge || 'Simple Process'}
                </span>
              </div>
              <h2 className={`text-4xl md:text-5xl font-bold text-gray-800 mb-6 transition-all duration-700 delay-300 ${
                visibleSections.has('how-it-works') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                {landingContent.howItWorks?.title || 'How It Works'}
              </h2>
              <p className={`text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-400 ${
                visibleSections.has('how-it-works') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                {landingContent.howItWorks?.description || 'Start your learning journey in minutes'}
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {(landingContent.howItWorks?.steps || [
                {
                  step: '01',
                  icon: 'User',
                  title: 'Create Account',
                  description: 'Sign up for free and join our community of learners',
                  features: ['Free forever', 'No credit card', 'Instant access']
                },
                {
                  step: '02',
                  icon: 'BookOpen',
                  title: 'Browse Courses',
                  description: 'Explore our comprehensive library of faith-based courses',
                  features: ['500+ courses', 'Expert teachers', 'Self-paced']
                },
                {
                  step: '03',
                  icon: 'PlayCircle',
                  title: 'Start Learning',
                  description: 'Watch videos, complete lessons, and track your progress',
                  features: ['HD videos', 'Interactive quizzes', 'Progress tracking']
                },
                {
                  step: '04',
                  icon: 'Award',
                  title: 'Earn Achievements',
                  description: 'Complete courses, earn badges, and grow in your faith journey',
                  features: ['Certificates', 'Badges', 'Leaderboards']
                },
              ]).map((item: any, index: number) => renderHowItWorksStep(item, index))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Section - Light & Elegant */}
      <section 
        ref={(el) => (sectionRefs.current['featured-courses'] = el as HTMLDivElement | null)}
        data-section-id="featured-courses"
        className={`relative py-32 bg-gradient-to-br from-[#FAF0E6]/90 via-white/80 to-[#F5F5DC]/90 backdrop-blur-md z-10 transition-all duration-1000 ${
          visibleSections.has('featured-courses') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
          <div className="w-full px-4 lg:px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-[#FF00FF]/25 rounded-full border border-[#FF00FF]/40 backdrop-blur-sm mb-6 transition-all duration-700 delay-200 ${
                  visibleSections.has('featured-courses') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}>
                  <Star className="h-4 w-4 text-[#FF00FF]" />
                  <span className="text-sm font-medium text-gray-700">Popular Courses</span>
                </div>
                <h2 className={`text-4xl md:text-5xl font-bold text-gray-800 mb-6 transition-all duration-700 delay-300 ${
                  visibleSections.has('featured-courses') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                }`}>
                  Featured Courses
                </h2>
                <p className={`text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-400 ${
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
                    className={`group bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-[#FF00FF]/20 transition-all duration-500 border border-gray-200/50 transform hover:-translate-y-3 hover:scale-[1.02] cursor-pointer relative ${
                      visibleSections.has('featured-courses') 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-10'
                    }`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    {/* Course Image with Video Preview Overlay - Enhanced */}
                    <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
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
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF00FF]/10 to-[#00FFC6]/10">
                          <BookOpen className="h-16 w-16 text-gray-400 group-hover:scale-110 group-hover:text-[#FF00FF] transition-all" />
                        </div>
                      )}
                      
                      {/* Video Play Overlay on Hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-[#00FFC6] to-[#00D4FF] rounded-full flex items-center justify-center shadow-2xl shadow-[#00FFC6]/50 transform group-hover:scale-110 transition-transform">
                          <PlayCircle className="h-8 w-8 text-gray-900 ml-1" />
                        </div>
                      </div>
                      
                      {/* Badges with neon colors */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {course.isNew && (
                          <div className="px-3 py-1 rounded-lg backdrop-blur-md text-xs font-bold bg-[#00FFC6] text-gray-900 shadow-lg shadow-[#00FFC6]/30 animate-pulse">
                            ✨ NEW
                          </div>
                        )}
                        {course.isPopular && (
                          <div className="px-3 py-1 rounded-lg backdrop-blur-md text-xs font-bold bg-[#FFD700] text-gray-900 shadow-lg shadow-[#FFD700]/30">
                            🔥 HOT
                          </div>
                        )}
                      </div>
                      
                      <div className="absolute top-3 right-3">
                        <div className="px-3 py-1 rounded-full backdrop-blur-md text-xs font-semibold bg-white/90 text-gray-700 border border-gray-200/50 shadow-lg">
                          {course.level || 'Beginner'}
                        </div>
                      </div>
                      
                      {/* Progress Bar (if enrolled) with neon gradient */}
                      {course.progress && (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200/50">
                          <div 
                            className="h-full bg-gradient-to-r from-[#00FFC6] to-[#00D4FF] transition-all duration-500 relative overflow-hidden"
                            style={{ width: `${course.progress}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Course Content - Enhanced */}
                    <div className="p-6 bg-gradient-to-b from-transparent to-gray-50/50">
                      {/* Instructor Info */}
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF00FF] to-[#00FFC6] flex items-center justify-center text-white text-xs font-bold shadow-lg">
                          {course.instructor?.charAt(0) || 'T'}
                        </div>
                        <span className="text-xs text-gray-600 font-medium">
                          {course.instructor || 'Expert Teacher'}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-[#FF00FF] transition-colors line-clamp-2 min-h-[3rem]">
                        {course.title}
                      </h3>
                      
                      {/* Rating and Reviews */}
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-[#FFD700] fill-current" />
                          <span className="text-sm font-semibold text-gray-800">
                            {(course.rating || 4.5).toFixed(1)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          ({course.ratingCount || Math.floor(Math.random() * 500) + 50})
                        </span>
                      </div>
                      
                      {/* Course Meta */}
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-4 pb-4 border-b border-gray-200/50">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3.5 w-3.5 text-[#00FFC6]" />
                          <span>{course.studentCount || Math.floor(Math.random() * 5000) + 100} students</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3.5 w-3.5 text-[#FF00FF]" />
                          <span>{course.duration || '8h'} total</span>
                        </div>
                      </div>
                      
                      {/* Price/CTA */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {course.price ? (
                            <>
                              <span className="text-lg font-bold text-gray-800">${course.price}</span>
                              {course.originalPrice && (
                                <span className="text-sm text-gray-400 line-through">${course.originalPrice}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-[#00FFC6] bg-[#00FFC6]/10 px-3 py-1 rounded-lg shadow-sm">
                              FREE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-[#FF00FF] font-semibold text-sm group-hover:gap-2 transition-all">
                          <span>Explore</span>
                          <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                )) : (
                  // Placeholder when no courses available
                  <div className="col-span-full text-center py-16 bg-white/60 backdrop-blur-xl rounded-2xl border border-gray-200/50">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FF00FF]/20 to-[#00FFC6]/20 flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-[#FF00FF]" />
                    </div>
                    <p className="text-gray-600 text-lg font-semibold">Featured courses coming soon</p>
                    <p className="text-gray-500 text-sm mt-2">Check back later for exciting new content!</p>
                  </div>
                )}
              </div>

              <div className="text-center mt-12">
                <Link
                  to="/courses"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#FF00FF] to-[#00FFC6] text-white rounded-xl hover:from-[#E600E6] hover:to-[#00E6B3] transition-all duration-300 font-semibold text-lg shadow-2xl shadow-[#FF00FF]/30 hover:shadow-[#FF00FF]/50 transform hover:scale-105"
                >
                  View All Courses
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

      {/* Video Section - Enhanced */}
      <section 
        ref={(el) => (sectionRefs.current['video'] = el as HTMLDivElement | null)}
        data-section-id="video"
        className={`relative py-32 bg-white/80 backdrop-blur-md z-10 transition-all duration-1000 ${
          visibleSections.has('video') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="w-full px-4 lg:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-[#00D4FF]/25 rounded-full border border-[#00D4FF]/40 backdrop-blur-sm mb-6 transition-all duration-700 delay-200 ${
                visibleSections.has('video') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}>
                <PlayCircle className="h-4 w-4 text-[#00D4FF]" />
                <span className="text-sm font-medium text-gray-700">Watch & Learn</span>
              </div>
              <h2 className={`text-4xl md:text-5xl font-bold text-gray-800 mb-6 transition-all duration-700 delay-300 ${
                visibleSections.has('video') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                Interactive Video Learning
              </h2>
              <p className={`text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-400 ${
                visibleSections.has('video') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                Experience engaging video lessons designed to enhance your understanding
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className={`group bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-[#00D4FF]/20 transition-all duration-500 border border-gray-200/50 transform hover:-translate-y-3 hover:scale-[1.02] cursor-pointer relative ${
                visibleSections.has('video') 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-10'
              }`}>
                <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button className="w-20 h-20 bg-gradient-to-r from-[#00D4FF] to-[#00FFC6] rounded-full flex items-center justify-center shadow-2xl shadow-[#00D4FF]/50 transform hover:scale-110 transition-all duration-300 cursor-pointer group-hover:scale-125">
                      <PlayCircle className="h-10 w-10 text-white ml-1" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
                    <div className="text-white text-sm font-semibold mb-1">📺 Interactive Video Lessons</div>
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
                  <div className="absolute top-3 left-3 flex items-center space-x-2 px-3 py-1 bg-red-500 backdrop-blur-md rounded-full shadow-lg">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-xs text-white font-bold">🔴 LIVE</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="p-2 bg-[#00D4FF]/20 rounded-lg">
                      <PlayCircle className="h-5 w-5 text-[#00D4FF]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-[#00D4FF] transition-colors">
                      High-Quality Video Content
                    </h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Access professionally produced video lessons covering theology, history, traditions, and more. Each lesson is designed to be engaging and easy to follow.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 text-xs bg-[#00D4FF]/10 rounded-lg text-[#00D4FF] font-semibold border border-[#00D4FF]/20">HD Quality</span>
                    <span className="px-3 py-1 text-xs bg-[#FF00FF]/10 rounded-lg text-[#FF00FF] font-semibold border border-[#FF00FF]/20">Subtitles</span>
                    <span className="px-3 py-1 text-xs bg-[#00FFC6]/10 rounded-lg text-[#00FFC6] font-semibold border border-[#00FFC6]/20">Downloadable</span>
                  </div>
                </div>
              </div>

              <div className={`group bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-[#00FFC6]/20 transition-all duration-500 border border-gray-200/50 transform hover:-translate-y-3 hover:scale-[1.02] cursor-pointer relative ${
                visibleSections.has('video') 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: '150ms' }}>
                <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button className="w-20 h-20 bg-gradient-to-r from-[#00FFC6] to-[#FFD700] rounded-full flex items-center justify-center shadow-2xl shadow-[#00FFC6]/50 transform hover:scale-110 transition-all duration-300 cursor-pointer group-hover:scale-125">
                      <PlayCircle className="h-10 w-10 text-gray-900 ml-1" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
                    <div className="text-white text-sm font-semibold mb-1">📊 Progress Tracking</div>
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
                    <div className="p-2 bg-[#00FFC6]/20 rounded-lg">
                      <Target className="h-5 w-5 text-[#00FFC6]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-[#00FFC6] transition-colors">
                      Track Your Progress
                    </h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Monitor your learning journey with detailed progress tracking. See which lessons you've completed and pick up exactly where you left off.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Overall Progress</span>
                      <span className="font-semibold text-[#00FFC6]">75%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#00FFC6] to-[#FFD700] h-2.5 rounded-full relative" style={{ width: '75%' }}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blogs Section - Enhanced */}
      <section 
        ref={(el) => (sectionRefs.current['blogs'] = el as HTMLDivElement | null)}
        data-section-id="blogs"
        className={`relative py-32 bg-gradient-to-br from-[#FAF0E6]/90 via-white/80 to-[#F5F5DC]/90 backdrop-blur-md z-10 transition-all duration-1000 ${
          visibleSections.has('blogs') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="w-full px-4 lg:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-[#FFD700]/25 rounded-full border border-[#FFD700]/40 backdrop-blur-md mb-6 shadow-lg transition-all duration-700 delay-200 ${
                visibleSections.has('blogs') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}>
                <FileText className="h-4 w-4 text-[#FFD700]" />
                <span className="text-sm font-medium text-gray-700">Latest Articles</span>
              </div>
              <h2 className={`text-4xl md:text-5xl font-bold text-gray-800 mb-6 transition-all duration-700 delay-300 ${
                visibleSections.has('blogs') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}>
                Insights & Stories
              </h2>
              <p className={`text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-400 ${
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
                  color: '#00FFC6',
                  icon: '📚'
                },
                { 
                  title: 'Building Community Through Learning', 
                  excerpt: 'Learn how our platform fosters connections and strengthens the bonds within the Orthodox community.',
                  author: 'Sister Mary',
                  date: '5 days ago',
                  category: 'Community',
                  color: '#00D4FF',
                  icon: '🤝'
                },
                { 
                  title: 'Navigating Modern Challenges with Ancient Wisdom', 
                  excerpt: 'Explore how traditional Orthodox teachings provide guidance for contemporary life challenges.',
                  author: 'Dr. Samuel',
                  date: '1 week ago',
                  category: 'Faith',
                  color: '#FFD700',
                  icon: '✨'
                },
              ].map((blog, index) => (
                <div
                  key={index}
                  className={`group bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-200/50 transform hover:-translate-y-3 hover:scale-[1.02] cursor-pointer ${
                    visibleSections.has('blogs') 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-transparent to-gray-300/20 group-hover:scale-110 transition-transform duration-500">
                      <div className="text-6xl">{blog.icon}</div>
                    </div>
                    <div className="absolute top-4 left-4">
                      <div 
                        className="px-3 py-1 rounded-full backdrop-blur-md text-xs font-bold transform group-hover:scale-110 transition-transform shadow-lg border"
                        style={{ 
                          backgroundColor: `${blog.color}20`, 
                          color: blog.color,
                          borderColor: `${blog.color}50`
                        }}
                      >
                        {blog.category}
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-gradient-to-b from-transparent to-gray-50/50">
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mb-3">
                      <Calendar className="h-3 w-3 text-[#FF00FF]" />
                      <span>{blog.date}</span>
                      <span>•</span>
                      <User className="h-3 w-3 text-[#00FFC6]" />
                      <span>{blog.author}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#FF00FF] transition-colors">
                      {blog.title}
                    </h3>
                    <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                      {blog.excerpt}
                    </p>
                    <Link
                      to="/register"
                      className="inline-flex items-center text-sm font-semibold transition-all group-hover:gap-2"
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
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#FFD700] to-[#FF00FF] text-white rounded-xl hover:from-[#E0C000] hover:to-[#E600E6] transition-all duration-300 font-semibold text-lg shadow-2xl shadow-[#FFD700]/30 hover:shadow-[#FFD700]/50 transform hover:scale-105"
              >
                View All Articles
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Enhanced */}
      <section 
        ref={(el) => (sectionRefs.current['testimonials'] = el as HTMLDivElement | null)}
        data-section-id="testimonials"
        className={`relative py-32 bg-white/80 backdrop-blur-md z-10 transition-all duration-1000 ${
          visibleSections.has('testimonials') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="w-full px-4 lg:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-[#FFD700]/25 rounded-full border border-[#FFD700]/40 backdrop-blur-md mb-6 shadow-lg transition-all duration-700 delay-200 ${
                visibleSections.has('testimonials') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}>
                <Star className="h-4 w-4 text-[#FFD700] fill-current" />
                <span className="text-sm font-medium text-gray-700">💬 What Our Students Say</span>
              </div>
              <h2 className={`text-4xl md:text-5xl font-bold text-gray-800 mb-6 transition-all duration-700 delay-300 ${
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
                  color: '#00FFC6',
                  emoji: '🌟'
                },
                {
                  name: 'Daniel K.',
                  role: 'Student',
                  image: null,
                  rating: 5,
                  text: 'As a busy professional, I love being able to learn at my own pace. The video lessons are engaging and the progress tracking keeps me motivated.',
                  color: '#00D4FF',
                  emoji: '💼'
                },
                {
                  name: 'Sarah M.',
                  role: 'Student',
                  image: null,
                  rating: 5,
                  text: 'The best investment in my spiritual growth. The teachers are knowledgeable and the content is relevant to modern Orthodox life.',
                  color: '#FF00FF',
                  emoji: '📖'
                },
              ].map((testimonial, index) => (
                <div
                  key={index}
                  className={`bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-200/50 transform hover:-translate-y-3 relative overflow-hidden group ${
                    visibleSections.has('testimonials') 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  {/* Gradient overlay on hover */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                    style={{ background: `linear-gradient(135deg, ${testimonial.color}, transparent)` }}
                  />
                  
                  <div className="relative z-10">
                    {/* Quote icon */}
                    <div className="text-6xl mb-4" style={{ color: `${testimonial.color}30` }}>❝</div>
                    
                    <div className="flex items-center space-x-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= testimonial.rating
                              ? 'text-[#FFD700] fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    
                    <p className="text-gray-700 mb-6 leading-relaxed">
                      {testimonial.text}
                    </p>
                    
                    <div className="flex items-center space-x-4">
                      <div 
                        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg"
                        style={{ 
                          background: `linear-gradient(135deg, ${testimonial.color}30, ${testimonial.color}10)`,
                          border: `2px solid ${testimonial.color}40`
                        }}
                      >
                        {testimonial.emoji}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{testimonial.name}</div>
                        <div className="text-sm text-gray-500">{testimonial.role}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Enhanced */}
      <section className="relative py-32 bg-gradient-to-br from-[#FAF0E6]/90 via-white/80 to-[#F5F5DC]/90 backdrop-blur-md z-10 overflow-hidden">
        {/* Animated background elements with neon colors */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#00FFC6]/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#FF00FF]/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
          <div className="absolute top-40 right-20 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
        </div>
        
        <div className="w-full text-center px-4 lg:px-6 relative z-10">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#00FFC6]/25 rounded-full border border-[#00FFC6]/40 backdrop-blur-md mb-8 shadow-lg animate-bounce" style={{ animationDuration: '2s' }}>
            <Heart className="h-4 w-4 text-[#00FFC6]" />
            <span className="text-sm font-medium text-gray-700">✨ Join Our Community</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-gray-800">
            Ready to <span className="bg-gradient-to-r from-[#FF00FF] to-[#00FFC6] bg-clip-text text-transparent">Start Learning</span>?
          </h2>
          <p className="text-lg mb-12 text-gray-600 max-w-2xl mx-auto">
            Start your faith-centered learning journey today. Join thousands of students already learning and growing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="group inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-[#00FFC6] to-[#00D4FF] text-white rounded-xl hover:from-[#00E6B3] hover:to-[#00BFEA] transition-all duration-300 font-semibold text-lg shadow-2xl shadow-[#00FFC6]/40 hover:shadow-[#00FFC6]/60 transform hover:scale-105"
            >
              🚀 Create Free Account
              <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-10 py-5 bg-white/90 backdrop-blur-md text-gray-700 rounded-xl border-2 border-gray-300/50 hover:bg-white hover:border-[#FF00FF]/50 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Sign In to Existing Account
            </Link>
          </div>
          
          {/* Trust Indicators - Enhanced */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="flex flex-col items-center space-y-2 p-4 bg-white/60 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <Shield className="h-6 w-6 text-[#00FFC6]" />
              <span className="text-sm font-semibold text-gray-700">100% Free to Start</span>
            </div>
            <div className="flex flex-col items-center space-y-2 p-4 bg-white/60 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <Users className="h-6 w-6 text-[#00D4FF]" />
              <span className="text-sm font-semibold text-gray-700">10K+ Active Students</span>
            </div>
            <div className="flex flex-col items-center space-y-2 p-4 bg-white/60 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <Award className="h-6 w-6 text-[#FFD700]" />
              <span className="text-sm font-semibold text-gray-700">98% Satisfaction Rate</span>
            </div>
            <div className="flex flex-col items-center space-y-2 p-4 bg-white/60 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <BookOpen className="h-6 w-6 text-[#FF00FF]" />
              <span className="text-sm font-semibold text-gray-700">500+ Courses Available</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Enhanced */}
      <footer className="relative bg-gradient-to-br from-gray-100 to-white backdrop-blur-md text-gray-700 py-16 border-t border-gray-200/50 z-10">
        <div className="w-full px-4 lg:px-6">
          <div className="max-w-7xl mx-auto">
            {/* Footer content */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-[#FF00FF] to-[#00FFC6] bg-clip-text text-transparent mb-4">
                EOTY Platform
              </h3>
              <p className="text-gray-600 max-w-xl mx-auto">
                Empowering Ethiopian Orthodox youths through faith-centered education and community support.
              </p>
            </div>
            
            {/* Social or Links Section */}
            <div className="flex justify-center space-x-6 mb-8">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00FFC6]/20 to-[#00D4FF]/20 border border-[#00FFC6]/30 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                <span className="text-lg">📧</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FF00FF]/20 to-[#FFD700]/20 border border-[#FF00FF]/30 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                <span className="text-lg">📱</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#00FFC6]/20 border border-[#FFD700]/30 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                <span className="text-lg">🌐</span>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} EOTY Platform. All rights reserved. Made with <span className="text-red-500">❤️</span> for the Ethiopian Orthodox Community.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to Top Button - Enhanced */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-50 p-4 bg-gradient-to-r from-[#FF00FF] to-[#00FFC6] text-white rounded-full shadow-2xl shadow-[#FF00FF]/40 hover:shadow-[#FF00FF]/60 hover:from-[#E600E6] hover:to-[#00E6B3] transition-all duration-300 transform hover:scale-110 ${
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
