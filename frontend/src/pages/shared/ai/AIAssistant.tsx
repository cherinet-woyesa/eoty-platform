import React, { useState, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import AIChatInterface, { type AIChatInterfaceHandle } from '@/components/shared/ai/AIChatInterface';
import { 
  Bot, BookOpen, Shield, Languages, Sparkles, 
  Zap, MessageSquare, CheckCircle, Info, HelpCircle, ArrowLeft,
  AlertTriangle, Clock
} from 'lucide-react';
import { brandColors } from '@/theme/brand';

const AIAssistant: React.FC = () => {
  const { getRoleDashboard } = useAuth();
  const { t } = useTranslation();
  const chatRef = useRef<AIChatInterfaceHandle | null>(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'prompts' | 'guide'>('prompts');
  const [chatError, setChatError] = useState<string>('');
  const [isSlow, setIsSlow] = useState<boolean>(false);
  const [messageCount, setMessageCount] = useState<number>(0);

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

    let label = t('ai_assistant.context_prefix');
    if (courseId) label += ` ${t('ai_assistant.context_course', { id: courseId })}`;
    if (lessonId) label += `${courseId ? ' • ' : ''}${t('ai_assistant.context_lesson', { id: lessonId })}`;

    return { initialContext: ctx, contextLabel: label };
  }, [location.search, t]);

  const quickQuestions = [
    { question: t('ai_assistant.quick.trinity'), icon: BookOpen, category: t('ai_assistant.quick_cat.theology') },
    { question: t('ai_assistant.quick.liturgy'), icon: MessageSquare, category: t('ai_assistant.quick_cat.worship') },
    { question: t('ai_assistant.quick.feasts'), icon: Sparkles, category: t('ai_assistant.quick_cat.tradition') },
    { question: t('ai_assistant.quick.confession'), icon: Shield, category: t('ai_assistant.quick_cat.spiritual') },
    { question: t('ai_assistant.quick.history'), icon: BookOpen, category: t('ai_assistant.quick_cat.history') },
    { question: t('ai_assistant.quick.sacraments'), icon: Zap, category: t('ai_assistant.quick_cat.theology') }
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
              <Sparkles className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              {t('ai_assistant.title')}
            </h1>
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <span>{t('ai_assistant.subtitle')}</span>
              {contextLabel && (
                <>
                  <span className="w-1 h-1 bg-stone-300 rounded-full" />
                  <span
                    className="font-medium px-2 py-0.5 rounded-full text-xs"
                    style={{ color: brandColors.primaryHex, backgroundColor: `${brandColors.primaryHex}1A` }}
                  >
                    {contextLabel}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
            <Shield className="h-3.5 w-3.5" />
            {t('ai_assistant.doctrinal_badge')}
          </div>
        </div>

        {/* Shell-level banners */}
        {chatError && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">{chatError}</span>
          </div>
        )}
        {!chatError && isSlow && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{t('ai.slowResponse', 'Taking longer than usual...')}</span>
          </div>
        )}

        {!chatError && messageCount === 0 && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-900 px-3 py-3 text-sm flex items-start gap-3">
            <Bot className="h-4 w-4 mt-0.5" />
            <div>
              <p className="font-semibold">{t('ai_assistant.shell_empty_title', 'Start a conversation')}</p>
              <p className="text-indigo-800/80">{t('ai_assistant.shell_empty_body', 'Ask a faith or platform question to begin. You can also send voice (Amharic or English).')}</p>
            </div>
          </div>
        )}

        {/* Main Content Container */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-stone-200 overflow-hidden flex h-[calc(100vh-8rem)]">
          {/* Main Chat Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-white relative">
            <div className="flex-1 overflow-hidden">
              <AIChatInterface
                ref={chatRef}
                context={initialContext}
                onError={(msg) => setChatError(msg || '')}
                onSlow={(flag) => setIsSlow(flag)}
                onMessageCountChange={(count) => setMessageCount(count)}
              />
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
                    ? 'border-[color:#1e1b4b] text-[color:#1e1b4b] bg-[color:rgba(30,27,75,0.08)]'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Zap className="h-4 w-4" />
                {t('ai_assistant.tabs.suggested')}
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'guide'
                    ? 'border-[color:#1e1b4b] text-[color:#1e1b4b] bg-[color:rgba(30,27,75,0.08)]'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Info className="h-4 w-4" />
                {t('ai_assistant.tabs.guide')}
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'prompts' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                      {t('ai_assistant.sidebar.common')}
                    </h3>
                    <div className="space-y-2">
                      {quickQuestions.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickQuestion(item.question)}
                          className="w-full text-left p-3 bg-white hover:bg-white/80 border border-stone-200 hover:border-[color:#1e1b4b]/40 rounded-xl shadow-sm hover:shadow transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-stone-50 rounded-lg group-hover:bg-[color:rgba(30,27,75,0.08)] transition-colors">
                              <item.icon className="h-4 w-4 text-stone-400 group-hover:text-[color:#1e1b4b] transition-colors" />
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
                      {t('ai_assistant.sidebar.pro_tip_title')}
                    </h4>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      {t('ai_assistant.sidebar.pro_tip_text')}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'guide' && (
                <div className="space-y-6">
                  {/* How It Works */}
                  <section>
                    <h3 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-[color:#1e1b4b]" />
                      {t('ai_assistant.guide.how_title')}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-[color:rgba(30,27,75,0.12)] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[color:#1e1b4b]">1</div>
                        <p className="text-sm text-stone-600">{t('ai_assistant.guide.how_1')}</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-[color:rgba(30,27,75,0.12)] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[color:#1e1b4b]">2</div>
                        <p className="text-sm text-stone-600">{t('ai_assistant.guide.how_2')}</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-[color:rgba(30,27,75,0.12)] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[color:#1e1b4b]">3</div>
                        <p className="text-sm text-stone-600">{t('ai_assistant.guide.how_3')}</p>
                      </div>
                    </div>
                  </section>

                  {/* Safety */}
                  <section className="p-4 bg-stone-100 rounded-xl border border-stone-200">
                    <h3 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-stone-600" />
                      {t('ai_assistant.guide.safety_title')}
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-xs text-stone-600">
                        <CheckCircle className="h-3.5 w-3.5 text-[color:#1e1b4b] flex-shrink-0 mt-0.5" />
                        <span>{t('ai_assistant.guide.safety_1')}</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-stone-600">
                        <CheckCircle className="h-3.5 w-3.5 text-[color:#1e1b4b] flex-shrink-0 mt-0.5" />
                        <span>{t('ai_assistant.guide.safety_2')}</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-stone-600">
                        <CheckCircle className="h-3.5 w-3.5 text-[color:#1e1b4b] flex-shrink-0 mt-0.5" />
                        <span>{t('ai_assistant.guide.safety_3')}</span>
                      </li>
                    </ul>
                  </section>

                  {/* Languages */}
                  <section>
                    <h3 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
                      <Languages className="h-4 w-4 text-blue-600" />
                      {t('ai_assistant.languages.title')}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-white border border-stone-200 rounded-lg text-center">
                        <span className="block text-xs font-medium text-stone-900">{t('ai_assistant.languages.en')}</span>
                        <span className="block text-[10px] text-[color:#1e1b4b] font-medium">{t('ai_assistant.languages.active')}</span>
                      </div>
                      <div className="p-2 bg-white border border-stone-200 rounded-lg text-center opacity-60">
                        <span className="block text-xs font-medium text-stone-900">{t('ai_assistant.languages.am')}</span>
                        <span className="block text-[10px] text-amber-600 font-medium">{t('ai_assistant.languages.coming_soon')}</span>
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