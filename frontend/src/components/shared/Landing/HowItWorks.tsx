import React, { forwardRef } from 'react';
import { User, BookOpen, PlayCircle, Award, ArrowRight } from 'lucide-react';

interface HowItWorksProps {
  landingContent: any;
  visibleSections: Set<string>;
}

const HowItWorks = forwardRef<HTMLElement, HowItWorksProps>(({ landingContent, visibleSections }, ref) => {
  const renderHowItWorksStep = (item: any, index: number) => {
    const iconMap: any = { User, BookOpen, PlayCircle, Award };
    const IconComponent = iconMap[item.icon] || User;
    const colors = ['#1c2753', '#b8863b', '#243065', '#c9964d'];
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
        <div className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-2xl p-8 rounded-3xl shadow-xl hover:shadow-3xl hover:shadow-gray-200/50 transition-all duration-500 border border-gray-200/50 transform hover:-translate-y-3 hover:scale-[1.02] h-full cursor-pointer relative overflow-hidden group/card">
          {/* Animated background gradient on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 rounded-3xl"
            style={{ background: `linear-gradient(135deg, ${color}12, transparent)` }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm transition-all group-hover/card:scale-110 group-hover/card:rotate-3 shadow-lg"
                style={{
                  backgroundColor: `${color}18`,
                  borderColor: `${color}30`,
                  borderWidth: '2px',
                  boxShadow: `0 8px 32px ${color}25`
                }}
              >
                <IconComponent className="h-8 w-8 transition-transform group-hover/card:scale-110" style={{ color: color }} />
              </div>
              <span className="text-4xl font-bold text-gray-300 group-hover/card:text-gray-400 transition-colors">{item.step}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4 transition-colors group-hover/card:text-gray-800">{item.title}</h3>
            <p className="text-gray-700 leading-relaxed mb-6 text-base">{item.description}</p>

            {/* Feature list */}
            <div className="space-y-3 pt-4 border-t border-gray-200/50">
              {item.features.map((feature: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-3 text-sm group/feature">
                  <div
                    className="w-2 h-2 rounded-full transition-all duration-300 group-hover/feature:scale-125"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-gray-600 group-hover/feature:text-gray-800 transition-colors">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {index < 3 && (
          <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
            <div className="relative">
              <ArrowRight className="h-8 w-8 text-slate-400 animate-pulse" />
              <div className="absolute inset-0 bg-[#b8863b]/20 rounded-full blur-md animate-ping" style={{ animationDuration: '2s' }} />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      ref={ref}
      id="how-it-works"
      data-section-id="how-it-works"
      className={`relative py-32 overflow-hidden z-10 transition-all duration-1000 ${
        visibleSections.has('how-it-works') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(245,246,250,0.9) 50%, rgba(241,245,249,0.86) 100%)'
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 right-20 w-80 h-80 bg-gradient-to-br from-[#2f3f82]/8 to-[#3a4c94]/6 rounded-full blur-3xl animate-float" style={{ animationDuration: '9s' }} />
        <div className="absolute bottom-32 left-20 w-72 h-72 bg-gradient-to-br from-[#cfa15a]/8 to-[#d8b26d]/6 rounded-full blur-3xl animate-float" style={{ animationDuration: '11s', animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-br from-[#2f3f82]/6 to-[#cfa15a]/5 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '7s' }} />
      </div>

      <div className="w-full px-4 lg:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className={`inline-flex items-center space-x-3 px-6 py-3 bg-white rounded-full border border-[#1c2753]/20 backdrop-blur-xl shadow-lg mb-8 transition-all duration-700 delay-200 ${
              visibleSections.has('how-it-works') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}>
              <PlayCircle className="h-5 w-5 text-[#1c2753] animate-pulse" />
              <span className="text-sm font-semibold text-[#1c2753]">How It Works</span>
            </div>
            <h2 className={`text-4xl md:text-5xl font-bold text-gray-900 mb-6 transition-all duration-700 delay-300 ${
              visibleSections.has('how-it-works') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}>
              Your Learning Journey in 4 Steps
            </h2>
            <p className={`text-xl text-gray-700 max-w-3xl mx-auto transition-all duration-700 delay-400 ${
              visibleSections.has('how-it-works') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}>
              Simple, intuitive steps to begin your faith-centered learning experience
            </p>
          </div>

          <div className="relative grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Connecting Line for Large Screens */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent -translate-y-1/2 z-0 dashed-line"></div>
            
            {landingContent['how-it-works']?.steps?.map((step: any, index: number) =>
              renderHowItWorksStep(step, index)
            ) || [
              { step: '01', title: 'Sign Up', description: 'Create your account and join our community', icon: 'User', features: ['Free registration', 'Profile setup', 'Community access'] },
              { step: '02', title: 'Choose Course', description: 'Browse and select from our curated courses', icon: 'BookOpen', features: ['Diverse topics', 'Expert instructors', 'Flexible learning'] },
              { step: '03', title: 'Start Learning', description: 'Begin your journey with interactive content', icon: 'PlayCircle', features: ['Video lessons', 'Interactive quizzes', 'Progress tracking'] },
              { step: '04', title: 'Get Certified', description: 'Complete courses and earn certificates', icon: 'Award', features: ['Official certificates', 'Achievement badges', 'Recognition'] }
            ].map((step, index) => renderHowItWorksStep(step, index))}
          </div>
        </div>
      </div>
    </section>
  );
});

export default HowItWorks;
