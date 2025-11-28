import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface HeroProps {
  landingContent: any;
}

const Hero = forwardRef<HTMLElement, HeroProps>(({ landingContent }, ref) => {
  const { isAuthenticated, getRoleDashboard } = useAuth();

  return (
    <section ref={ref} id="hero" data-section-id="hero" className="relative min-h-screen flex items-center justify-center pt-20 z-10 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/eoc.jpg" 
          alt="Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 backdrop-blur-[2px]" />
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg mx-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#27AE60] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#27AE60]"></span>
            </span>
            <span className="text-sm font-medium text-white tracking-wide">
              {landingContent.hero?.badge || 'For Ethiopian Orthodox Youths'}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg">
            <span className="block mb-2">
              {landingContent.hero?.title || 'Transform Your'}
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#2ECC71] via-[#27AE60] to-[#16A085]">
              {landingContent.hero?.titleGradient || 'Learning Journey'}
            </span>
          </h1>

          {/* Description */}
          <p className="text-xl md:text-2xl text-gray-200 leading-relaxed max-w-3xl mx-auto font-light drop-shadow-md">
            {landingContent.hero?.description || 'Join our faith-centered learning community. Access courses, track progress, and grow in your spiritual journey with expert guidance.'}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#27AE60] text-white rounded-full overflow-hidden transition-all duration-300 shadow-lg shadow-[#27AE60]/30 hover:shadow-[#27AE60]/50 hover:-translate-y-1 hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#2ECC71] to-[#27AE60] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative font-bold text-lg flex items-center">
                    Start Learning Free
                    <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-full border border-white/30 hover:bg-white/20 transition-all duration-300 font-bold text-lg shadow-lg hover:-translate-y-1 hover:scale-105"
                >
                  Sign In
                </Link>
              </>
            ) : (
              <Link
                to={getRoleDashboard()}
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#27AE60] text-white rounded-full overflow-hidden transition-all duration-300 shadow-lg shadow-[#27AE60]/30 hover:shadow-[#27AE60]/50 hover:-translate-y-1 hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#2ECC71] to-[#27AE60] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative font-bold text-lg flex items-center">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

export default Hero;
