import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

interface HeroProps {
  landingContent: any;
  onStart?: () => void;
  onExplore?: () => void;
}

const Hero = forwardRef<HTMLElement, HeroProps>(({ landingContent, onStart, onExplore }, ref) => {
  const { isAuthenticated, getRoleDashboard } = useAuth();
  const { t } = useTranslation();
  const handleStartClick = (e: React.MouseEvent) => {
    if (onStart) {
      e.preventDefault();
      onStart();
    }
  };
  const handleExploreClick = (e: React.MouseEvent) => {
    if (onExplore) {
      e.preventDefault();
      onExplore();
    }
  };

  return (
    <section ref={ref} id="hero" data-section-id="hero" className="relative min-h-screen flex items-center justify-center pt-20 z-10 overflow-hidden">
      {/* Background Image with Warm Sepia Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/eoc.jpg"
          alt="Background"
          loading="lazy"
          decoding="async"
          fetchpriority="high"
          sizes="100vw"
          width={1920}
          height={1080}
          className="w-full h-full object-cover"
          style={{ filter: 'sepia(0.45) saturate(1.15) brightness(0.95)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-[#3b2b1b]/65 to-black/75 mix-blend-multiply" />
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg mx-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-100"></span>
            </span>
            <span className="text-sm font-medium text-white tracking-wide">
                  {landingContent.hero?.badge || t('landing.hero.badge')}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-tight tracking-tight text-white drop-shadow-xl">
            <span className="block mb-2 text-white/95">
              {landingContent.hero?.title || t('landing.hero.title1')}
            </span>
            <span className="block text-white/90">
              {landingContent.hero?.titleGradient || t('landing.hero.title2')}
            </span>
          </h1>

          {/* Description */}
          <p className="text-xl md:text-2xl text-slate-100 leading-relaxed max-w-3xl mx-auto font-light drop-shadow-md">
            {landingContent.hero?.description || t('landing.hero.description')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  onClick={handleStartClick}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full font-bold text-lg shadow-lg bg-indigo-900 text-white border border-indigo-800 hover:bg-indigo-800 transition-all duration-200"
                >
                  {t('landing.hero.start_journey')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/courses"
                  onClick={handleExploreClick}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full font-bold text-lg bg-white text-indigo-900 border border-indigo-200 hover:border-indigo-400 transition-all duration-200"
                >
                  {t('landing.hero.explore')}
                </Link>
              </>
            ) : (
              <Link
                to={getRoleDashboard()}
                className="inline-flex items-center justify-center px-8 py-4 rounded-full font-bold text-lg shadow-lg bg-indigo-900 text-white border border-indigo-800 hover:bg-indigo-800 transition-all duration-200"
              >
                {t('landing.hero.dashboard')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

export default Hero;
