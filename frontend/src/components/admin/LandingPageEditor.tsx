import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Eye, Edit2, Trash2, Plus } from 'lucide-react';
import { adminApi } from '@/services/api/admin';

interface LandingContent {
  hero?: {
    badge: string;
    title: string;
    titleGradient: string;
    description: string;
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

const LandingPageEditor: React.FC = () => {
  const [content, setContent] = useState<LandingContent>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'hero' | 'about' | 'howItWorks'>('hero');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/landing/content');
      const data = await response.json();
      if (data.success) {
        setContent(data.data);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      showMessage('error', 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const saveSection = async (section: string, sectionContent: any) => {
    try {
      setSaving(true);
      const response = await adminApi.updateLandingContent(section, sectionContent);
      if (response.success) {
        showMessage('success', 'Content saved successfully!');
        setContent(response.data);
      }
    } catch (error) {
      console.error('Error saving content:', error);
      showMessage('error', 'Failed to save content');
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
            { id: 'howItWorks', label: 'How It Works' }
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

        {/* Preview Button */}
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

