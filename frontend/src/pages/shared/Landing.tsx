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

const fetchWithRetry = async <T,>(fn: () => Promise<T>, retries = 1, delayMs = 250): Promise<T> => {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries) throw error;
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
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
          fetchWithRetry(() => landingApi.getContent(), 2, 300),
          fetchWithRetry(() => landingApi.getFeaturedCourses(), 2, 300),
          fetchWithRetry(() => landingApi.getTestimonials(), 2, 300)
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

  // Respect prefers-reduced-motion for animations
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  // (featured courses & testimonials now fetched in parallel above)

  // Intersection Observer for animations and active section
  useEffect(() => {
    if (loading) return;

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -20% 0px', // Adjusted for better active section detection
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const sectionId = entry.target.getAttribute('data-section-id');
        if (!sectionId || !entry.isIntersecting) return;

        setVisibleSections((prev: Set<string>) => {
          if (prev.has(sectionId)) return prev;
          const next = new Set(prev);
          next.add(sectionId);
          return next;
        });

        setActiveSection((prev) => (prev === sectionId ? prev : sectionId));
      });
    }, observerOptions);

    const observed = [
      heroRef.current,
      ...Object.values(sectionRefs.current)
    ].filter(Boolean) as HTMLElement[];

    observed.forEach((ref) => observer.observe(ref));

    return () => observer.disconnect();
  }, [loading]); // Start observing once content is ready

  // Lightweight CSS gradient background - no heavy dependencies needed

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
      {/* Lightweight CSS Gradient Background */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-amber-50/40" />
        <div
          className={`absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl ${
            prefersReducedMotion ? '' : 'animate-float'
          }`}
          style={prefersReducedMotion ? undefined : { animationDuration: '15s' }}
        />
        <div
          className={`absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl ${
            prefersReducedMotion ? '' : 'animate-float'
          }`}
          style={prefersReducedMotion ? undefined : { animationDuration: '20s', animationDelay: '5s' }}
        />
      </div>

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
