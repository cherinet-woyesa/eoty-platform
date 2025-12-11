import { forwardRef } from 'react';
import { Target, Users, Award, BookOpen } from 'lucide-react';
import { brandColors } from '@/theme/brand';

interface AboutProps {
  landingContent: any;
  visibleSections: Set<string>;
}

const About = forwardRef<HTMLElement, AboutProps>(({ landingContent, visibleSections }, ref) => {
  const isVisible = visibleSections.has('about');
  const content = landingContent?.about || {};
  
  console.log('About Component Render:', { 
    landingContent, 
    aboutContent: content, 
    title: content.title 
  });

  const features = content.features || [
    {
      icon: 'Target',
      title: 'Our Mission',
      description: 'Empowering Ethiopian Orthodox youths through faith-centered education that nurtures spiritual growth alongside academic excellence.'
    },
    {
      icon: 'Users',
      title: 'Our Community',
      description: 'Building a supportive community of faith-centered learners united in their spiritual journey and academic pursuits.'
    },
    {
      icon: 'Award',
      title: 'Our Excellence',
      description: 'Delivering high-quality education that meets international standards while honoring our Orthodox traditions.'
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
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      {/* Modern Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(#b8863b 1px, transparent 1px)',
        backgroundSize: '46px 46px'
      }} />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`text-center mb-20 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white rounded-full border border-[#2f3f82]/25 shadow-sm mb-6">
            <Target className="h-4 w-4" style={{ color: brandColors.primaryHex }} />
            <span className="text-sm font-bold text-[#2f3f82] uppercase tracking-wider">
              {content.badge || 'Our Mission'}
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#1c2753] mb-6 tracking-tight">
            {/* Debug: Display raw title if available, otherwise default */}
            {content.title ? content.title : 'Empowering Faith-Centered Learning'}
          </h2>
          
          <p className="text-xl text-slate-700 max-w-3xl mx-auto font-light leading-relaxed">
            {content.description || 'Nurturing spiritual growth and academic excellence through our comprehensive Orthodox education platform.'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature: any, index: number) => (
            <div
              key={index}
              className={`group relative bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/50 border border-indigo-50 hover:border-[#1c2753]/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${
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
