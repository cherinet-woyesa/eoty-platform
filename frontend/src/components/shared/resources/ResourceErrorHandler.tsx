import React from 'react';
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
  const getErrorContent = () => {
    switch (errorType) {
      case 'unsupported_file':
        return {
          icon: FileQuestion,
          title: 'Unsupported File Type',
          message: 'This file type is not currently supported for viewing in the browser. You can download the file to view it on your device.',
          actions: [
            { label: 'Download File', action: onRetry, primary: true },
            { label: 'Go Home', action: onGoHome, primary: false }
          ]
        };
      case 'unauthorized':
        return {
          icon: ShieldAlert,
          title: 'Access Denied',
          message: 'You do not have permission to access this resource. Please contact your administrator if you believe this is an error.',
          actions: [
            { label: 'Request Access', action: onContactSupport, primary: true },
            { label: 'Go Home', action: onGoHome, primary: false }
          ]
        };
      case 'ai_failure':
        return {
          icon: AlertCircle,
          title: 'AI Service Unavailable',
          message: 'The AI summarization service is temporarily unavailable. Please try again later or contact support if the problem persists.',
          actions: [
            { label: 'Retry', action: onRetry, primary: true },
            { label: 'Go Home', action: onGoHome, primary: false }
          ]
        };
      case 'not_found':
        return {
          icon: AlertCircle,
          title: 'Resource Not Found',
          message: 'The requested resource could not be found. It may have been removed or you may not have the correct permissions to access it.',
          actions: [
            { label: 'Go Home', action: onGoHome, primary: true },
            { label: 'Contact Support', action: onContactSupport, primary: false }
          ]
        };
      default:
        return {
          icon: AlertCircle,
          title: 'Something Went Wrong',
          message: 'An unexpected error occurred while processing your request. Please try again or contact support if the problem persists.',
          actions: [
            { label: 'Retry', action: onRetry, primary: true },
            { label: 'Go Home', action: onGoHome, primary: false }
          ]
        };
    }
  };

  const { icon: Icon, title, message, actions } = getErrorContent();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <Icon className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">{title}</h2>
            <p className="mt-2 text-gray-600">{message}</p>
          </div>
          
          <div className="mt-6">
            <div className="flex flex-col space-y-3">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${
                    action.primary
                      ? 'text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                      : 'text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onGoHome}
              className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <Home className="h-4 w-4 mr-1" />
              Return to Dashboard
            </button>
            <button
              onClick={onContactSupport}
              className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <User className="h-4 w-4 mr-1" />
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceErrorHandler;