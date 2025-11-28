import React, { useState, useEffect } from 'react';
import AIChatInterface from './AIChatInterface';
import { Bot, X, MessageCircle, Sparkles } from 'lucide-react';

const FloatingAIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Show tooltip after 3 seconds if not opened yet
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && !localStorage.getItem('ai-chat-seen')) {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 5000);
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
        <div className="fixed bottom-6 right-6 z-50">
          {/* Pulse Ring Animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-full animate-ping opacity-20"></div>

          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute bottom-full right-0 mb-3 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap animate-fade-in">
              👋 Need help? Ask our AI Assistant!
              <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900"></div>
            </div>
          )}

          {/* Main Button */}
          <button
            onClick={handleOpen}
            className="relative w-16 h-16 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 flex flex-col items-center justify-center group"
            title="Open AI Assistant - Ask questions about the platform"
            aria-label="Open AI Assistant"
          >
            <Bot className="h-7 w-7 group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <Sparkles className="h-2 w-2 text-white" />
            </div>
          </button>

          {/* Welcome Text */}
          <div className="absolute right-full mr-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
              Ask me anything! 🤖
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Chat Interface */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat Container */}
          <div className="fixed bottom-6 right-6 w-96 h-[600px] z-50 shadow-2xl rounded-2xl overflow-hidden animate-fade-in-up">
            {/* Custom Header */}
            <div className="bg-gradient-to-r from-[#27AE60] to-[#16A085] p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">AI Assistant</h3>
                    <p className="text-sm opacity-90">Faith-centered guidance</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Close AI Assistant"
                  aria-label="Close AI Assistant"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="h-[calc(100%-80px)]">
              <AIChatInterface onClose={() => setIsOpen(false)} />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default FloatingAIChat;