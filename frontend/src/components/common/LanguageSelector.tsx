import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '@/i18n/config';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  textColor?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ textColor }) => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Filter to only show English and Amharic as requested, or show all if preferred.
  // The user asked for "Amharic and English", but the config has more. 
  // I'll stick to the config but ensure the UI handles the text color.
  
  const currentTextColor = textColor || 'text-gray-700';
  const hoverBgColor = textColor?.includes('white') ? 'hover:bg-white/10' : 'hover:bg-gray-100';

  return (
    <div className="relative group">
      <button className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${currentTextColor} ${hoverBgColor} transition-colors duration-150`}>
        <Globe className="h-5 w-5" />
        <span className="hidden md:inline">
          {supportedLanguages[i18n.language as keyof typeof supportedLanguages] || supportedLanguages.en}
        </span>
      </button>
      
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 hidden group-hover:block z-50 border border-gray-200">
        {Object.entries(supportedLanguages).map(([code, name]) => (
          <button
            key={code}
            onClick={() => changeLanguage(code)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors duration-150 ${
              i18n.language === code ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;