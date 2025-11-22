import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Eye, Edit2, Trash2, Plus, Play } from 'lucide-react';
import { adminApi } from '@/services/api/admin';

interface LandingContent {
  hero?: {
    badge: string;
    title: string;
    titleGradient: string;
    description: string;
    videoUrl?: string;
    showVideo?: boolean;
  };
  about?: {
    badge: string;
    title: string;
    description: string;
    features: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
  };
  howItWorks?: {
    badge: string;
    title: string;
    description: string;
    steps: Array<{
      step: string;
      icon: string;
      title: string;
      description: string;
      features: string[];
    }>;
  };
}

import { useAuth } from '@/context/AuthContext';

// ... existing interfaces ...

const LandingPageEditor: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [content, setContent] = useState<LandingContent>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'hero' | 'about' | 'howItWorks' | 'preview'>('hero');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Log authentication status
  console.log('👤 LandingPageEditor: Auth status:', {
    isAuthenticated,
    user: user ? {
      id: user.id,
      email: user.email,
      role: user.role
    } : null
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getLandingContent();
      if (response.success) {
        setContent(response.data);
      } else {
        showMessage('error', response.message || 'Failed to load content');
      }
    } catch (error: any) {
      console.error('Error fetching content:', error);
      const errorMessage = error?.response?.data?.message
        || error?.message
        || 'Failed to load content. Please check your connection.';
      showMessage('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const saveSection = async (section: string, sectionContent: any) => {
    try {
      setSaving(true);
      setMessage(null); // Clear previous messages
      const response = await adminApi.updateLandingContent(section, sectionContent);

      if (response.success) {
        showMessage('success', 'Content saved successfully!');
        setContent(response.data);
      } else {
        showMessage('error', response.message || 'Failed to save content');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message
        || error?.message
        || 'Failed to save content. Please check your connection and try again.';
      showMessage('error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const updateHero = (field: string, value: string) => {
    setContent(prev => ({
      ...prev,
      hero: { ...prev.hero!, [field]: value }
    }));
  };

  const updateAbout = (field: string, value: any) => {
    setContent(prev => ({
      ...prev,
      about: { ...prev.about!, [field]: value }
    }));
  };

  const updateAboutFeature = (index: number, field: string, value: string) => {
    setContent(prev => {
      const features = [...(prev.about?.features || [])];
      features[index] = { ...features[index], [field]: value };
      return {
        ...prev,
        about: { ...prev.about!, features }
      };
    });
  };

  const updateHowItWorks = (field: string, value: any) => {
    setContent(prev => ({
      ...prev,
      howItWorks: { ...prev.howItWorks!, [field]: value }
    }));
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      showMessage('error', 'Video file size must be less than 50MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      showMessage('error', 'Please select a valid video file');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('video', file);
      formData.append('section', 'hero');

      // Upload video using admin API
      const response = await adminApi.uploadLandingVideo(formData);

      if (response.success) {
        updateHero('videoUrl', response.data.videoUrl);
        // Automatically save the hero section after successful video upload
        try {
          await saveSection('hero', { ...content.hero!, videoUrl: response.data.videoUrl });
          showMessage('success', 'Video uploaded and saved successfully!');
        } catch (saveError: any) {
          console.error('Failed to save video URL:', saveError);
          showMessage('error', 'Video uploaded but failed to save. Please click "Save Changes" manually.');
        }
      } else {
        showMessage('error', response.message || 'Failed to upload video');
      }
    } catch (error: any) {
      console.error('Video upload error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload video. Please try again.';
      showMessage('error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const updateStep = (index: number, field: string, value: any) => {
    setContent(prev => {
      const steps = [...(prev.howItWorks?.steps || [])];
      steps[index] = { ...steps[index], [field]: value };
      return {
        ...prev,
        howItWorks: { ...prev.howItWorks!, steps }
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-[#00FFC6]" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-[#FAF0E6] to-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Landing Page Editor</h1>
          <p className="text-gray-600">Manage your landing page content</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-[#00FFC6]/20 border border-[#00FFC6]/40 text-gray-800' 
              : 'bg-red-100 border border-red-400 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex space-x-2 mb-6 bg-white/80 backdrop-blur-xl p-2 rounded-xl border border-gray-200/50">
          {[
            { id: 'hero', label: 'Hero Section' },
            { id: 'about', label: 'About/Mission' },
            { id: 'howItWorks', label: 'How It Works' },
            { id: 'preview', label: 'Preview Landing Page' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeSection === tab.id
                  ? 'bg-gradient-to-r from-[#00FFC6] to-[#00D4FF] text-gray-900 shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Hero Section Editor */}
        {activeSection === 'hero' && content.hero && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Hero Section</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Badge Text</label>
                <input
                  type="text"
                  value={content.hero.badge}
                  onChange={(e) => updateHero('badge', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#00FFC6] focus:ring-2 focus:ring-[#00FFC6]/20 transition-all"
                  placeholder="For Ethiopian Orthodox Youths"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title (First Line)</label>
                <input
                  type="text"
                  value={content.hero.title}
                  onChange={(e) => updateHero('title', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#00FFC6] focus:ring-2 focus:ring-[#00FFC6]/20 transition-all"
                  placeholder="Transform Your"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title Gradient (Second Line)</label>
                <input
                  type="text"
                  value={content.hero.titleGradient}
                  onChange={(e) => updateHero('titleGradient', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#00FFC6] focus:ring-2 focus:ring-[#00FFC6]/20 transition-all"
                  placeholder="Learning Journey"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={content.hero.description}
                  onChange={(e) => updateHero('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#00FFC6] focus:ring-2 focus:ring-[#00FFC6]/20 transition-all"
                  placeholder="Join our faith-centered learning community..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hero Video (Optional)</label>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleVideoUpload(e)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#00FFC6] focus:ring-2 focus:ring-[#00FFC6]/20 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#00FFC6] file:text-gray-900 hover:file:bg-[#00E6B3]"
                  />
                  {content.hero.videoUrl && (
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <Play className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-700">Video uploaded: {content.hero.videoUrl.split('/').pop()}</span>
                      <button
                        onClick={() => updateHero('videoUrl', '')}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">Upload MP4, WebM, or OGV video files (max 50MB)</p>
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={content.hero.showVideo || false}
                    onChange={(e) => updateHero('showVideo', e.target.checked)}
                    className="w-4 h-4 text-[#00FFC6] bg-gray-100 border-gray-300 rounded focus:ring-[#00FFC6] focus:ring-2"
                  />
                  <span className="text-sm font-semibold text-gray-700">Show video in hero section</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">If enabled, video will autoplay muted in background</p>
              </div>

              <button
                onClick={() => saveSection('hero', content.hero)}
                disabled={saving}
                className="w-full bg-gradient-to-r from-[#00FFC6] to-[#00D4FF] text-gray-900 px-6 py-3 rounded-lg font-semibold hover:from-[#00E6B3] hover:to-[#00BFEA] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save Hero Section</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* About Section Editor */}
        {activeSection === 'about' && content.about && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">About/Mission Section</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Badge Text</label>
                <input
                  type="text"
                  value={content.about.badge}
                  onChange={(e) => updateAbout('badge', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#00FFC6] focus:ring-2 focus:ring-[#00FFC6]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={content.about.title}
                  onChange={(e) => updateAbout('title', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#00FFC6] focus:ring-2 focus:ring-[#00FFC6]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={content.about.description}
                  onChange={(e) => updateAbout('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#00FFC6] focus:ring-2 focus:ring-[#00FFC6]/20 transition-all"
                />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Features</h3>
                <div className="space-y-4">
                  {content.about.features.map((feature, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Icon Name</label>
                          <input
                            type="text"
                            value={feature.icon}
                            onChange={(e) => updateAboutFeature(index, 'icon', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-sm"
                            placeholder="BookOpen"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                          <input
                            type="text"
                            value={feature.title}
                            onChange={(e) => updateAboutFeature(index, 'title', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-sm"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                          <textarea
                            value={feature.description}
                            onChange={(e) => updateAboutFeature(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => saveSection('about', content.about)}
                disabled={saving}
                className="w-full bg-gradient-to-r from-[#00FFC6] to-[#00D4FF] text-gray-900 px-6 py-3 rounded-lg font-semibold hover:from-[#00E6B3] hover:to-[#00BFEA] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save About Section</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* How It Works Section Editor */}
        {activeSection === 'howItWorks' && content.howItWorks && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">How It Works Section</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Badge Text</label>
                <input
                  type="text"
                  value={content.howItWorks.badge}
                  onChange={(e) => updateHowItWorks('badge', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#00FFC6] focus:ring-2 focus:ring-[#00FFC6]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={content.howItWorks.title}
                  onChange={(e) => updateHowItWorks('title', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#00FFC6] focus:ring-2 focus:ring-[#00FFC6]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={content.howItWorks.description}
                  onChange={(e) => updateHowItWorks('description', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#00FFC6] focus:ring-2 focus:ring-[#00FFC6]/20 transition-all"
                />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Steps</h3>
                <div className="space-y-6">
                  {content.howItWorks.steps.map((step, index) => (
                    <div key={index} className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Step Number</label>
                          <input
                            type="text"
                            value={step.step}
                            onChange={(e) => updateStep(index, 'step', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-sm"
                            placeholder="01"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Icon Name</label>
                          <input
                            type="text"
                            value={step.icon}
                            onChange={(e) => updateStep(index, 'icon', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-sm"
                            placeholder="User"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => updateStep(index, 'title', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                          <textarea
                            value={step.description}
                            onChange={(e) => updateStep(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Features (comma-separated)</label>
                        <input
                          type="text"
                          value={step.features.join(', ')}
                          onChange={(e) => updateStep(index, 'features', e.target.value.split(',').map(f => f.trim()))}
                          className="w-full px-3 py-2 rounded border border-gray-300 text-sm"
                          placeholder="Free forever, No credit card, Instant access"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => saveSection('howItWorks', content.howItWorks)}
                disabled={saving}
                className="w-full bg-gradient-to-r from-[#00FFC6] to-[#00D4FF] text-gray-900 px-6 py-3 rounded-lg font-semibold hover:from-[#00E6B3] hover:to-[#00BFEA] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save How It Works Section</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {activeSection === 'preview' && (
          <div className="space-y-8">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Landing Page Preview</h2>
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#00FFC6] to-[#00D4FF] text-gray-900 font-semibold rounded-lg hover:shadow-lg transition-all shadow-md hover:shadow-xl text-sm"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Live</span>
                </a>
              </div>
              <p className="text-gray-600 mt-2">Preview how your landing page will look to visitors</p>
            </div>

            {/* Preview Content - Styled like the actual landing page */}
            <div className="bg-gradient-to-br from-gray-50 to-white min-h-screen rounded-2xl border border-gray-200/50 shadow-xl overflow-hidden">

              {/* Hero Section Preview */}
              {content.hero && (
                <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
                  {/* Background Video or Effects */}
                  {content.hero.showVideo && content.hero.videoUrl ? (
                    <div className="absolute inset-0 opacity-10">
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <div className="w-16 h-16 mx-auto mb-2 border-2 border-gray-400 rounded-lg flex items-center justify-center">
                            <Play className="w-8 h-8" />
                          </div>
                          <p className="text-sm">Video Background</p>
                          <p className="text-xs mt-1 truncate max-w-xs">{content.hero.videoUrl}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 opacity-10" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }}></div>
                  )}

                  <div className="relative z-10 max-w-6xl mx-auto text-center">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#FFD700]/20 rounded-full border border-[#FFD700]/40 backdrop-blur-sm mb-8">
                      <div className="h-4 w-4 rounded-full bg-[#FFD700]"></div>
                      <span className="text-sm font-medium">{content.hero.badge || 'For Ethiopian Orthodox Youths'}</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                      <span className="block">{content.hero.title || 'Transform Your'}</span>
                      <span className="block bg-gradient-to-r from-[#00FFC6] via-[#00D4FF] to-[#FF00FF] bg-clip-text text-transparent">
                        {content.hero.titleGradient || 'Learning Journey'}
                      </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto mb-8">
                      {content.hero.description || 'Join our faith-centered learning community. Access courses, track progress, and grow in your spiritual journey.'}
                    </p>
                  </div>
                </section>
              )}

              {/* About Section Preview */}
              {content.about && (
                <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                      <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#FFD700]/20 rounded-full border border-[#FFD700]/40 backdrop-blur-sm mb-6">
                        <div className="h-4 w-4 rounded-full bg-[#FFD700]"></div>
                        <span className="text-sm font-medium">{content.about.badge || 'Our Mission'}</span>
                      </div>

                      <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
                        {content.about.title || 'Empowering Ethiopian Orthodox Youths'}
                      </h2>

                      <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                        {content.about.description || 'Empowering Ethiopian Orthodox youths through faith-centered education. Nurturing spiritual growth with quality learning that honors our traditions.'}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* How It Works Section Preview */}
              {content.howItWorks && (
                <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-white">
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                      <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#FFD700]/20 rounded-full border border-[#FFD700]/40 backdrop-blur-sm mb-6">
                        <div className="h-4 w-4 rounded-full bg-[#FFD700]"></div>
                        <span className="text-sm font-medium">{content.howItWorks.badge || 'Simple Process'}</span>
                      </div>

                      <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
                        {content.howItWorks.title || 'How It Works'}
                      </h2>

                      <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-12">
                        {content.howItWorks.description || 'Start your learning journey in minutes'}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                      {(content.howItWorks.steps || []).map((step: any, index: number) => {
                        const colors = ['#00FFC6', '#FF00FF', '#FFD700', '#00D4FF'];
                        const color = colors[index % colors.length];

                        return (
                          <div
                            key={index}
                            className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 text-center"
                          >
                            <div
                              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                              style={{ backgroundColor: `${color}20` }}
                            >
                              <div className="text-2xl font-bold" style={{ color }}>{step.step}</div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">{step.title}</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* Footer Preview */}
              <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
                <div className="max-w-6xl mx-auto text-center">
                  <p className="text-gray-400">© 2024 EOTY Platform. All rights reserved.</p>
                </div>
              </footer>
            </div>
          </div>
        )}

        {/* Preview Button - Keep for backward compatibility */}
        <div className="mt-8 flex justify-center">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-lg border-2 border-gray-300/50 hover:bg-white hover:border-gray-400/50 transition-all shadow-lg hover:shadow-xl"
          >
            <Eye className="h-5 w-5" />
            <span>Preview Landing Page</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default LandingPageEditor;

