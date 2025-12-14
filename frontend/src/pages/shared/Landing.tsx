import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useLocation } from 'react-router-dom';
import { landingApi } from '@/services/api/landing';
import Header from '@/components/shared/Landing/Header';
import Hero from '@/components/shared/Landing/Hero';
import About from '@/components/shared/Landing/About';
import HowItWorks from '@/components/shared/Landing/HowItWorks';
import FeaturedCourses from '@/components/shared/Landing/FeaturedCourses';
import VideoSection from '@/components/shared/Landing/VideoSection';
import Testimonials from '@/components/shared/Landing/Testimonials';
import DonationSection from '@/components/shared/Landing/DonationSection';
import Footer from '@/components/shared/Landing/Footer';

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

  // Fetch landing page content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await landingApi.getContent();
        console.log('Landing Page Content Response:', response);
        if (response.success && response.data) {
          console.log('Updating landing content state:', response.data);
          setLandingContent(response.data);
        } else {
          console.warn('Landing content response missing success or data:', response);
        }
      } catch (err) {
        console.error('Failed to fetch landing content:', err);
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  // Scroll to hash section when arriving with #donation-section, etc.
  useEffect(() => {
    if (!location.hash) return;
    const targetId = location.hash.replace('#', '');
    // slight delay to ensure sections are mounted
    const timer = setTimeout(() => scrollToSection(targetId), 150);
    return () => clearTimeout(timer);
  }, [location.hash]);

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
      }
    };
    fetchFeaturedCourses();
  }, []);

  // Fetch testimonials
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await landingApi.getTestimonials();
        if (response.success && response.data) {
          setTestimonials(response.data.testimonials || []);
        }
      } catch (error) {
        console.error('Failed to fetch testimonials:', error);
      }
    };
    fetchTestimonials();
  }, []);

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

  // Three.js Particle Network Effect (reduced on low-power)
  useEffect(() => {
    if (!canvasRef.current) return;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowCore = typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    if (isMobile || reducedMotion || lowCore) {
      // Skip heavy effect on low-power/mobile/reduced motion
      canvasRef.current.style.display = 'none';
      return;
    }

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const particleCount = 120;
    const particleOpacity = 0.5;

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
      opacity: 0.15
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
      particlesMesh.rotation.y += 0.0004;
      particlesMesh.rotation.x += 0.00015;
      linesMesh.rotation.y += 0.0004;
      linesMesh.rotation.x += 0.00015;
      particlesMesh.rotation.y += mouseX * 0.0004;
      particlesMesh.rotation.x += mouseY * 0.0004;
      linesMesh.rotation.y += mouseX * 0.0004;
      linesMesh.rotation.x += mouseY * 0.0004;
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

    return () => {
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
  }, []);

  if (loading) {
    return (
      <div className="relative min-h-screen bg-gray-50 overflow-x-hidden font-sans">
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#27AE60]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-gray-50 overflow-x-hidden font-sans">
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">Please try refreshing the page</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#219150] transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 overflow-x-hidden font-sans">
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
          onDonate={() => scrollToSection('donation-section')} 
          onExplore={() => scrollToSection('featured-courses')}
        />
        
        <div className="relative bg-white/80 backdrop-blur-lg shadow-xl rounded-t-[3rem] -mt-20 pt-0 pb-10 border-t border-white/50 overflow-hidden">
          <VideoSection 
            ref={(el) => (sectionRefs.current['video-section'] = el)}
            landingContent={landingContent} 
          />

          <About 
            ref={(el) => (sectionRefs.current['about'] = el)}
            landingContent={landingContent}
            visibleSections={visibleSections}
          />
          
          <FeaturedCourses 
            ref={(el) => (sectionRefs.current['featured-courses'] = el)}
            featuredCourses={featuredCourses}
            visibleSections={visibleSections}
          />
          
          <HowItWorks 
            ref={(el) => (sectionRefs.current['how-it-works'] = el)}
            landingContent={landingContent}
            visibleSections={visibleSections}
          />
          
          <Testimonials 
            ref={(el) => (sectionRefs.current['testimonials'] = el)}
            testimonials={testimonials}
            visibleSections={visibleSections}
          />
          
          <DonationSection 
            ref={(el: HTMLDivElement | null) => (sectionRefs.current['donation-section'] = el)}
          />
          
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Landing;
