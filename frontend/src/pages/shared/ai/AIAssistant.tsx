import React, { useState, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AIChatInterface, { type AIChatInterfaceHandle } from '@/components/shared/ai/AIChatInterface';
import { 
  Bot, BookOpen, Shield, Languages, Sparkles, 
  Zap, MessageSquare, CheckCircle, Info, HelpCircle, ArrowLeft
} from 'lucide-react';

const AIAssistant: React.FC = () => {
  const { getRoleDashboard } = useAuth();
  const chatRef = useRef<AIChatInterfaceHandle | null>(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'prompts' | 'guide'>('prompts');

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
      // backend expects `lessonId` and `courseId` keys for context-aware responses
      lessonId: lessonId || undefined,
      courseId: courseId || undefined,
    };

    let label = 'Context: ';
    if (courseId) label += `Course ${courseId}`;
    if (lessonId) label += `${courseId ? ' • ' : ''}Lesson ${lessonId}`;

    return { initialContext: ctx, contextLabel: label };
  }, [location.search]);

  const quickQuestions = [
    { question: 'What is the significance of the Holy Trinity?', icon: BookOpen, category: 'Theology' },
    { question: 'Explain the Ethiopian Orthodox liturgy', icon: MessageSquare, category: 'Worship' },
    { question: 'What are the main feasts in the Orthodox calendar?', icon: Sparkles, category: 'Tradition' },
    { question: 'How do I prepare for confession?', icon: Shield, category: 'Spiritual Life' },
    { question: 'Summarize the history of the EOTC', icon: BookOpen, category: 'History' },
    { question: 'What are the 7 sacraments?', icon: Zap, category: 'Theology' }
  ];

  const handleQuickQuestion = (question: string) => {
    if (chatRef.current) {
      chatRef.current.askQuickQuestion(question);
    }
  };

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-stone-800 mb-1.5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#27AE60]" />
              AI Assistant
            </h1>
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <span>Your spiritual teaching companion</span>
              {contextLabel && (
                <>
                  <span className="w-1 h-1 bg-stone-300 rounded-full" />
                  <span className="text-[#27AE60] font-medium bg-[#27AE60]/10 px-2 py-0.5 rounded-full text-xs">
                    {contextLabel}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
            <Shield className="h-3.5 w-3.5" />
            Doctrinally Aligned
          </div>
        </div>

        {/* Main Content Container */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-stone-200 overflow-hidden flex h-[calc(100vh-8rem)]">
          {/* Main Chat Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-white relative">
            <div className="flex-1 overflow-hidden">
              <AIChatInterface ref={chatRef} context={initialContext} />
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className="w-80 bg-stone-50 border-l border-stone-200 flex flex-col flex-shrink-0 hidden lg:flex">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-stone-200 bg-white">
              <button
                onClick={() => setActiveTab('prompts')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'prompts'
                    ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Zap className="h-4 w-4" />
                Suggested
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'guide'
                    ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Info className="h-4 w-4" />
                Guide
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'prompts' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                      Common Questions
                    </h3>
                    <div className="space-y-2">
                      {quickQuestions.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickQuestion(item.question)}
                          className="w-full text-left p-3 bg-white hover:bg-white/80 border border-stone-200 hover:border-[#27AE60]/50 rounded-xl shadow-sm hover:shadow transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-stone-50 rounded-lg group-hover:bg-[#27AE60]/10 transition-colors">
                              <item.icon className="h-4 w-4 text-stone-400 group-hover:text-[#27AE60] transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm text-stone-700 group-hover:text-stone-900 font-medium line-clamp-2">
                                {item.question}
                              </p>
                              <span className="text-[10px] text-stone-400 mt-1 block">
                                {item.category}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Pro Tip
                    </h4>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Try asking for specific lesson plans, analogies for difficult concepts, or historical context for upcoming feast days.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'guide' && (
                <div className="space-y-6">
                  {/* How It Works */}
                  <section>
                    <h3 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-[#27AE60]" />
                      How It Works
                    </h3>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#27AE60]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#27AE60]">1</div>
                        <p className="text-sm text-stone-600">Ask questions about Orthodox Christianity, theology, or teaching methods.</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#27AE60]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#27AE60]">2</div>
                        <p className="text-sm text-stone-600">Get answers sourced from approved EOTC texts and scripture.</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#27AE60]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#27AE60]">3</div>
                        <p className="text-sm text-stone-600">Use the responses to enhance your lesson plans and student engagement.</p>
                      </div>
                    </div>
                  </section>

                  {/* Safety */}
                  <section className="p-4 bg-stone-100 rounded-xl border border-stone-200">
                    <h3 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-stone-600" />
                      Doctrinal Safety
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-xs text-stone-600">
                        <CheckCircle className="h-3.5 w-3.5 text-[#27AE60] flex-shrink-0 mt-0.5" />
                        <span>Aligned with Ethiopian Orthodox teachings</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-stone-600">
                        <CheckCircle className="h-3.5 w-3.5 text-[#27AE60] flex-shrink-0 mt-0.5" />
                        <span>References Scripture and Church Fathers</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-stone-600">
                        <CheckCircle className="h-3.5 w-3.5 text-[#27AE60] flex-shrink-0 mt-0.5" />
                        <span>Encourages consultation with clergy for complex matters</span>
                      </li>
                    </ul>
                  </section>

                  {/* Languages */}
                  <section>
                    <h3 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
                      <Languages className="h-4 w-4 text-blue-600" />
                      Languages
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-white border border-stone-200 rounded-lg text-center">
                        <span className="block text-xs font-medium text-stone-900">English</span>
                        <span className="block text-[10px] text-[#27AE60] font-medium">Active</span>
                      </div>
                      <div className="p-2 bg-white border border-stone-200 rounded-lg text-center opacity-60">
                        <span className="block text-xs font-medium text-stone-900">Amharic</span>
                        <span className="block text-[10px] text-amber-600 font-medium">Coming Soon</span>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;