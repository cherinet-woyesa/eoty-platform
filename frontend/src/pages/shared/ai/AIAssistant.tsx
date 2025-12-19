import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import AIChatInterface, { type AIChatInterfaceHandle } from '@/components/shared/ai/AIChatInterface';
import { 
  Bot, Shield, Languages, Sparkles, 
  CheckCircle, Info, HelpCircle,
  AlertTriangle, Clock, Menu, X, Trash2
} from 'lucide-react';
import { brandColors } from '@/theme/brand';

const AIAssistant: React.FC = () => {
  const { getRoleDashboard } = useAuth();
  const { t } = useTranslation();
  const chatRef = useRef<AIChatInterfaceHandle | null>(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('guide');
  const [chatError, setChatError] = useState<string>('');
  const [isSlow, setIsSlow] = useState<boolean>(false);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0); // Used to reset chat

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



  const handleClearChat = () => {
    if (window.confirm(t('ai_assistant.clear_confirm', 'Are you sure you want to clear the current conversation?'))) {
      setChatKey(prev => prev + 1);
      setMessageCount(0);
      setChatError('');
      setIsSlow(false);
    }
  };

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-indigo-600" />
              <span className="text-indigo-900">{t('ai_assistant.title')}</span>
            </h1>
            {contextLabel && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 ml-11">
                <span className="font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                  {contextLabel}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            {messageCount > 0 && (
              <button
                onClick={handleClearChat}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title={t('ai_assistant.clear_chat', 'Clear conversation')}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-indigo-100 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <div className="flex-1 flex overflow-hidden relative">
            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-white relative z-0 h-full">
              {/* Alerts */}
              <div className="absolute top-4 left-4 right-4 z-10 space-y-2 pointer-events-none">
                {chatError && (
                  <div className="mx-auto max-w-md rounded-xl border border-red-100 bg-white shadow-lg text-red-600 px-4 py-3 text-sm flex items-center gap-3 pointer-events-auto animate-in slide-in-from-top-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span className="font-medium">{chatError}</span>
                    <button onClick={() => setChatError('')} className="ml-auto p-1 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {!chatError && isSlow && (
                  <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50/90 backdrop-blur-sm text-amber-800 px-4 py-3 text-sm flex items-center gap-3 shadow-sm pointer-events-auto animate-in slide-in-from-top-2">
                    <Clock className="h-5 w-5 shrink-0 text-amber-600" />
                    <span>{t('ai.slowResponse', 'Taking longer than usual...')}</span>
                  </div>
                )}
              </div>

              {/* Empty State */}
              {!chatError && messageCount === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <div className="text-center max-w-md px-6">
                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
                      <Bot className="h-10 w-10 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('ai_assistant.shell_empty_title', 'How can I help you today?')}</h2>
                    <p className="text-gray-500 leading-relaxed mb-8">
                      {t('ai_assistant.shell_empty_body', 'Ask questions about faith, courses, or get help with your studies.')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex-1 h-full overflow-hidden">
                <AIChatInterface
                  key={chatKey}
                  ref={chatRef}
                  context={initialContext}
                  showWelcomeMessage={false}
                  maxHeight="100%"
                  onError={(msg) => setChatError(msg || '')}
                  onSlow={(flag) => setIsSlow(flag)}
                  onMessageCountChange={(count) => setMessageCount(count)}
                  className="h-full border-0 shadow-none rounded-none"
                />
              </div>
            </main>

            {/* Sidebar Overlay (Mobile) */}
            {isSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Right Sidebar */}
            <aside className={`
              fixed lg:static inset-y-0 right-0 z-40 w-80 bg-white border-l border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col
              ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            `}>
              <div className="flex items-center justify-between p-4 border-b border-gray-100 lg:hidden">
                <h2 className="font-bold text-gray-900">Assistant Menu</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Sidebar Tabs */}
              <div className="flex p-2 gap-1 border-b border-gray-100">
                <button
                  onClick={() => setActiveTab('guide')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'guide'
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Info className="h-4 w-4" />
                  {t('ai_assistant.tabs.guide')}
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'guide' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* How It Works */}
                    <section>
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-indigo-600" />
                        {t('ai_assistant.guide.how_title')}
                      </h3>
                      <div className="space-y-4 relative">
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-100" />
                        <div className="relative flex gap-4">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-700 z-10">1</div>
                          <p className="text-sm text-gray-600 pt-0.5">{t('ai_assistant.guide.how_1')}</p>
                        </div>
                        <div className="relative flex gap-4">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-700 z-10">2</div>
                          <p className="text-sm text-gray-600 pt-0.5">{t('ai_assistant.guide.how_2')}</p>
                        </div>
                        <div className="relative flex gap-4">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-700 z-10">3</div>
                          <p className="text-sm text-gray-600 pt-0.5">{t('ai_assistant.guide.how_3')}</p>
                        </div>
                      </div>
                    </section>

                    {/* Safety */}
                    <section className="p-5 bg-gray-50 rounded-2xl border border-gray-200">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-600" />
                        {t('ai_assistant.guide.safety_title')}
                      </h3>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-2.5 text-xs text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>{t('ai_assistant.guide.safety_1')}</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>{t('ai_assistant.guide.safety_2')}</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>{t('ai_assistant.guide.safety_3')}</span>
                        </li>
                      </ul>
                    </section>

                    {/* Languages */}
                    <section>
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Languages className="h-4 w-4 text-indigo-600" />
                        {t('ai_assistant.languages.title')}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white border border-indigo-200 rounded-xl text-center shadow-sm ring-1 ring-indigo-50">
                          <span className="block text-sm font-bold text-gray-900 mb-1">{t('ai_assistant.languages.en')}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                            {t('ai_assistant.languages.active')}
                          </span>
                        </div>
                        <div className="p-3 bg-white border border-indigo-200 rounded-xl text-center shadow-sm ring-1 ring-indigo-50">
                          <span className="block text-sm font-bold text-gray-900 mb-1">{t('ai_assistant.languages.am')}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                            {t('ai_assistant.languages.active')}
                          </span>
                        </div>
                        <div className="p-3 bg-white border border-indigo-200 rounded-xl text-center shadow-sm ring-1 ring-indigo-50">
                          <span className="block text-sm font-bold text-gray-900 mb-1">Tigrigna</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                            {t('ai_assistant.languages.active')}
                          </span>
                        </div>
                        <div className="p-3 bg-white border border-indigo-200 rounded-xl text-center shadow-sm ring-1 ring-indigo-50">
                          <span className="block text-sm font-bold text-gray-900 mb-1">Afan Oromo</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                            {t('ai_assistant.languages.active')}
                          </span>
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
    </div>
  );
};

export default AIAssistant;