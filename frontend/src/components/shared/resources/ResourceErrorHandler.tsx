import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, FileQuestion, ShieldAlert, RefreshCw, Home, User } from 'lucide-react';

interface ResourceErrorHandlerProps {
  errorType: 'unsupported_file' | 'unauthorized' | 'ai_failure' | 'not_found' | 'generic';
  onRetry?: () => void;
  onGoHome?: () => void;
  onContactSupport?: () => void;
}

const ResourceErrorHandler: React.FC<ResourceErrorHandlerProps> = ({ 
  errorType, 
  onRetry,
  onGoHome,
  onContactSupport
}) => {
  const { t } = useTranslation();

  const getErrorContent = () => {
    switch (errorType) {
      case 'unsupported_file':
        return {
          icon: FileQuestion,
          title: t('resources.error_handler.unsupported_title'),
          message: t('resources.error_handler.unsupported_message'),
          actions: [
            { label: t('resources.error_handler.actions.download'), action: onRetry, primary: true },
            { label: t('resources.error_handler.actions.home'), action: onGoHome, primary: false }
          ]
        };
      case 'unauthorized':
        return {
          icon: ShieldAlert,
          title: t('resources.error_handler.unauthorized_title'),
          message: t('resources.error_handler.unauthorized_message'),
          actions: [
            { label: t('resources.error_handler.actions.request_access'), action: onContactSupport, primary: true },
            { label: t('resources.error_handler.actions.home'), action: onGoHome, primary: false }
          ]
        };
      case 'ai_failure':
        return {
          icon: AlertCircle,
          title: t('resources.error_handler.ai_failure_title'),
          message: t('resources.error_handler.ai_failure_message'),
          actions: [
            { label: t('resources.error_handler.actions.retry'), action: onRetry, primary: true },
            { label: t('resources.error_handler.actions.home'), action: onGoHome, primary: false }
          ]
        };
      case 'not_found':
        return {
          icon: FileQuestion,
          title: t('resources.error_handler.not_found_title'),
          message: t('resources.error_handler.not_found_message'),
          actions: [
            { label: t('resources.error_handler.actions.home'), action: onGoHome, primary: true },
            { label: t('resources.error_handler.actions.contact_support'), action: onContactSupport, primary: false }
          ]
        };
      default:
        return {
          icon: AlertCircle,
          title: t('resources.error_handler.generic_title'),
          message: t('resources.error_handler.generic_message'),
          actions: [
            { label: t('resources.error_handler.actions.retry'), action: onRetry, primary: true },
            { label: t('resources.error_handler.actions.home'), action: onGoHome, primary: false }
          ]
        };
    }
  };

  const content = getErrorContent();
  const Icon = content.icon;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <Icon className="h-8 w-8 text-red-500" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h2>
      <p className="text-gray-600 max-w-md mb-8">{content.message}</p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        {content.actions.map((action, index) => (
          action.action && (
            <button
              key={index}
              onClick={action.action}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                action.primary
                  ? 'bg-brand-primary text-white hover:bg-brand-primary-dark shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {action.label}
            </button>
          )
        ))}
      </div>
    </div>
  );
};

export default ResourceErrorHandler;