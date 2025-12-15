import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { landingApi } from '@/services/api/landing';
import Header from '@/components/shared/Landing/Header';
import Hero from '@/components/shared/Landing/Hero';
import Footer from '@/components/shared/Landing/Footer';

// Defer heavy, below-the-fold sections
const VideoSection = lazy(() => import('@/components/shared/Landing/VideoSection'));
const About = lazy(() => import('@/components/shared/Landing/About'));
const FeaturedCourses = lazy(() => import('@/components/shared/Landing/FeaturedCourses'));
const HowItWorks = lazy(() => import('@/components/shared/Landing/HowItWorks'));
const Testimonials = lazy(() => import('@/components/shared/Landing/Testimonials'));
const DonationSection = lazy(() => import('@/components/shared/Landing/DonationSection'));

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type CacheEnvelope<T> = { timestamp: number; data: T };

const readCache = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: CacheEnvelope<T> = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
};

const writeCache = <T,>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    const envelope: CacheEnvelope<T> = { timestamp: Date.now(), data };
    sessionStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Ignore cache write failures
  }
};

const SectionSkeleton: React.FC<{ cards?: number }> = ({ cards = 3 }) => (
  <section className="py-16 sm:py-20 bg-white/70">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-4 mb-10">
        <div className="h-4 w-28 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-8 w-64 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-4 w-80 max-w-full rounded-full bg-gray-200 animate-pulse" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-sm"
          >
            <div className="h-40 rounded-xl bg-gray-100 animate-pulse mb-4" />
            <div className="h-5 w-3/4 rounded-full bg-gray-100 animate-pulse mb-3" />
            <div className="h-4 w-full rounded-full bg-gray-100 animate-pulse mb-2" />
            <div className="h-4 w-2/3 rounded-full bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Landing: React.FC = () => {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [landingContent, setLandingContent] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const location = useLocation();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId) || document.querySelector(`[data-section-id="${sectionId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  // Fetch landing content + featured data in parallel with cache
  useEffect(() => {
    let isCancelled = false;
    const cachedContent = readCache<any>('landing_content');
    const cachedCourses = readCache<any[]>('landing_courses');
    const cachedTestimonials = readCache<any[]>('landing_testimonials');

    if (cachedContent) setLandingContent(cachedContent);
    if (cachedCourses) setFeaturedCourses(cachedCourses);
    if (cachedTestimonials) setTestimonials(cachedTestimonials);

    const hasCache = Boolean(cachedContent || cachedCourses || cachedTestimonials);
    if (hasCache) setLoading(false);

    const fetchAll = async () => {
      try {
        const [contentRes, coursesRes, testimonialsRes] = await Promise.allSettled([
          landingApi.getContent(),
          landingApi.getFeaturedCourses(),
          landingApi.getTestimonials()
        ]);

        if (!isCancelled && contentRes.status === 'fulfilled' && contentRes.value.success && contentRes.value.data) {
          setLandingContent(contentRes.value.data);
          writeCache('landing_content', contentRes.value.data);
        } else if (!isCancelled && !cachedContent) {
          setError('Content unavailable, showing defaults.');
        }

        if (!isCancelled && coursesRes.status === 'fulfilled' && coursesRes.value.success && coursesRes.value.data) {
          const courses = coursesRes.value.data.courses || [];
          setFeaturedCourses(courses);
          writeCache('landing_courses', courses);
        }

        if (!isCancelled && testimonialsRes.status === 'fulfilled' && testimonialsRes.value.success && testimonialsRes.value.data) {
          const testimonialsData = testimonialsRes.value.data.testimonials || [];
          setTestimonials(testimonialsData);
          writeCache('landing_testimonials', testimonialsData);
        }
      } catch {
        if (!isCancelled && !cachedContent) {
          setError('Failed to load content, showing defaults.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchAll();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Scroll to hash section when arriving with #donation-section, etc.
  useEffect(() => {
    if (!location.hash) return;
    const targetId = location.hash.replace('#', '');
    // slight delay to ensure sections are mounted
    const timer = setTimeout(() => scrollToSection(targetId), 150);
    return () => clearTimeout(timer);
  }, [location.hash]);

  // (featured courses & testimonials now fetched in parallel above)

  // Intersection Observer for animations and active section
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -20% 0px', // Adjusted for better active section detection
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const sectionId = entry.target.getAttribute('data-section-id');
        if (sectionId) {
          if (entry.isIntersecting) {
            setVisibleSections((prev: Set<string>) => new Set([...prev, sectionId]));
            setActiveSection(sectionId);
          }
        }
      });
    }, observerOptions);

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    
    // Also observe hero
    if (heroRef.current) observer.observe(heroRef.current);

    return () => observer.disconnect();
  }, [featuredCourses, testimonials, landingContent]); // Re-run when content loads

  // Three.js Particle Network Effect (deferred, desktop-only)
  useEffect(() => {
    if (loading) return;
    if (!canvasRef.current || typeof window === 'undefined') return;
    const isMobile = window.innerWidth < 1024;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowCore = typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    if (isMobile || reducedMotion || lowCore) {
      canvasRef.current.style.display = 'none';
      return;
    }

    let cleanup: (() => void) | null = null;
    let cancelled = false;

    const schedule = (cb: () => void) => {
      const idle = (window as any).requestIdleCallback;
      if (idle) {
        return idle(cb, { timeout: 800 });
      }
      return window.setTimeout(cb, 300);
    };
    const cancelSchedule = (id: any) => {
      const cancelIdle = (window as any).cancelIdleCallback;
      if (cancelIdle) {
        cancelIdle(id);
      } else {
        clearTimeout(id);
      }
    };

    const jobId = schedule(async () => {
      if (cancelled || !canvasRef.current) return;
      const THREE = await import('three');
      if (!canvasRef.current || cancelled) return;

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

      const particleCount = 80;
      const particleOpacity = 0.4;

      const particlesGeometry = new THREE.BufferGeometry();
      const posArray = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 15;
      }
      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

      const material = new THREE.PointsMaterial({
        size: 0.03,
        color: 0x4f46e5,
        transparent: true,
        opacity: particleOpacity,
        blending: THREE.AdditiveBlending
      });
      const particlesMesh = new THREE.Points(particlesGeometry, material);
      scene.add(particlesMesh);

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xC07A1A,
        transparent: true,
        opacity: 0.12
      });
      const linesGeometry = new THREE.BufferGeometry();
      const linesMesh = new THREE.LineSegments(linesGeometry, lineMaterial);
      scene.add(linesMesh);

      camera.position.z = 4;

      let mouseX = 0;
      let mouseY = 0;
      let lastMove = 0;
      let animationFrameId: number | null = null;

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        particlesMesh.rotation.y += 0.00035;
        particlesMesh.rotation.x += 0.00012;
        linesMesh.rotation.y += 0.00035;
        linesMesh.rotation.x += 0.00012;
        particlesMesh.rotation.y += mouseX * 0.0003;
        particlesMesh.rotation.x += mouseY * 0.0003;
        linesMesh.rotation.y += mouseX * 0.0003;
        linesMesh.rotation.x += mouseY * 0.0003;
        renderer.render(scene, camera);
      };

      const start = () => {
        if (animationFrameId === null) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };
      const stop = () => {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      };

      start();

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      const handleMouseMove = (event: MouseEvent) => {
        const now = performance.now();
        if (now - lastMove < 50) return; // throttle
        lastMove = now;
        mouseX = event.clientX - window.innerWidth / 2;
        mouseY = event.clientY - window.innerHeight / 2;
      };

      const handleVisibility = () => {
        if (document.visibilityState === 'hidden') {
          stop();
        } else {
          start();
        }
      };

      window.addEventListener('resize', handleResize);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('visibilitychange', handleVisibility);

      cleanup = () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('visibilitychange', handleVisibility);
        stop();
        particlesGeometry.dispose();
        material.dispose();
        linesGeometry.dispose();
        lineMaterial.dispose();
        renderer.dispose();
      };
    });

    return () => {
      cancelled = true;
      cancelSchedule(jobId);
      if (cleanup) cleanup();
    };
  }, [loading]);

  return (
    <div className="relative min-h-screen bg-gray-50 overflow-x-hidden font-sans">
      {/* Lightweight top progress indicator while data loads */}
      {loading && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-1 bg-indigo-100">
            <div className="h-1 w-1/3 bg-[#27AE60] animate-pulse"></div>
          </div>
        </div>
      )}
      {/* Non-blocking error notice */}
      {error && (
        <div className="relative z-20 bg-amber-50 text-amber-800 text-sm px-4 py-3 border-b border-amber-100">
          {error} We’ll continue with default content; refresh to retry.
        </div>
      )}
      {/* 3D Background Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 opacity-60"
      />

      {/* Content */}
      <div className="relative z-10">
        <Header activeSection={activeSection} onScrollToSection={scrollToSection} />
        <Hero 
          ref={heroRef} 
          landingContent={landingContent} 
          onExplore={() => scrollToSection('featured-courses')}
        />
        
        <div className="relative bg-white/80 backdrop-blur-lg shadow-xl rounded-t-[3rem] -mt-20 pt-0 pb-10 border-t border-white/50 overflow-hidden">
          <Suspense fallback={<SectionSkeleton cards={3} />}>
            {loading ? (
              <SectionSkeleton cards={3} />
            ) : (
              <VideoSection 
                ref={(el) => (sectionRefs.current['video-section'] = el)}
                landingContent={landingContent} 
              />
            )}
          </Suspense>

          <Suspense fallback={<SectionSkeleton cards={3} />}>
            {loading ? (
              <SectionSkeleton cards={3} />
            ) : (
              <About 
                ref={(el) => (sectionRefs.current['about'] = el)}
                landingContent={landingContent}
                visibleSections={visibleSections}
              />
            )}
          </Suspense>
          
          <Suspense fallback={<SectionSkeleton cards={3} />}>
            {loading ? (
              <SectionSkeleton cards={3} />
            ) : (
              <FeaturedCourses 
                ref={(el) => (sectionRefs.current['featured-courses'] = el)}
                featuredCourses={featuredCourses}
                visibleSections={visibleSections}
              />
            )}
          </Suspense>
          
          <Suspense fallback={<SectionSkeleton cards={4} />}>
            {loading ? (
              <SectionSkeleton cards={4} />
            ) : (
              <HowItWorks 
                ref={(el) => (sectionRefs.current['how-it-works'] = el)}
                landingContent={landingContent}
                visibleSections={visibleSections}
              />
            )}
          </Suspense>
          
          <Suspense fallback={<SectionSkeleton cards={3} />}>
            {loading ? (
              <SectionSkeleton cards={3} />
            ) : (
              <Testimonials 
                ref={(el) => (sectionRefs.current['testimonials'] = el)}
                testimonials={testimonials}
                visibleSections={visibleSections}
              />
            )}
          </Suspense>
          
          <Suspense fallback={<SectionSkeleton cards={2} />}>
            {loading ? (
              <SectionSkeleton cards={2} />
            ) : (
              <DonationSection 
                ref={(el: HTMLDivElement | null) => (sectionRefs.current['donation-section'] = el)}
              />
            )}
          </Suspense>
          
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Landing;
