import React from 'react';
import { Home, Info, Navigation as NavigationIcon, BookOpen, Video, Star, Heart } from 'lucide-react';
import { brandColors } from '@/theme/brand';
import { useTranslation } from 'react-i18next';

interface NavigationProps {
  activeNavTab: string;
  onScrollToSection: (sectionId: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeNavTab, onScrollToSection }) => {
  const { t } = useTranslation();
  const navSections = [
    { id: 'hero', label: t('landing.nav.home'), icon: Home },
    { id: 'about', label: t('landing.nav.about'), icon: Info },
    { id: 'video-section', label: t('landing.nav.videos'), icon: Video },
    { id: 'featured-courses', label: t('landing.nav.courses'), icon: BookOpen },
    { id: 'how-it-works', label: t('landing.nav.how'), icon: NavigationIcon },
    { id: 'testimonials', label: t('landing.nav.testimonials'), icon: Star },
    { id: 'donation-section', label: t('landing.nav.donate'), icon: Heart }
  ];

  return (
    <div className="fixed top-20 sm:top-24 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <nav
        className="bg-white/90 backdrop-blur-md rounded-full shadow-lg border p-1.5 flex items-center space-x-1 pointer-events-auto animate-fade-in-down overflow-x-auto max-w-[calc(100%-1rem)] sm:max-w-fit"
        style={{ borderColor: `${brandColors.primaryHex}26`, scrollbarWidth: 'none' }}
      >
        {navSections.map((section) => {
          const IconComponent = section.icon;
          const isActive = activeNavTab === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => onScrollToSection(section.id)}
              className={`relative flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-all duration-300 whitespace-nowrap group ${
                isActive
                  ? 'text-white shadow-md'
                  : 'text-gray-700 hover:text-[color:var(--brand)] hover:bg-[color:var(--brand)]/10'
              }`}
              style={
                isActive
                  ? { backgroundColor: brandColors.primaryHex }
                  : { ['--brand' as any]: brandColors.primaryHex }
              }
            >
              <IconComponent className={`h-4 w-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className={`${isActive ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0 hidden md:block group-hover:opacity-100 group-hover:max-w-[100px]'} transition-all duration-300 overflow-hidden`}>
                {section.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Navigation;
