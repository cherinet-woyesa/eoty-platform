import React, { useState, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AIChatInterface, { type AIChatInterfaceHandle } from '@/components/shared/ai/AIChatInterface';
import { 
  Bot, BookOpen, Shield, Languages, Sparkles, 
  Zap, MessageSquare, CheckCircle
} from 'lucide-react';

const AIAssistant: React.FC = () => {
  const { getRoleDashboard } = useAuth();
  const chatRef = useRef<AIChatInterfaceHandle | null>(null);
  const location = useLocation();

  // Derive lesson/course context from query params when opened from a lesson
  const { initialContext, contextLabel } = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const lessonId = searchParams.get('lessonId');
    const courseId = searchParams.get('courseId');

    if (!lessonId && !courseId) {
      return { initialContext: undefined, contextLabel: null as string | null };
    }

    const ctx: any = {
      source: 'course-details',
      fromLessonId: lessonId || undefined,
      fromCourseId: courseId || undefined,
    };

    let label = 'Context: ';
    if (courseId) label += `Course ${courseId}`;
    if (lessonId) label += `${courseId ? ' • ' : ''}Lesson ${lessonId}`;

    return { initialContext: ctx, contextLabel: label };
  }, [location.search]);

  const quickQuestions = [
    { question: 'What is the significance of the Holy Trinity?', icon: BookOpen },
    { question: 'Explain the Ethiopian Orthodox liturgy', icon: MessageSquare },
    { question: 'What are the main feasts in the Orthodox calendar?', icon: Sparkles },
    { question: 'How do I prepare for confession?', icon: Shield }
  ];

  const handleQuickQuestion = (question: string) => {
    if (chatRef.current) {
      chatRef.current.askQuickQuestion(question);
    }
  };

  return (
    <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-lg p-4 border border-[#27AE60]/25 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-xl font-semibold text-stone-800">AI Assistant</h1>
            </div>
            <p className="text-stone-600 text-sm">AI-powered guidance for your spiritual journey</p>
            {contextLabel && (
              <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full bg-white/80 border border-[#27AE60]/30 text-xs font-medium text-[#16A085] shadow-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                {contextLabel}
              </div>
            )}
          </div>
          <Link
            to={getRoleDashboard()}
            className="inline-flex items-center px-3 py-1.5 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-medium rounded-lg transition-all duration-200"
          >
            <BookOpen className="h-3 w-3 mr-1.5" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Chat Interface - 3/4 width */}
        <div className="lg:col-span-3">
          <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 shadow-sm overflow-hidden">
            <div className="h-[calc(100vh-280px)] min-h-[500px] max-h-[700px]">
              <AIChatInterface ref={chatRef} context={initialContext} />
            </div>
          </div>
        </div>

        {/* Features Sidebar - 1/4 width */}
        <div className="space-y-3">
          {/* Compact Quick Questions */}
          <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-3 shadow-sm">
            <h3 className="text-sm font-medium text-stone-800 mb-3 flex items-center">
              <Zap className="mr-1.5 h-4 w-4 text-[#27AE60]" />
              Quick Questions
            </h3>
            <div className="space-y-1.5">
                {quickQuestions.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(item.question)}
                  className="w-full text-left p-2 bg-stone-50 hover:bg-gradient-to-r hover:from-[#27AE60]/10 hover:to-[#16A085]/10 rounded border border-stone-200 hover:border-[#27AE60]/50 transition-all group"
                >
                  <div className="flex items-start gap-1.5">
                    <item.icon className="h-3 w-3 text-[#27AE60] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <p className="text-xs text-stone-700 group-hover:text-stone-900 font-medium line-clamp-2">
                      {item.question}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Compact How It Works */}
          <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-3 shadow-sm">
            <h3 className="text-sm font-medium text-stone-800 mb-3 flex items-center">
              <Bot className="mr-1.5 h-4 w-4 text-[#16A085]" />
              How It Works
            </h3>
            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex items-start space-x-1.5">
                <CheckCircle className="h-3 w-3 text-[#27AE60] flex-shrink-0 mt-0.5" />
                <p>Ask questions about Orthodox Christianity</p>
              </div>
              <div className="flex items-start space-x-1.5">
                <CheckCircle className="h-3 w-3 text-[#27AE60] flex-shrink-0 mt-0.5" />
                <p>Get faith-aligned answers from trusted sources</p>
              </div>
              <div className="flex items-start space-x-1.5">
                <CheckCircle className="h-3 w-3 text-[#27AE60] flex-shrink-0 mt-0.5" />
                <p>Context-aware responses based on your lessons</p>
              </div>
            </div>
          </div>

          {/* Compact Doctrinal Safety */}
          <div className="bg-gradient-to-br from-[#27AE60]/10 to-[#16A085]/10 rounded-lg border border-[#27AE60]/30 p-3 shadow-sm">
            <h3 className="text-sm font-medium text-stone-800 mb-2 flex items-center">
              <Shield className="mr-1.5 h-4 w-4 text-[#27AE60]" />
              Doctrinal Safety
            </h3>
            <ul className="space-y-1.5 text-xs text-stone-700">
              <li className="flex items-start gap-1.5">
                <CheckCircle className="h-3 w-3 text-[#27AE60] flex-shrink-0 mt-0.5" />
                <span>Aligned with Ethiopian Orthodox teachings</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle className="h-3 w-3 text-[#27AE60] flex-shrink-0 mt-0.5" />
                <span>Sensitive topics flagged for moderation</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle className="h-3 w-3 text-[#27AE60] flex-shrink-0 mt-0.5" />
                <span>References Scripture and Church Fathers</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle className="h-3 w-3 text-[#27AE60] flex-shrink-0 mt-0.5" />
                <span>Encourages consultation with clergy</span>
              </li>
            </ul>
          </div>

          {/* Compact Language Support */}
          <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-3 shadow-sm">
            <h3 className="text-sm font-medium text-stone-800 mb-2 flex items-center">
              <Languages className="mr-1.5 h-4 w-4 text-[#2980B9]" />
              Language Support
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-1.5 bg-stone-50 rounded">
                <span className="text-xs font-medium text-stone-700">English</span>
                <span className="bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 px-1.5 py-0.5 rounded text-xs font-semibold">
                  Available
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-stone-50 rounded">
                <span className="text-xs font-medium text-stone-700">Amharic</span>
                <span className="bg-[#F39C12]/20 text-[#F39C12] border border-[#F39C12]/30 px-1.5 py-0.5 rounded text-xs font-semibold">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>

          {/* Compact Ask About */}
          <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-3 shadow-sm">
            <h3 className="text-sm font-medium text-stone-800 mb-2 flex items-center">
              <BookOpen className="mr-1.5 h-4 w-4 text-[#16A085]" />
              Ask About
            </h3>
            <div className="space-y-1 text-xs text-stone-600">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-[#27AE60] rounded-full" />
                <span>Scripture interpretation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-[#27AE60] rounded-full" />
                <span>Church traditions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-[#27AE60] rounded-full" />
                <span>Spiritual practices</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-[#27AE60] rounded-full" />
                <span>Lesson clarification</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-[#27AE60] rounded-full" />
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