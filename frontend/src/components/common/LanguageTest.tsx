import * as React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageTest: React.FC = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">{t('common.welcome')}</h2>
      <p className="mb-4">{t('dashboard.teacher.title')}</p>
      
      <div className="flex space-x-2">
        <button 
          onClick={() => changeLanguage('en')}
          className={`px-4 py-2 rounded-lg ${i18n.language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          English
        </button>
        <button 
          onClick={() => changeLanguage('am')}
          className={`px-4 py-2 rounded-lg ${i18n.language === 'am' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          አማርኛ
        </button>
        <button 
          onClick={() => changeLanguage('ti')}
          className={`px-4 py-2 rounded-lg ${i18n.language === 'ti' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          ትግርኛ
        </button>
        <button 
          onClick={() => changeLanguage('om')}
          className={`px-4 py-2 rounded-lg ${i18n.language === 'om' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Oromoo
        </button>
        <button 
          onClick={() => changeLanguage('so')}
          className={`px-4 py-2 rounded-lg ${i18n.language === 'so' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Soomaali
        </button>
      </div>
    </div>
  );
};

export default LanguageTest;