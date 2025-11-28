import React, { useState, useEffect } from 'react';
import {
  FileText,
  Target,
  Clock,
  Tag,
  BookOpen,
  PlayCircle,
  Users,
  Award,
  Star,
  Save,
  Upload,
  Eye,
  Edit3,
  Plus,
  X,
  Check,
  Trash2
} from 'lucide-react';
import { adminApi } from '@/services/api/admin';
import { landingApi } from '@/services/api/landing';

interface LandingSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const LandingPageEditor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hero' | 'about' | 'how-it-works' | 'featured-courses' | 'resources' | 'video' | 'blogs' | 'testimonials'>('hero');
  const [landingContent, setLandingContent] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections: LandingSection[] = [
    { id: 'hero', label: 'Hero Section', icon: <FileText className="h-4 w-4" />, description: 'Main landing banner with title, description, and video' },
    { id: 'about', label: 'About/Mission', icon: <Target className="h-4 w-4" />, description: 'Mission statement and feature highlights' },
    { id: 'how-it-works', label: 'How It Works', icon: <Clock className="h-4 w-4" />, description: 'Step-by-step process explanation' },
    { id: 'featured-courses', label: 'Featured Courses', icon: <BookOpen className="h-4 w-4" />, description: 'Display popular courses on landing page' },
    { id: 'resources', label: 'Resources', icon: <Tag className="h-4 w-4" />, description: 'Educational resources and materials' },
    { id: 'video', label: 'Video Section', icon: <PlayCircle className="h-4 w-4" />, description: 'Featured video content and tutorials' },
    { id: 'blogs', label: 'Blogs/Articles', icon: <Users className="h-4 w-4" />, description: 'Latest blog posts and articles' },
    { id: 'testimonials', label: 'Testimonials', icon: <Star className="h-4 w-4" />, description: 'User reviews and success stories' }
  ];

  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);

  useEffect(() => {
    fetchLandingContent();
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const response = await landingApi.getTestimonials();
      if (response.success) {
        setTestimonials(response.data.testimonials);
      }
    } catch (err) {
      console.error('Failed to fetch testimonials:', err);
    }
  };

  const fetchLandingContent = async () => {
    try {
      setLoading(true);
      const response = await landingApi.getContent();
      if (response.success) {
        setLandingContent(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch landing content:', err);
      setError('Failed to load landing page content');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async (sectionId: string, content: any) => {
    try {
      setSaving(true);
      setError(null);

      const response = await adminApi.updateLandingContent(sectionId, content);
      if (response.success) {
        setLandingContent(prev => ({
          ...prev,
          [sectionId]: content
        }));
        // Show success message could be added here
      } else {
        setError(response.message || 'Failed to save changes');
      }
    } catch (err: any) {
      console.error('Failed to save section:', err);
      setError('Failed to save changes: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const renderSectionEditor = () => {
    const currentSection = sections.find(s => s.id === activeTab);
    const currentContent = landingContent[activeTab] || {};

    switch (activeTab) {
      case 'hero':
        return (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-md rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hero Section Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                  <input
                    type="text"
                    value={currentContent.badge || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      hero: { ...prev.hero, badge: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    placeholder="e.g., For Ethiopian Orthodox Youths"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={currentContent.title || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      hero: { ...prev.hero, title: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    placeholder="Main title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title Gradient</label>
                  <input
                    type="text"
                    value={currentContent.titleGradient || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      hero: { ...prev.hero, titleGradient: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    placeholder="Gradient text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={currentContent.description || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      hero: { ...prev.hero, description: e.target.value }
                    }))}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    placeholder="Hero description"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={currentContent.showVideo || false}
                      onChange={(e) => setLandingContent(prev => ({
                        ...prev,
                        hero: { ...prev.hero, showVideo: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-[#27AE60] focus:ring-[#27AE60]"
                    />
                    <span className="text-sm text-gray-700">Show Video</span>
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleSaveSection('hero', currentContent)}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white px-6 py-2 rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Hero Section'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-md rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About/Mission Section</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                  <input
                    type="text"
                    value={currentContent.badge || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      about: { ...prev.about, badge: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    placeholder="e.g., Our Mission"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={currentContent.title || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      about: { ...prev.about, title: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    placeholder="Section title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={currentContent.description || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      about: { ...prev.about, description: e.target.value }
                    }))}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    placeholder="Section description"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleSaveSection('about', currentContent)}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white px-6 py-2 rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save About Section'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'how-it-works':
        return (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-md rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works Section</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                    <input
                      type="text"
                      value={currentContent.badge || ''}
                      onChange={(e) => setLandingContent(prev => ({
                        ...prev,
                        howItWorks: { ...prev.howItWorks, badge: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={currentContent.title || ''}
                      onChange={(e) => setLandingContent(prev => ({
                        ...prev,
                        howItWorks: { ...prev.howItWorks, title: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={currentContent.description || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      howItWorks: { ...prev.howItWorks, description: e.target.value }
                    }))}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                  />
                </div>

                {/* Steps Editor */}
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Process Steps</h4>
                  <div className="space-y-4">
                    {(currentContent.steps || []).map((step: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-12 gap-4 mb-3">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-500">Step #</label>
                            <input
                              type="text"
                              value={step.step}
                              onChange={(e) => {
                                const newSteps = [...(currentContent.steps || [])];
                                newSteps[index] = { ...step, step: e.target.value };
                                setLandingContent(prev => ({
                                  ...prev,
                                  howItWorks: { ...prev.howItWorks, steps: newSteps }
                                }));
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                          <div className="col-span-4">
                            <label className="block text-xs font-medium text-gray-500">Title</label>
                            <input
                              type="text"
                              value={step.title}
                              onChange={(e) => {
                                const newSteps = [...(currentContent.steps || [])];
                                newSteps[index] = { ...step, title: e.target.value };
                                setLandingContent(prev => ({
                                  ...prev,
                                  howItWorks: { ...prev.howItWorks, steps: newSteps }
                                }));
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                          <div className="col-span-6">
                            <label className="block text-xs font-medium text-gray-500">Description</label>
                            <input
                              type="text"
                              value={step.description}
                              onChange={(e) => {
                                const newSteps = [...(currentContent.steps || [])];
                                newSteps[index] = { ...step, description: e.target.value };
                                setLandingContent(prev => ({
                                  ...prev,
                                  howItWorks: { ...prev.howItWorks, steps: newSteps }
                                }));
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleSaveSection('howItWorks', currentContent)}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white px-6 py-2 rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save How It Works'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-md rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Testimonials</h3>
                <button
                  onClick={() => setEditingTestimonial({})}
                  className="bg-[#27AE60] text-white px-4 py-2 rounded-lg hover:bg-[#219150] transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Testimonial
                </button>
              </div>

              {editingTestimonial && (
                <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-4">
                    {editingTestimonial.id ? 'Edit Testimonial' : 'New Testimonial'}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Author Name</label>
                      <input
                        type="text"
                        value={editingTestimonial.name || ''}
                        onChange={(e) => setEditingTestimonial({ ...editingTestimonial, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role/Title</label>
                      <input
                        type="text"
                        value={editingTestimonial.role || ''}
                        onChange={(e) => setEditingTestimonial({ ...editingTestimonial, role: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                        placeholder="e.g. Student, Parent"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Review Text</label>
                    <textarea
                      value={editingTestimonial.content || ''}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, content: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={editingTestimonial.rating || 5}
                        onChange={(e) => setEditingTestimonial({ ...editingTestimonial, rating: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingTestimonial(null)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          const res = await landingApi.saveTestimonial(editingTestimonial);
                          if (res.success) {
                            fetchTestimonials();
                            setEditingTestimonial(null);
                          }
                        } catch (err) {
                          console.error(err);
                          setError('Failed to save testimonial');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      className="bg-[#27AE60] text-white px-4 py-2 rounded-lg hover:bg-[#219150] transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Testimonial'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testimonials.map((testimonial) => (
                  <div key={testimonial.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative group">
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded p-1">
                      <button
                        onClick={() => setEditingTestimonial(testimonial)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this testimonial?')) {
                            try {
                              await landingApi.deleteTestimonial(testimonial.id);
                              fetchTestimonials();
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                        {testimonial.name?.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{testimonial.name}</h4>
                        <p className="text-xs text-gray-500">{testimonial.role}</p>
                      </div>
                    </div>
                    <div className="flex text-yellow-400 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < testimonial.rating ? 'fill-current' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3">{testimonial.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white/90 backdrop-blur-md rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="text-center py-12">
              <Edit3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {currentSection?.label} Editor
              </h3>
              <p className="text-gray-600 mb-6">
                {currentSection?.description}
              </p>
              <p className="text-sm text-gray-500">
                Editor for this section coming soon...
              </p>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#27AE60] mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading landing page editor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Tab Navigation */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0 overflow-x-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm min-w-[140px] ${
                  activeTab === section.id
                    ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {section.icon}
                <span>{section.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="animate-in fade-in duration-300 p-6">
              {renderSectionEditor()}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-600 mr-3" />
              <span className="text-red-800">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPageEditor;
