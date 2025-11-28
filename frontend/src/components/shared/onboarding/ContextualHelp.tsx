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
      <div onClick={fetchHelpContent} className="inline-block cursor-pointer">
        {children}
      </div>
      
      {isOpen && (
        <div 
          className={`
            absolute z-50 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4
            ${getPositionClasses()}
          `}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-gray-900 flex items-center">
              <HelpCircle className="h-4 w-4 mr-2 text-blue-500" />
              Help
            </h4>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : (
            <div className="text-gray-700 text-sm max-h-60 overflow-y-auto">
              {helpContent ? (
                <div dangerouslySetInnerHTML={{ __html: helpContent }} />
              ) : (
                <p>No help content available.</p>
              )}

              {/* FAQ Integration (REQUIREMENT: FAQ integration) */}
              {faqs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setShowFaqs(!showFaqs)}
                    className="flex items-center text-xs font-medium text-[#27AE60] hover:text-[#16A085] mb-2"
                  >
                    {showFaqs ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                    Related FAQs ({faqs.length})
                  </button>

                  {showFaqs && (
                    <div className="space-y-2">
                      {faqs.map((faq: any, index: number) => (
                        <div key={index} className="text-xs">
                          <div className="font-medium text-gray-800">{faq.question}</div>
                          <div className="text-gray-600 mt-1">{faq.answer}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextualHelp;