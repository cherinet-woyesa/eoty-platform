import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  HelpCircle, Search, MessageCircle, Mail, BookOpen,
  Video, PlayCircle, FileText, ChevronRight, X,
  CheckCircle, AlertCircle, Info, Loader2, Users, Eye
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  views: number;
}

const HelpPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'How do I enroll in a course?',
      answer: 'To enroll in a course, go to the Browse Courses page, find a course you\'re interested in, and click the "Enroll" button. Once enrolled, you can access the course from your My Courses page.',
      category: 'Getting Started'
    },
    {
      id: '2',
      question: 'How do I track my progress?',
      answer: 'Your progress is automatically tracked as you complete lessons. You can view your overall progress on the Progress page, which shows your completed courses, lessons, study streak, and points earned.',
      category: 'Progress'
    },
    {
      id: '3',
      question: 'Can I bookmark lessons?',
      answer: 'Yes! While viewing a lesson, you can click the bookmark icon to save it for later. All your bookmarked lessons and courses can be found on the Bookmarks page.',
      category: 'Features'
    },
    {
      id: '4',
      question: 'How do study groups work?',
      answer: 'Study groups allow you to collaborate with other students. You can create your own group or join existing public groups. Groups have chat functionality for discussions and can be focused on specific courses.',
      category: 'Study Groups'
    },
    {
      id: '5',
      question: 'What if I have technical issues?',
      answer: 'If you experience technical issues, please contact support using the contact form below. Include details about the problem, your browser, and any error messages you see.',
      category: 'Technical'
    },
    {
      id: '6',
      question: 'How do I reset my password?',
      answer: 'To reset your password, go to the Sign In page and click "Forgot Password". Enter your email address and follow the instructions sent to your email.',
      category: 'Account'
    },
    {
      id: '7',
      question: 'Can I download course materials?',
      answer: 'Course materials availability depends on the course. Some courses may offer downloadable resources, which will be available in the course content section.',
      category: 'Features'
    },
    {
      id: '8',
      question: 'How are points and achievements calculated?',
      answer: 'You earn points by completing lessons, quizzes, and maintaining study streaks. Achievements are unlocked when you reach certain milestones. View your achievements on the Achievements page.',
      category: 'Progress'
    }
  ];

  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: 'Getting Started Guide',
      content: 'Welcome to EOTY Platform! This guide will help you get started with your learning journey...',
      category: 'Getting Started',
      views: 1250
    },
    {
      id: '2',
      title: 'How to Use the Video Player',
      content: 'Learn how to navigate the video player, adjust playback speed, and use subtitles...',
      category: 'Features',
      views: 890
    },
    {
      id: '3',
      title: 'Understanding Your Progress',
      content: 'Learn how to interpret your progress metrics and track your learning journey...',
      category: 'Progress',
      views: 650
    }
  ];

  // Filtered FAQs
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(faqs.map(f => f.category)))];

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
      
      alert('Thank you for contacting us! We will get back to you soon.');
      setContactSubject('');
      setContactMessage('');
      setShowContactForm(false);
    } catch (err) {
      console.error('Failed to submit contact form:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [contactSubject, contactMessage]);

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-800 mb-2">Help Center</h1>
        <p className="text-stone-600">Find answers and get support</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowContactForm(true)}
          className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-stone-200 hover:border-[#39FF14] hover:shadow-lg transition-all text-left"
        >
          <MessageCircle className="h-8 w-8 text-[#39FF14] mb-3" />
          <h3 className="font-bold text-stone-800 mb-1">Contact Support</h3>
          <p className="text-sm text-stone-600">Get help from our support team</p>
        </button>
        
        <Link
          to="/student/videos"
          className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-stone-200 hover:border-[#00FFC6] hover:shadow-lg transition-all text-left"
        >
          <PlayCircle className="h-8 w-8 text-[#00FFC6] mb-3" />
          <h3 className="font-bold text-stone-800 mb-1">Video Tutorials</h3>
          <p className="text-sm text-stone-600">Watch helpful video guides</p>
        </Link>
        
        <Link
          to="/forums"
          className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-stone-200 hover:border-[#00FFFF] hover:shadow-lg transition-all text-left"
        >
          <Users className="h-8 w-8 text-[#00FFFF] mb-3" />
          <h3 className="font-bold text-stone-800 mb-1">Community Forum</h3>
          <p className="text-sm text-stone-600">Ask the community</p>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
        <input
          type="text"
          placeholder="Search for help..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
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

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg transition-all font-medium ${
              selectedCategory === category
                ? 'bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900'
                : 'bg-white/80 text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            {category === 'all' ? 'All Categories' : category}
          </button>
        ))}
      </div>

      {/* FAQs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200 p-6 shadow-md">
        <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center">
          <HelpCircle className="h-5 w-5 mr-2 text-[#39FF14]" />
          Frequently Asked Questions
        </h2>
        
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-8 text-stone-500">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No FAQs found matching your search</p>
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

      {/* Help Articles */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200 p-6 shadow-md">
        <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-[#00FFC6]" />
          Help Articles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {helpArticles.map((article) => (
            <div
              key={article.id}
              className="p-4 border border-stone-200 rounded-lg hover:border-[#39FF14] hover:shadow-md transition-all cursor-pointer"
            >
              <h3 className="font-semibold text-stone-800 mb-2">{article.title}</h3>
              <p className="text-sm text-stone-600 mb-3 line-clamp-2">{article.content}</p>
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>{article.category}</span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {article.views}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-stone-800">Contact Support</h2>
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
                  Subject
                </label>
                <input
                  type="text"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder="What can we help you with?"
                  required
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Message
                </label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  rows={5}
                  required
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="flex-1 px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !contactSubject.trim() || !contactMessage.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send Message
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
