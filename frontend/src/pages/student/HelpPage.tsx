import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  HelpCircle, Search, MessageCircle, Mail,
  Video, PlayCircle, FileText, ChevronRight, X,
  CheckCircle, AlertCircle, Info, Loader2, Users
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { brandColors } from '@/theme/brand';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const HelpPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faqs: FAQ[] = [
    {
      id: '1',
      question: t('help.faqs.q1.question'),
      answer: t('help.faqs.q1.answer'),
      category: t('help.categories.gettingStarted')
    },
    {
      id: '2',
      question: t('help.faqs.q2.question'),
      answer: t('help.faqs.q2.answer'),
      category: t('help.categories.progress')
    },
    {
      id: '3',
      question: t('help.faqs.q3.question'),
      answer: t('help.faqs.q3.answer'),
      category: t('help.categories.features')
    },
    {
      id: '4',
      question: t('help.faqs.q4.question'),
      answer: t('help.faqs.q4.answer'),
      category: t('help.categories.studyGroups')
    },
    {
      id: '5',
      question: t('help.faqs.q5.question'),
      answer: t('help.faqs.q5.answer'),
      category: t('help.categories.technical')
    },
    {
      id: '6',
      question: t('help.faqs.q6.question'),
      answer: t('help.faqs.q6.answer'),
      category: t('help.categories.account')
    },
    {
      id: '7',
      question: t('help.faqs.q7.question'),
      answer: t('help.faqs.q7.answer'),
      category: t('help.categories.features')
    },
    {
      id: '8',
      question: t('help.faqs.q8.question'),
      answer: t('help.faqs.q8.answer'),
      category: t('help.categories.progress')
    }
  ];

  // Filtered FAQs
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Handle contact form submission
  const handleContactSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactMessage.trim()) return;
    
    setIsSubmitting(true);
    try {
      // In a real implementation, this would send to backend
      console.log('Contact form submitted:', { subject: contactSubject, message: contactMessage });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert(t('help.contact.success'));
      setContactSubject('');
      setContactMessage('');
      setShowContactForm(false);
    } catch (err) {
      console.error('Failed to submit contact form:', err);
      alert(t('help.contact.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [contactSubject, contactMessage, t]);

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-800 mb-2">{t('help.title')}</h1>
        <p className="text-stone-600">{t('help.subtitle')}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowContactForm(true)}
          className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-stone-200 hover:shadow-lg transition-all text-left group"
          style={{ borderColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = brandColors.primary}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
        >
          <MessageCircle className="h-8 w-8 mb-3" style={{ color: brandColors.primary }} />
          <h3 className="font-bold text-stone-800 mb-1">{t('help.quickActions.contactSupport.title')}</h3>
          <p className="text-sm text-stone-600">{t('help.quickActions.contactSupport.description')}</p>
        </button>
        
        <Link
          to="/member/videos"
          className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-stone-200 hover:shadow-lg transition-all text-left group"
          style={{ borderColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = brandColors.secondary}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
        >
          <PlayCircle className="h-8 w-8 mb-3" style={{ color: brandColors.secondary }} />
          <h3 className="font-bold text-stone-800 mb-1">{t('help.quickActions.videoTutorials.title')}</h3>
          <p className="text-sm text-stone-600">{t('help.quickActions.videoTutorials.description')}</p>
        </Link>
        
        <Link
          to="/forums"
          className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-stone-200 hover:shadow-lg transition-all text-left group"
          style={{ borderColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = brandColors.accent}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
        >
          <Users className="h-8 w-8 mb-3" style={{ color: brandColors.accent }} />
          <h3 className="font-bold text-stone-800 mb-1">{t('help.quickActions.communityForum.title')}</h3>
          <p className="text-sm text-stone-600">{t('help.quickActions.communityForum.description')}</p>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
        <input
          type="text"
          placeholder={t('help.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': brandColors.primary } as React.CSSProperties}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-stone-100 rounded"
          >
            <X className="h-4 w-4 text-stone-400" />
          </button>
        )}
      </div>

      {/* FAQs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200 p-6 shadow-md">
        <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center">
          <HelpCircle className="h-5 w-5 mr-2" style={{ color: brandColors.primary }} />
          {t('help.faqTitle')}
        </h2>
        
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-8 text-stone-500">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('help.noFaqsFound')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFAQs.map((faq) => (
              <div
                key={faq.id}
                className="border border-stone-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-stone-50 transition-colors"
                >
                  <span className="font-semibold text-stone-800 pr-4">{faq.question}</span>
                  <ChevronRight
                    className={`h-5 w-5 text-stone-400 flex-shrink-0 transition-transform ${
                      expandedFAQ === faq.id ? 'transform rotate-90' : ''
                    }`}
                  />
                </button>
                {expandedFAQ === faq.id && (
                  <div className="p-4 pt-0 text-stone-600 border-t border-stone-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-stone-800">{t('help.contact.title')}</h2>
              <button
                onClick={() => setShowContactForm(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-stone-600" />
              </button>
            </div>
            
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('help.contact.subject')}
                </label>
                <input
                  type="text"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder={t('help.contact.subjectPlaceholder')}
                  required
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': brandColors.primary } as React.CSSProperties}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('help.contact.message')}
                </label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder={t('help.contact.messagePlaceholder')}
                  rows={5}
                  required
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': brandColors.primary } as React.CSSProperties}
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="flex-1 px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-all font-semibold"
                >
                  {t('help.contact.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !contactSubject.trim() || !contactMessage.trim()}
                  className="flex-1 px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(to right, ${brandColors.primary}, ${brandColors.secondary})` }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('help.contact.sending')}
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      {t('help.contact.send')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpPage;
