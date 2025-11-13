import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AIChatInterface from '@/components/shared/ai/AIChatInterface';
import { 
  Bot, BookOpen, Shield, Languages, Sparkles, 
  Zap, MessageSquare, CheckCircle
} from 'lucide-react';

const AIAssistant: React.FC = () => {
  const { getRoleDashboard } = useAuth();

  const quickQuestions = [
    { question: 'What is the significance of the Holy Trinity?', icon: BookOpen },
    { question: 'Explain the Ethiopian Orthodox liturgy', icon: MessageSquare },
    { question: 'What are the main feasts in the Orthodox calendar?', icon: Sparkles },
    { question: 'How do I prepare for confession?', icon: Shield }
  ];

  const handleQuickQuestion = (question: string) => {
    // This would trigger the chat interface to send the question
    // For now, we'll just log it - the actual implementation would need to integrate with AIChatInterface
    console.log('Quick question selected:', question);
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-[#39FF14]/20 rounded-xl blur-lg" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#39FF14]/20 to-[#00FFC6]/20 flex items-center justify-center border border-[#39FF14]/30">
                <Bot className="h-6 w-6 text-[#39FF14]" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-stone-800">AI Assistant</h1>
              <p className="text-stone-600">AI-powered guidance for your spiritual journey</p>
            </div>
          </div>
        </div>
        <Link
          to={getRoleDashboard()}
          className="px-4 py-2 bg-white/80 backdrop-blur-sm text-stone-700 rounded-lg border border-stone-200 hover:border-[#39FF14] hover:text-[#39FF14] transition-all font-medium flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Interface - 3/4 width */}
        <div className="lg:col-span-3">
          <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 shadow-lg overflow-hidden">
            <div className="h-[calc(100vh-300px)] min-h-[600px] max-h-[800px]">
              <AIChatInterface />
            </div>
          </div>
        </div>

        {/* Features Sidebar - 1/4 width */}
        <div className="space-y-4">
          {/* Quick Questions */}
          <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-5 shadow-md">
            <h3 className="text-lg font-semibold text-stone-800 mb-4 flex items-center">
              <Zap className="mr-2 h-5 w-5 text-[#39FF14]" />
              Quick Questions
            </h3>
            <div className="space-y-2">
              {quickQuestions.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(item.question)}
                  className="w-full text-left p-3 bg-stone-50 hover:bg-gradient-to-r hover:from-[#39FF14]/10 hover:to-[#00FFC6]/10 rounded-lg border border-stone-200 hover:border-[#39FF14]/50 transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <item.icon className="h-4 w-4 text-[#39FF14] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-stone-700 group-hover:text-stone-900 font-medium line-clamp-2">
                      {item.question}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-5 shadow-md">
            <h3 className="text-lg font-semibold text-stone-800 mb-4 flex items-center">
              <Bot className="mr-2 h-5 w-5 text-[#00FFC6]" />
              How It Works
            </h3>
            <div className="space-y-3 text-sm text-stone-600">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <p>Ask questions about Orthodox Christianity</p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <p>Get faith-aligned answers from trusted sources</p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <p>Context-aware responses based on your lessons</p>
              </div>
            </div>
          </div>

          {/* Doctrinal Safety */}
          <div className="bg-gradient-to-br from-[#39FF14]/10 to-[#00FFC6]/10 rounded-xl border border-[#39FF14]/30 p-5 shadow-md">
            <h3 className="text-lg font-semibold text-stone-800 mb-3 flex items-center">
              <Shield className="mr-2 h-5 w-5 text-[#39FF14]" />
              Doctrinal Safety
            </h3>
            <ul className="space-y-2 text-sm text-stone-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <span>Aligned with Ethiopian Orthodox teachings</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <span>Sensitive topics flagged for moderation</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <span>References Scripture and Church Fathers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <span>Encourages consultation with clergy</span>
              </li>
            </ul>
          </div>

          {/* Language Support */}
          <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-5 shadow-md">
            <h3 className="text-lg font-semibold text-stone-800 mb-3 flex items-center">
              <Languages className="mr-2 h-5 w-5 text-[#00FFFF]" />
              Language Support
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                <span className="text-sm font-medium text-stone-700">English</span>
                <span className="bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 px-2 py-1 rounded text-xs font-semibold">
                  Available
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                <span className="text-sm font-medium text-stone-700">Amharic</span>
                <span className="bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30 px-2 py-1 rounded text-xs font-semibold">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>

          {/* Ask About */}
          <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-5 shadow-md">
            <h3 className="text-lg font-semibold text-stone-800 mb-3 flex items-center">
              <BookOpen className="mr-2 h-5 w-5 text-[#00FFC6]" />
              Ask About
            </h3>
            <div className="space-y-2 text-sm text-stone-600">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#39FF14] rounded-full" />
                <span>Scripture interpretation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#39FF14] rounded-full" />
                <span>Church traditions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#39FF14] rounded-full" />
                <span>Spiritual practices</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#39FF14] rounded-full" />
                <span>Lesson clarification</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#39FF14] rounded-full" />
                <span>Historical context</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;