import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { onboardingApi } from '@/services/api/onboarding';

interface ContextualHelpProps {
  component: string;
  page?: string;
  audience?: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
}

const ContextualHelp: React.FC<ContextualHelpProps> = ({ 
  component, 
  page, 
  audience = 'all',
  position = 'right',
  children 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [helpContent, setHelpContent] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFaqs, setShowFaqs] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchHelpContent = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await onboardingApi.getHelp({ component, page, audience });
      if (response.success) {
        if (response.data.help) {
          setHelpContent(response.data.help.content);
          setFaqs(response.data.faqs || []);
        } else {
          setHelpContent('No help content available for this component.');
          setFaqs([]);
        }
      } else {
        setError('Failed to load help content.');
      }
    } catch (err: any) {
      console.error('Failed to fetch help content:', err);
      setError(err.message || 'An error occurred while fetching help content.');
    } finally {
      setLoading(false);
      setIsOpen(true);
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top': return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'right': return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      case 'bottom': return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left': return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      default: return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
    }
  };

  return (
    <div className="relative inline-block" ref={tooltipRef}>
      <div onClick={fetchHelpContent} className="inline-block cursor-pointer transition-transform hover:scale-105 active:scale-95">
        {children}
      </div>
      
      {isOpen && (
        <div 
          className={`
            absolute z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-0 overflow-hidden animate-in fade-in zoom-in duration-200
            ${getPositionClasses()}
          `}
        >
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <h4 className="font-semibold text-gray-900 flex items-center text-sm">
              <div className="bg-blue-100 p-1 rounded-md mr-2">
                <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
              </div>
              Help & Resources
            </h4>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-gray-400">Loading content...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <div className="text-red-500 text-sm font-medium mb-1">Unable to load help</div>
              <div className="text-xs text-gray-500">{error}</div>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="p-4">
                {helpContent ? (
                  <div className="prose prose-sm max-w-none text-gray-600 prose-p:leading-relaxed prose-a:text-blue-600 hover:prose-a:text-blue-700" dangerouslySetInnerHTML={{ __html: helpContent }} />
                ) : (
                  <p className="text-sm text-gray-500 italic text-center py-2">No specific help content available.</p>
                )}
              </div>

              {/* FAQ Integration */}
              {faqs.length > 0 && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  <button
                    onClick={() => setShowFaqs(!showFaqs)}
                    className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex items-center">
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] mr-2 font-bold">FAQ</span>
                      Related Questions
                    </span>
                    {showFaqs ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
                  </button>

                  {showFaqs && (
                    <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      {faqs.map((faq: any, index: number) => (
                        <div key={index} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                          <div className="font-medium text-gray-900 text-xs mb-1">{faq.question}</div>
                          <div className="text-gray-600 text-xs leading-relaxed">{faq.answer}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContextualHelp;