import React, { useState } from 'react';
import { AlertCircle, RefreshCw, MessageCircle, BookOpen, Search } from 'lucide-react';

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
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">AI Summary Temporarily Unavailable</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              The AI summarization service is currently unavailable. This could be due to high demand or temporary maintenance.
            </p>
          </div>
          
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-yellow-800 uppercase tracking-wide">Alternative Options</h4>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex flex-col items-center justify-center p-3 bg-white border border-yellow-300 rounded-md hover:bg-yellow-100 disabled:opacity-50"
              >
                {isRetrying ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500 mb-1"></div>
                ) : (
                  <RefreshCw className="h-5 w-5 text-yellow-600 mb-1" />
                )}
                <span className="text-xs font-medium text-yellow-700">Retry</span>
              </button>
              
              <button
                onClick={onAskQuestion}
                className="flex flex-col items-center justify-center p-3 bg-white border border-yellow-300 rounded-md hover:bg-yellow-100"
              >
                <MessageCircle className="h-5 w-5 text-yellow-600 mb-1" />
                <span className="text-xs font-medium text-yellow-700">Ask AI</span>
              </button>
              
              <button
                onClick={onManualSummary}
                className="flex flex-col items-center justify-center p-3 bg-white border border-yellow-300 rounded-md hover:bg-yellow-100"
              >
                <BookOpen className="h-5 w-5 text-yellow-600 mb-1" />
                <span className="text-xs font-medium text-yellow-700">Manual Review</span>
              </button>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-xs text-yellow-600">
              You can also try searching for related resources or manually review the document content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFallbackHandler;