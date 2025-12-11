import React, { useState, useEffect } from 'react';
import AIChatInterface from './AIChatInterface';
import { Bot, X, MessageCircle, Sparkles, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const FloatingAIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [customContext, setCustomContext] = useState<any>(null);
  const location = useLocation();

  // Listen for custom event to open chat
  useEffect(() => {
    const handleOpenChat = (e: CustomEvent) => {
        setIsOpen(true);
        if (e.detail) {
            setCustomContext(e.detail);
        }
    };
    window.addEventListener('open-ai-chat' as any, handleOpenChat);
    return () => window.removeEventListener('open-ai-chat' as any, handleOpenChat);
  }, []);

  // Hide on specific pages if needed (e.g. if they have their own AI)
  // For now, we show it everywhere as requested.

  // Show tooltip after 3 seconds if not opened yet
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && !localStorage.getItem('ai-chat-seen')) {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 8000);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setShowTooltip(false);
    localStorage.setItem('ai-chat-seen', 'true');
  };

  return (
    <>
      {/* Enhanced Floating Button with Pulse Animation */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          {/* Flyer / Tooltip */}
          {showTooltip && (
            <div className="bg-white border border-stone-200 p-4 rounded-xl shadow-xl max-w-xs animate-fade-in mb-2 relative">
                <button 
                    onClick={() => setShowTooltip(false)}
                    className="absolute top-2 right-2 text-stone-400 hover:text-stone-600"
                >
                    <X className="h-3 w-3" />
                </button>
                <div className="flex items-start gap-3">
                    <div className="bg-[#27AE60]/10 p-2 rounded-lg">
                        <Sparkles className="h-5 w-5 text-[#27AE60]" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-stone-800 text-sm">AI Assistant</h4>
                        <p className="text-xs text-stone-600 mt-1">
                            I can help you find courses, answer questions, or guide your learning journey.
                        </p>
                        <button 
                            onClick={handleOpen}
                            className="mt-2 text-xs font-medium text-[#27AE60] hover:underline"
                        >
                            Start Chatting
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* Main Button */}
          <button
            onClick={handleOpen}
            className="relative w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center group"
            title="Open AI Assistant"
            aria-label="Open AI Assistant"
          >
            <Bot className="h-6 w-6 md:h-7 md:w-7 group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse border-2 border-white">
              <span className="sr-only">New</span>
            </div>
          </button>
        </div>
      )}

      {/* Enhanced Chat Interface */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat Container */}
          <div 
            className={`fixed bottom-0 right-0 md:bottom-6 md:right-6 z-50 shadow-2xl bg-white
                transition-all duration-300 ease-in-out
                ${isExpanded 
                    ? 'w-full h-full md:w-[800px] md:h-[80vh] md:rounded-2xl' 
                    : 'w-full h-[80vh] md:w-[400px] md:h-[600px] md:rounded-2xl rounded-t-2xl'
                }
                flex flex-col overflow-hidden border border-stone-200
            `}
          >
            {/* Custom Header */}
            <div className="bg-gradient-to-r from-[#27AE60] to-[#16A085] p-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base md:text-lg">AI Assistant</h3>
                    <p className="text-xs opacity-90">Faith-centered guidance</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors hidden md:block"
                        title={isExpanded ? "Minimize" : "Maximize"}
                    >
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        title="Close"
                    >
                        <ChevronDown className="h-5 w-5 md:hidden" />
                        <X className="h-5 w-5 hidden md:block" />
                    </button>
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 overflow-hidden bg-stone-50">
              <AIChatInterface 
                onClose={() => setIsOpen(false)} 
                className="h-full"
                context={customContext || {
                    path: location.pathname,
                    source: 'global-flyer'
                }}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default FloatingAIChat;