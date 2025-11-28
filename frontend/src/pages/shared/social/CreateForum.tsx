import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowLeft, CheckCircle, AlertCircle, Sparkles, Users, BookOpen, Heart, Music, Hand, Star, Zap } from 'lucide-react';
import { forumsApi } from '@/services/api/community';

const CreateForum: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    isPublic: false
  });

  const categories = [
    { value: '', label: 'Select category', icon: MessageSquare, description: 'Choose a category for your forum' },
    { value: 'general', label: 'General Discussion', icon: MessageSquare, description: 'Open discussions about faith and community' },
    { value: 'spirituality', label: 'Spirituality & Faith', icon: Sparkles, description: 'Deep spiritual conversations and faith journeys' },
    { value: 'study', label: 'Bible Study', icon: BookOpen, description: 'Scripture study and theological discussions' },
    { value: 'prayer', label: 'Prayer Requests', icon: Heart, description: 'Share prayer needs and support each other' },
    { value: 'fellowship', label: 'Fellowship & Events', icon: Users, description: 'Community events and fellowship activities' },
    { value: 'youth', label: 'Youth Ministry', icon: Star, description: 'Youth-focused discussions and activities' },
    { value: 'music', label: 'Music & Worship', icon: Music, description: 'Worship music, hymns, and musical ministry' },
    { value: 'service', label: 'Community Service', icon: Hand, description: 'Service projects and charitable activities' },
    { value: 'other', label: 'Other Topics', icon: Zap, description: 'Other faith-related discussions' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Please enter a forum title');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await forumsApi.createForum({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category || undefined,
        isPublic: formData.isPublic
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/teacher/community');
        }, 2000);
      } else {
        setError(response.message || 'Failed to create forum');
      }
    } catch (err: any) {
      console.error('Create forum error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create forum');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Ethiopian Orthodox Success Header */}
          <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-2xl p-8 border border-[#27AE60]/25 shadow-xl mb-6 text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-800">✨ Forum Created!</h1>
                <p className="text-lg text-stone-600 mt-1">Your faith community grows stronger</p>
              </div>
            </div>

            {/* Success Animation */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-[#27AE60]/30 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative w-24 h-24 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-full flex items-center justify-center shadow-2xl">
                <CheckCircle className="h-12 w-12 text-white animate-bounce" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-stone-800 mb-3">🎉 Success!</h2>
            <p className="text-stone-600 mb-8 text-lg">Your forum has been created and is now ready for meaningful discussions in your Orthodox community.</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/teacher/community"
                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-lg font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Users className="h-5 w-5 mr-3" />
                Go to Community
              </Link>
              <Link
                to={`/forums/${formData.title.toLowerCase().replace(/\s+/g, '-')}`}
                className="inline-flex items-center justify-center px-8 py-4 bg-white/90 backdrop-blur-sm hover:bg-white border-2 border-[#27AE60]/30 hover:border-[#27AE60]/60 text-[#27AE60] hover:text-[#16A085] text-lg font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <MessageSquare className="h-5 w-5 mr-3" />
                View Forum
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
      <div className="max-w-4xl mx-auto p-6 lg:p-8">
        {/* Ethiopian Orthodox Themed Header */}
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-2xl p-8 border border-[#27AE60]/25 shadow-xl mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-2xl flex items-center justify-center shadow-lg">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-800">🕊️ Create New Forum</h1>
                <p className="text-lg text-stone-600 mt-1">Start meaningful discussions in your Orthodox community</p>
              </div>
            </div>
            <Link
              to="/teacher/community"
              className="inline-flex items-center px-6 py-3 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Community
            </Link>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Forum Title Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-stone-800">Forum Details</h2>
                </div>

                <div className="pl-13">
                  <label className="block text-sm font-medium text-stone-800 mb-3">
                    Forum Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700 text-lg transition-all duration-200"
                    placeholder="e.g., Youth Bible Study Group, Prayer Warriors, Music Ministry"
                    required
                  />
                  <p className="text-sm text-stone-500 mt-2">Choose a clear, descriptive title that reflects the forum's purpose</p>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#16A085] to-[#2980B9] rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-stone-800">Description</h2>
                </div>

                <div className="pl-13">
                  <label className="block text-sm font-medium text-stone-800 mb-3">
                    What is this forum about?
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700 transition-all duration-200 resize-none"
                    placeholder="Describe the purpose, guidelines, and what members can expect from this forum..."
                  />
                  <p className="text-sm text-stone-500 mt-2">Help members understand what they'll find and discuss here</p>
                </div>
              </div>

              {/* Category Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#2980B9] to-[#27AE60] rounded-lg flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-stone-800">Category</h2>
                </div>

                <div className="pl-13">
                  <label className="block text-sm font-medium text-stone-800 mb-4">
                    Choose the most appropriate category
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categories.filter(cat => cat.value !== '').map(category => {
                      const IconComponent = category.icon;
                      return (
                        <label
                          key={category.value}
                          className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                            formData.category === category.value
                              ? 'border-[#27AE60] bg-[#27AE60]/5 shadow-md'
                              : 'border-stone-200 hover:border-[#27AE60]/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="category"
                            value={category.value}
                            checked={formData.category === category.value}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            className="sr-only"
                          />
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              formData.category === category.value
                                ? 'bg-[#27AE60] text-white'
                                : 'bg-stone-100 text-stone-500'
                            }`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className={`font-medium ${
                                formData.category === category.value ? 'text-[#27AE60]' : 'text-stone-800'
                              }`}>
                                {category.label}
                              </div>
                              <div className="text-sm text-stone-500 mt-1">
                                {category.description}
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Visibility Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#27AE60] to-[#2980B9] rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-stone-800">Visibility Settings</h2>
                </div>

                <div className="pl-13">
                  <div className="bg-gradient-to-r from-stone-50 to-neutral-50 rounded-xl p-6 border border-stone-200">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        id="isPublic"
                        checked={formData.isPublic}
                        onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                        className="w-5 h-5 mt-0.5 text-[#27AE60] border-stone-300 rounded focus:ring-[#27AE60]/50"
                      />
                      <div className="flex-1">
                        <label htmlFor="isPublic" className="text-lg font-medium text-stone-800 cursor-pointer">
                          🌍 Make this forum public
                        </label>
                        <p className="text-stone-600 mt-2">
                          {formData.isPublic
                            ? "This forum will be visible to members from all chapters in the Orthodox community."
                            : "This forum will only be visible to members of your chapter."
                          }
                        </p>
                        {formData.isPublic && (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-[#27AE60]/10 text-[#27AE60] text-sm font-medium rounded-full">
                            <Users className="h-3 w-3" />
                            Community Forum
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Unable to create forum</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-stone-200">
                <button
                  type="submit"
                  disabled={loading || !formData.title.trim()}
                  className="flex-1 inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-lg font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-3 border-stone-900 border-t-transparent rounded-full animate-spin mr-3"></div>
                      Creating Forum...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-3" />
                      Create Forum
                    </>
                  )}
                </button>
                <Link
                  to="/teacher/community"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white/90 hover:bg-white border-2 border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-lg font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <ArrowLeft className="h-5 w-5 mr-3" />
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateForum;
