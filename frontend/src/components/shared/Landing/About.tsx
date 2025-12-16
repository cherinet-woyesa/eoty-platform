import { forwardRef } from 'react';
import { Target, Users, Award, BookOpen } from 'lucide-react';
import { brandColors } from '@/theme/brand';
import { useTranslation } from 'react-i18next';

interface AboutProps {
  landingContent: any;
  visibleSections: Set<string>;
}

const About = forwardRef<HTMLElement, AboutProps>(({ landingContent, visibleSections }, ref) => {
  const { t } = useTranslation();
  const isVisible = visibleSections.has('about');
  const content = landingContent?.about || {};
  
  const features = content.features || [
    {
      icon: 'Target',
      title: t('landing.about.feature_mission.title'),
      description: t('landing.about.feature_mission.desc')
    },
    {
      icon: 'Users',
      title: t('landing.about.feature_community.title'),
      description: t('landing.about.feature_community.desc')
    },
    {
      icon: 'Award',
      title: t('landing.about.feature_excellence.title'),
      description: t('landing.about.feature_excellence.desc')
    }
  ];

  const getIcon = (iconName: string) => {
    const primary = brandColors.primaryHex;
    const accent = brandColors.accentHex;
    switch (iconName) {
      case 'Target': return <Target className="h-8 w-8" style={{ color: primary }} />;
      case 'Users': return <Users className="h-8 w-8" style={{ color: primary }} />;
      case 'Award': return <Award className="h-8 w-8" style={{ color: accent }} />;
      default: return <BookOpen className="h-8 w-8" style={{ color: primary }} />;
    }
  };

  return (
    <section
      ref={ref}
      id="about"
      data-section-id="about"
      className="relative py-16 md:py-24 lg:py-32 overflow-hidden"
    >
      {/* Modern Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(#b8863b 1px, transparent 1px)',
        backgroundSize: '46px 46px'
      }} />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`text-center mb-14 md:mb-20 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white rounded-full border border-[#2f3f82]/25 shadow-sm mb-6">
            <Target className="h-4 w-4" style={{ color: brandColors.primaryHex }} />
            <span className="text-sm font-bold text-[#2f3f82] uppercase tracking-wider">
              {content.badge || t('landing.about.badge')}
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1c2753] mb-4 sm:mb-6 tracking-tight">
            {/* Debug: Display raw title if available, otherwise default */}
            {content.title ? content.title : t('landing.about.title')}
          </h2>
          
          <p className="text-lg sm:text-xl text-slate-700 max-w-3xl mx-auto font-light leading-relaxed px-2 sm:px-0">
            {content.description || t('landing.about.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-12">
          {features.map((feature: any, index: number) => (
            <div
              key={index}
              className={`group relative bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-gray-200/50 border border-indigo-50 hover:border-[#1c2753]/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Hover Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1c2753]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white group-hover:shadow-lg transition-all duration-300">
                  {getIcon(feature.icon)}
                </div>
                
                <h3 className="text-2xl font-bold text-[#1c2753] mb-4 group-hover:text-[#b8863b] transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default About;
