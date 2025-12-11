import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '@/i18n/config';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  textColor?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ textColor }) => {
  const { i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setOpen(false);
  };

  const toggleOpen = () => setOpen(prev => !prev);
  const close = () => setOpen(false);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTextColor = textColor || 'text-gray-700';
  const hoverBgColor = textColor?.includes('white') ? 'hover:bg-white/10' : 'hover:bg-gray-100';

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
        }}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${currentTextColor} ${hoverBgColor} transition-colors duration-150`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-5 w-5" />
        <span className="hidden md:inline">
          {supportedLanguages[i18n.language as keyof typeof supportedLanguages] || supportedLanguages.en}
        </span>
      </button>
      
      {open && (
        <div
          className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 z-50 border border-gray-200"
          role="listbox"
        >
          {Object.entries(supportedLanguages).map(([code, name]) => (
            <button
              key={code}
              onClick={() => changeLanguage(code)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors duration-150 ${
                i18n.language === code ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700'
              }`}
              role="option"
              aria-selected={i18n.language === code}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;