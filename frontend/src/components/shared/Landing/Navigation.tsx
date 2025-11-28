import React from 'react';
import { Home, Info, Navigation as NavigationIcon, BookOpen, Video, Star } from 'lucide-react';

interface NavigationProps {
  activeNavTab: string;
  onScrollToSection: (sectionId: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeNavTab, onScrollToSection }) => {
  const navSections = [
    { id: 'hero', label: 'Home', icon: Home },
    { id: 'about', label: 'About', icon: Info },
    { id: 'video-section', label: 'Videos', icon: Video },
    { id: 'featured-courses', label: 'Courses', icon: BookOpen },
    { id: 'how-it-works', label: 'How It Works', icon: NavigationIcon },
    { id: 'testimonials', label: 'Testimonials', icon: Star }
  ];

  return (
    <div className="fixed top-24 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <nav className="bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-white/50 p-1.5 flex items-center space-x-1 pointer-events-auto animate-fade-in-down">
        {navSections.map((section) => {
          const IconComponent = section.icon;
          const isActive = activeNavTab === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => onScrollToSection(section.id)}
              className={`relative flex items-center space-x-2 px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 whitespace-nowrap group ${
                isActive
                  ? 'text-white bg-[#27AE60] shadow-md'
                  : 'text-gray-600 hover:text-[#27AE60] hover:bg-[#27AE60]/10'
              }`}
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
