import React, { useState } from 'react';
import AIChatInterface from './AIChatInterface';
import { Bot, X } from 'lucide-react';

const FloatingAIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 flex items-center justify-center z-50"
          title="Open Faith Assistant"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] z-50 shadow-2xl rounded-2xl overflow-hidden">
          <AIChatInterface onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
};

export default FloatingAIChat;