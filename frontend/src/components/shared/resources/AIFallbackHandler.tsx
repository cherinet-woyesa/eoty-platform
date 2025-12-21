import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw, MessageCircle, BookOpen } from 'lucide-react';

interface AIFallbackHandlerProps {
  resourceId: number;
  onRetry: () => void;
  onAskQuestion: () => void;
  onManualSummary: () => void;
}

const AIFallbackHandler: React.FC<AIFallbackHandlerProps> = ({ 
  resourceId,
  onRetry,
  onAskQuestion,
  onManualSummary
}) => {
  const { t } = useTranslation();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-bold text-yellow-800">{t('resources.ai_fallback.title')}</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>{t('resources.ai_fallback.description')}</p>
          </div>
          
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-yellow-800 uppercase tracking-wide">{t('resources.ai_fallback.alternatives')}</h4>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex flex-col items-center justify-center p-3 bg-white border border-yellow-300 rounded-lg hover:bg-yellow-100 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isRetrying ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500 mb-1"></div>
                ) : (
                  <RefreshCw className="h-5 w-5 text-yellow-600 mb-1" />
                )}
                <span className="text-xs font-medium text-yellow-700">{t('resources.ai_fallback.retry')}</span>
              </button>
              
              <button
                onClick={onAskQuestion}
                className="flex flex-col items-center justify-center p-3 bg-white border border-yellow-300 rounded-lg hover:bg-yellow-100 transition-colors shadow-sm"
              >
                <MessageCircle className="h-5 w-5 text-yellow-600 mb-1" />
                <span className="text-xs font-medium text-yellow-700">{t('resources.ai_fallback.ask_ai')}</span>
              </button>
              
              <button
                onClick={onManualSummary}
                className="flex flex-col items-center justify-center p-3 bg-white border border-yellow-300 rounded-lg hover:bg-yellow-100 transition-colors shadow-sm"
              >
                <BookOpen className="h-5 w-5 text-yellow-600 mb-1" />
                <span className="text-xs font-medium text-yellow-700">{t('resources.ai_fallback.manual_review')}</span>
              </button>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-xs text-yellow-600 italic">
              {t('resources.ai_fallback.footer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFallbackHandler;