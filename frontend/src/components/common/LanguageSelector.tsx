import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '@/i18n/config';
import { Globe } from 'lucide-react';

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-150">
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