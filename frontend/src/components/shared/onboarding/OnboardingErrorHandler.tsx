import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';

interface OnboardingErrorHandlerProps {
  children: React.ReactNode;
}

const OnboardingErrorHandler: React.FC<OnboardingErrorHandlerProps> = ({ children }) => {
  const { t } = useTranslation();
  const { error, fetchProgress, dismissOnboarding } = useOnboarding();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);

  const handleRetry = () => {
    fetchProgress();
    setShowError(false);
  };

  const handleDismiss = () => {
    dismissOnboarding();
    setShowError(false);
  };

  if (showError) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 text-yellow-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">{t('onboarding.error.title')}</h3>
              </div>
              <button
                onClick={() => setShowError(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">{error}</p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleRetry}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-[color:#1e1b4b] hover:bg-[color:#312e81] text-white rounded-lg transition-colors shadow-sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.try_again')}
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                {t('onboarding.error.skip')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default OnboardingErrorHandler;