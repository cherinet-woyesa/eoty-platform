import React, { useState, useEffect } from 'react';
import {
  FileText,
  Target,
  Clock,
  Tag,
  BookOpen,
  PlayCircle,
  Users,
  Star,
  Save,
  Edit3,
  Plus,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { adminApi } from '@/services/api/admin';
import { landingApi } from '@/services/api/landing';
import { coursesApi } from '@/services/api';
import { brandColors } from '@/theme/brand';

interface LandingSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface LandingContentState {
  [key: string]: any;
}

const LandingPageEditor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hero' | 'about' | 'how-it-works' | 'featured-courses' | 'resources' | 'videos' | 'blogs' | 'testimonials'>('hero');
  const [landingContent, setLandingContent] = useState<LandingContentState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const sections: LandingSection[] = [
    { id: 'hero', label: 'Hero Section', icon: <FileText className="h-4 w-4" />, description: 'Main landing banner with title, description, and video' },
    { id: 'about', label: 'About/Mission', icon: <Target className="h-4 w-4" />, description: 'Mission statement and feature highlights' },
    { id: 'how-it-works', label: 'How It Works', icon: <Clock className="h-4 w-4" />, description: 'Step-by-step process explanation' },
    { id: 'featured-courses', label: 'Featured Courses', icon: <BookOpen className="h-4 w-4" />, description: 'Display popular courses on landing page' },
    { id: 'resources', label: 'Resources', icon: <Tag className="h-4 w-4" />, description: 'Educational resources and materials' },
    { id: 'videos', label: 'Video Section', icon: <PlayCircle className="h-4 w-4" />, description: 'Featured video content and tutorials' },
    { id: 'blogs', label: 'Blogs/Articles', icon: <Users className="h-4 w-4" />, description: 'Latest blog posts and articles' },
    { id: 'testimonials', label: 'Testimonials', icon: <Star className="h-4 w-4" />, description: 'User reviews and success stories' }
  ];

  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [featuredCourseIds, setFeaturedCourseIds] = useState<number[]>([]);
  const [expandedVideo, setExpandedVideo] = useState<number | null>(null);
  const [uploadingVideoIndex, setUploadingVideoIndex] = useState<number | null>(null);
  // Track video source type per video index. Default to 'youtube'
  const [videoSourceTypes, setVideoSourceTypes] = useState<{ [key: number]: 'youtube' | 'upload' }>({});

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(`[LandingPageEditor] Starting upload for video ${index}:`, file.name, file.size);

    try {
      setUploadingVideoIndex(index);
      const formData = new FormData();
      formData.append('file', file);

      const response = await adminApi.uploadLandingVideo(formData);
      console.log('[LandingPageEditor] Upload response:', response);

      if (response.success) {
        setLandingContent((prev: any) => {
          const section = prev.videos || {};
          const videoList = [...(section.videos || [])];

          // Ensure the index exists
          if (!videoList[index]) {
            console.error('[LandingPageEditor] Video index not found in state:', index);
            alert('Error: Video index not found. Please refresh and try again.');
            return prev;
          }

          videoList[index] = {
            ...videoList[index],
            videoUrl: response.data.videoUrl
          };

          console.log('[LandingPageEditor] State updated with URL:', response.data.videoUrl);
          return {
            ...prev,
            videos: { ...section, videos: videoList }
          };
        });
        alert('Video uploaded successfully!');
      } else {
        console.error('[LandingPageEditor] Upload failed:', response.message);
        setError('Failed to upload video: ' + (response.message || 'Unknown error'));
        alert('Failed to upload video: ' + (response.message || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('[LandingPageEditor] Error uploading video:', err);
      setError('Error uploading video: ' + (err.message || 'Network error'));
    } finally {
      setUploadingVideoIndex(null);
    }
  };

  useEffect(() => {
    fetchLandingContent();
    fetchTestimonials();
  }, []);

  useEffect(() => {
    if (activeTab === 'featured-courses') {
      fetchCoursesData();
    }
  }, [activeTab]);

  const fetchCoursesData = async (silent?: boolean) => {
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      const [coursesRes, featuredRes] = await Promise.all([
        coursesApi.getCourses(),
        landingApi.getFeaturedCourses()
      ]);

      if (coursesRes.success) {
        setAllCourses(coursesRes.data.courses);
      }

      if (featuredRes.success) {
        setFeaturedCourseIds(featuredRes.data.courses.map((c: any) => parseInt(c.id)));
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setError('Failed to load courses');
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

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

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([
        fetchLandingContent({ silent: true }),
        fetchTestimonials(),
        activeTab === 'featured-courses' ? fetchCoursesData(true) : Promise.resolve(),
      ]);
    } catch (err) {
      console.error('Failed to refresh landing data', err);
      setError('Failed to refresh content. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchLandingContent = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent;
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await landingApi.getContent();
      if (response.success) {
        setLandingContent(response.data);
        setLastUpdated(new Date().toISOString());
      }
    } catch (err: any) {
      console.error('Failed to fetch landing content:', err);
      setError('Failed to load landing page content');
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  const handleSaveSection = async (sectionId: string, content: any) => {
    try {
      setSaving(true);
      setError(null);

      const response = await adminApi.updateLandingContent(sectionId, content);
      if (response.success) {
        setLandingContent((prev: any) => ({
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-semibold text-gray-900">Main Banner Configuration</h3>
                <p className="text-sm text-gray-500 mt-1">Customize the primary visual and text users see first.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={currentContent.badge || ''}
                      onChange={(e) => setLandingContent((prev: any) => ({
                        ...prev,
                        hero: { ...prev.hero, badge: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                      placeholder="e.g. Empowering EOTC Education"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Main Heading</label>
                    <input
                      type="text"
                      value={currentContent.title || ''}
                      onChange={(e) => setLandingContent((prev: any) => ({
                        ...prev,
                        hero: { ...prev.hero, title: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                      placeholder="e.g. Welcome to EOTY"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title Gradient Text (Optional)</label>
                  <input
                    type="text"
                    value={currentContent.titleGradient || ''}
                    onChange={(e) => setLandingContent((prev: any) => ({
                      ...prev,
                      hero: { ...prev.hero, titleGradient: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Text to be highlighted in gradient"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subheading / Description</label>
                  <textarea
                    value={currentContent.description || ''}
                    onChange={(e) => setLandingContent((prev: any) => ({
                      ...prev,
                      hero: { ...prev.hero, description: e.target.value }
                    }))}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    placeholder="Brief description below the main headline..."
                  />
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Video & Visuals</h4>
                  <div className="flex flex-col gap-4">
                    <label className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer w-fit">
                      <input
                        type="checkbox"
                        checked={currentContent.showVideo || false}
                        onChange={(e) => setLandingContent((prev: any) => ({
                          ...prev,
                          hero: { ...prev.hero, showVideo: e.target.checked }
                        }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Show Video in Hero</span>
                    </label>

                    {currentContent.showVideo && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Video Source URL (YouTube/MP4)</label>
                          <input
                            type="text"
                            value={currentContent.videoUrl || ''}
                            onChange={(e) => setLandingContent((prev: any) => ({
                              ...prev,
                              hero: { ...prev.hero, videoUrl: e.target.value }
                            }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="https://..."
                          />
                        </div>
                        {/* Upload option could go here */}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => handleSaveSection('hero', currentContent)}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-semibold text-gray-900">About & Mission</h3>
                <p className="text-sm text-gray-500 mt-1">Define the core mission statement and key highlights.</p>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                    <input
                      type="text"
                      value={currentContent.badge || ''}
                      onChange={(e) => setLandingContent((prev: any) => ({
                        ...prev,
                        about: { ...prev.about, badge: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. Our Mission"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                    <input
                      type="text"
                      value={currentContent.title || ''}
                      onChange={(e) => setLandingContent((prev: any) => ({
                        ...prev,
                        about: { ...prev.about, title: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Section title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={currentContent.description || ''}
                      onChange={(e) => setLandingContent((prev: any) => ({
                        ...prev,
                        about: { ...prev.about, description: e.target.value }
                      }))}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Section description"
                    />
                  </div>
                </div>

                {/* Features List */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-900">Key Features / Highlights</h4>
                    <button
                      onClick={() => {
                        const newFeatures = [...(currentContent.features || []), { icon: 'Target', title: '', description: '' }];
                        setLandingContent((prev: any) => ({
                          ...prev,
                          about: { ...prev.about, features: newFeatures }
                        }));
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" /> Add Feature
                    </button>
                  </div>

                  <div className="space-y-4">
                    {currentContent.features?.map((feature: any, index: number) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative group">
                        <button
                          onClick={() => {
                            const newFeatures = currentContent.features.filter((_: any, i: number) => i !== index);
                            setLandingContent((prev: any) => ({
                              ...prev,
                              about: { ...prev.about, features: newFeatures }
                            }));
                          }}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Feature Title</label>
                            <input
                              type="text"
                              value={feature.title}
                              onChange={(e) => {
                                const newFeatures = [...currentContent.features];
                                newFeatures[index].title = e.target.value;
                                setLandingContent((prev: any) => ({ ...prev, about: { ...prev.about, features: newFeatures } }));
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500"
                              placeholder="Feature Title"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Icon Name (Lucide)</label>
                            <input
                              type="text"
                              value={feature.icon}
                              onChange={(e) => {
                                const newFeatures = [...currentContent.features];
                                newFeatures[index].icon = e.target.value;
                                setLandingContent((prev: any) => ({ ...prev, about: { ...prev.about, features: newFeatures } }));
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500"
                              placeholder="e.g. Target, Users, Book"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                            <textarea
                              value={feature.description}
                              onChange={(e) => {
                                const newFeatures = [...currentContent.features];
                                newFeatures[index].description = e.target.value;
                                setLandingContent((prev: any) => ({ ...prev, about: { ...prev.about, features: newFeatures } }));
                              }}
                              rows={2}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500"
                              placeholder="Feature description..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!currentContent.features || currentContent.features.length === 0) && (
                      <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        No features added yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => handleSaveSection('about', currentContent)}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        );


      case 'how-it-works':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-semibold text-gray-900">How It Works</h3>
                <p className="text-sm text-gray-500 mt-1">Explain the process to users step-by-step.</p>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                  <input
                    type="text"
                    value={currentContent.title || ''}
                    onChange={(e) => setLandingContent((prev: any) => ({
                      ...prev,
                      'how-it-works': { ...prev['how-it-works'], title: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. How It Works"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={currentContent.description || ''}
                    onChange={(e) => setLandingContent((prev: any) => ({
                      ...prev,
                      'how-it-works': { ...prev['how-it-works'], description: e.target.value }
                    }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Brief overview..."
                  />
                </div>

                {/* Steps Editor */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-900">Process Steps</h4>
                    <button
                      onClick={() => {
                        const newSteps = [...(currentContent.steps || []), { title: '', description: '', icon: 'Check' }];
                        setLandingContent((prev: any) => ({
                          ...prev,
                          'how-it-works': { ...prev['how-it-works'], steps: newSteps }
                        }));
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" /> Add Step
                    </button>
                  </div>

                  <div className="space-y-4">
                    {currentContent.steps?.map((step: any, index: number) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative group">
                        <button
                          onClick={() => {
                            const newSteps = currentContent.steps.filter((_: any, i: number) => i !== index);
                            setLandingContent((prev: any) => ({
                              ...prev,
                              'how-it-works': { ...prev['how-it-works'], steps: newSteps }
                            }));
                          }}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1 grid grid-cols-1 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Step Title</label>
                              <input
                                type="text"
                                value={step.title}
                                onChange={(e) => {
                                  const newSteps = [...currentContent.steps];
                                  newSteps[index].title = e.target.value;
                                  setLandingContent((prev: any) => ({ ...prev, 'how-it-works': { ...prev['how-it-works'], steps: newSteps } }));
                                }}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500"
                                placeholder="Step Title"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                              <textarea
                                value={step.description}
                                onChange={(e) => {
                                  const newSteps = [...currentContent.steps];
                                  newSteps[index].description = e.target.value;
                                  setLandingContent((prev: any) => ({ ...prev, 'how-it-works': { ...prev['how-it-works'], steps: newSteps } }));
                                }}
                                rows={2}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500"
                                placeholder="Description..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!currentContent.steps || currentContent.steps.length === 0) && (
                      <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        No steps added yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => handleSaveSection('how-it-works', currentContent)}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'featured-courses':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-semibold text-gray-900">Featured Courses</h3>
                <p className="text-sm text-gray-500 mt-1">Select which courses appear on the landing page.</p>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                  <input
                    type="text"
                    value={currentContent.title || ''}
                    onChange={(e) => setLandingContent((prev: any) => ({
                      ...prev,
                      'featured-courses': { ...prev['featured-courses'], title: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. Popular Courses"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Courses</label>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-96 overflow-y-auto space-y-2">
                    {loading && <div className="text-center py-4">Loading courses...</div>}
                    {!loading && allCourses.map((course) => (
                      <label key={course.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded-md transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={featuredCourseIds.includes(parseInt(course.id))}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...featuredCourseIds, parseInt(course.id)]
                              : featuredCourseIds.filter(id => id !== parseInt(course.id));
                            setFeaturedCourseIds(newIds);
                            // Also update content state if needed for strict saving
                            setLandingContent((prev: any) => ({
                              ...prev,
                              'featured-courses': { ...prev['featured-courses'], courseIds: newIds }
                            }));
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{course.title}</div>
                          <div className="text-xs text-gray-500">{course.instructor?.name || 'Unknown Instructor'}</div>
                        </div>
                        {featuredCourseIds.includes(parseInt(course.id)) && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Selected</span>}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Selected courses will be displayed in the order they were added or by default sorting.</p>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => handleSaveSection('featured-courses', { ...currentContent, courseIds: featuredCourseIds })}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Selection'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-semibold text-gray-900">Resources Section</h3>
                <p className="text-sm text-gray-500 mt-1">Manage downloadable resources and materials.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                    <input
                      type="text"
                      value={currentContent.badge || ''}
                      onChange={(e) => setLandingContent((prev: any) => ({
                        ...prev,
                        'resources': { ...prev['resources'], badge: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. Resources"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                    <input
                      type="text"
                      value={currentContent.title || ''}
                      onChange={(e) => setLandingContent((prev: any) => ({
                        ...prev,
                        'resources': { ...prev['resources'], title: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. Free Resources"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={currentContent.description || ''}
                    onChange={(e) => setLandingContent((prev: any) => ({
                      ...prev,
                      'resources': { ...prev['resources'], description: e.target.value }
                    }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Section description..."
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => handleSaveSection('resources', currentContent)}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Resources'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'videos':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Video Section</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage featured videos and tutorials.</p>
                </div>
                <button
                  onClick={() => {
                    const newVideos = [...(Array.isArray(currentContent.videos) ? currentContent.videos : []), { title: '', description: '', thumbnail: '', videoUrl: '' }];
                    setLandingContent((prev: any) => ({ ...prev, videos: { ...prev.videos, videos: newVideos } }));
                    setExpandedVideo(newVideos.length - 1);
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm text-sm"
                >
                  <Plus className="h-4 w-4" /> Add Video
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                    <input
                      type="text"
                      value={currentContent.title || ''}
                      onChange={(e) => setLandingContent((prev: any) => ({
                        ...prev,
                        'videos': { ...prev['videos'], title: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. Featured Videos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={currentContent.description || ''}
                      onChange={(e) => setLandingContent((prev: any) => ({
                        ...prev,
                        'videos': { ...prev['videos'], description: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Section description..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {(Array.isArray(currentContent.videos) ? currentContent.videos : []).map((video: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg bg-white overflow-hidden transition-all duration-200 hover:shadow-md">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer bg-gray-50/50 hover:bg-gray-50"
                        onClick={() => setExpandedVideo(expandedVideo === index ? null : index)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                            {video.thumbnail ? (
                              <img src={video.thumbnail} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-400">
                                <PlayCircle className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{video.title || 'Untitled Video'}</h4>
                            <p className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-xs">{video.videoUrl || 'No URL set'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to remove this video?')) {
                                const newVideos = [...currentContent.videos];
                                newVideos.splice(index, 1);
                                setLandingContent((prev: any) => ({ ...prev, videos: { ...prev.videos, videos: newVideos } }));
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {expandedVideo === index ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {expandedVideo === index && (
                        <div className="p-4 border-t border-gray-100 bg-white animate-in slide-in-from-top-2 duration-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                              <input
                                type="text"
                                value={video.title || ''}
                                onChange={(e) => {
                                  const newVideos = [...currentContent.videos];
                                  newVideos[index] = { ...video, title: e.target.value };
                                  setLandingContent((prev: any) => ({ ...prev, videos: { ...prev.videos, videos: newVideos } }));
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Video Title"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Video Source</label>
                              <div className="flex space-x-4 mb-2">
                                <button
                                  onClick={() => setVideoSourceTypes(prev => ({ ...prev, [index]: 'youtube' }))}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${(videoSourceTypes[index] || 'youtube') === 'youtube'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                  YouTube Link
                                </button>
                                <button
                                  onClick={() => setVideoSourceTypes(prev => ({ ...prev, [index]: 'upload' }))}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${videoSourceTypes[index] === 'upload'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                  Upload Video
                                </button>
                              </div>

                              {(videoSourceTypes[index] || 'youtube') === 'youtube' ? (
                                <input
                                  type="text"
                                  value={video.videoUrl || ''}
                                  onChange={(e) => {
                                    const newVideos = [...currentContent.videos];
                                    newVideos[index] = { ...video, videoUrl: e.target.value };
                                    setLandingContent((prev: any) => ({ ...prev, videos: { ...prev.videos, videos: newVideos } }));
                                  }}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  placeholder="https://youtube.com/..."
                                />
                              ) : (
                                <div className="flex items-center space-x-4">
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => handleVideoUpload(e, index)}
                                    disabled={uploadingVideoIndex === index}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                                  />
                                  {uploadingVideoIndex === index && <span className="text-xs text-indigo-600 animate-pulse">Uploading...</span>}
                                </div>
                              )}
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                              <textarea
                                value={video.description || ''}
                                onChange={(e) => {
                                  const newVideos = [...currentContent.videos];
                                  newVideos[index] = { ...video, description: e.target.value };
                                  setLandingContent((prev: any) => ({ ...prev, videos: { ...prev.videos, videos: newVideos } }));
                                }}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Brief description..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
                              <input
                                type="text"
                                value={video.thumbnail || ''}
                                onChange={(e) => {
                                  const newVideos = [...currentContent.videos];
                                  newVideos[index] = { ...video, thumbnail: e.target.value };
                                  setLandingContent((prev: any) => ({ ...prev, videos: { ...prev.videos, videos: newVideos } }));
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="https://..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                              <input
                                type="text"
                                value={video.author || ''}
                                onChange={(e) => {
                                  const newVideos = [...currentContent.videos];
                                  newVideos[index] = { ...video, author: e.target.value };
                                  setLandingContent((prev: any) => ({ ...prev, videos: { ...prev.videos, videos: newVideos } }));
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Author name"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {(Array.isArray(currentContent.videos) ? currentContent.videos : []).length === 0 && (
                    <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                      No videos added yet.
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => handleSaveSection('videos', currentContent)}
                  disabled={saving || uploadingVideoIndex !== null}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : (uploadingVideoIndex !== null ? 'Uploading...' : 'Save Videos')}
                </button>
              </div>
            </div>
          </div>
        );

      case 'blogs':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-semibold text-gray-900">Blogs & Articles</h3>
                <p className="text-sm text-gray-500 mt-1">Configure the blog highlights section.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                    <input
                      type="text"
                      value={currentContent.badge || ''}
                      onChange={(e) => setLandingContent((prev: any) => ({
                        ...prev,
                        'blogs': { ...prev['blogs'], badge: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. Latest News"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Posts Count</label>
                    <input
                      type="number"
                      value={currentContent.count || 3}
                      onChange={(e) => setLandingContent((prev: any) => ({
                        ...prev,
                        'blogs': { ...prev['blogs'], count: parseInt(e.target.value) }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                  <input
                    type="text"
                    value={currentContent.title || ''}
                    onChange={(e) => setLandingContent((prev: any) => ({
                      ...prev,
                      'blogs': { ...prev['blogs'], title: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. From Our Blog"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={currentContent.description || ''}
                    onChange={(e) => setLandingContent((prev: any) => ({
                      ...prev,
                      'blogs': { ...prev['blogs'], description: e.target.value }
                    }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Section description..."
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => handleSaveSection('blogs', currentContent)}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Blogs'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Testimonials</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage user reviews and success stories.</p>
                </div>
                <button
                  onClick={() => setEditingTestimonial({})}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm text-sm"
                >
                  <Plus className="h-4 w-4" /> Add Testimonial
                </button>
              </div>

              <div className="p-6">
                {editingTestimonial && (
                  <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-5 animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {editingTestimonial.id ? 'Edit Testimonial' : 'New Testimonial'}
                      </h4>
                      <button onClick={() => setEditingTestimonial(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Author Name</label>
                        <input
                          type="text"
                          value={editingTestimonial.name || ''}
                          onChange={(e) => setEditingTestimonial({ ...editingTestimonial, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm"
                          placeholder="e.g. John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Role/Title</label>
                        <input
                          type="text"
                          value={editingTestimonial.role || ''}
                          onChange={(e) => setEditingTestimonial({ ...editingTestimonial, role: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm"
                          placeholder="e.g. Student"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Review Text</label>
                      <textarea
                        value={editingTestimonial.content || ''}
                        onChange={(e) => setEditingTestimonial({ ...editingTestimonial, content: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm"
                        placeholder="What did they say?"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="w-1/3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Rating (1-5)</label>
                        <select
                          value={editingTestimonial.rating || 5}
                          onChange={(e) => setEditingTestimonial({ ...editingTestimonial, rating: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm"
                        >
                          {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r} Stars</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTestimonial(null)}
                          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              setSaving(true);
                              const res = await landingApi.saveTestimonial(editingTestimonial);
                              if (res.success) {
                                if (fetchTestimonials) fetchTestimonials();
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
                          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(testimonials || []).map((t: any) => (
                    <div key={t.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow relative bg-gray-50/30">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                            {t.name?.[0] || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                            <div className="text-xs text-gray-500">{t.role}</div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingTestimonial(t)}
                            className="text-gray-400 hover:text-indigo-600 p-1"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Delete testimonial?')) {
                                await landingApi.deleteTestimonial(t.id);
                                if (fetchTestimonials) fetchTestimonials();
                              }
                            }}
                            className="text-gray-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 italic line-clamp-3">"{t.content}"</p>
                      <div className="mt-2 text-yellow-400 text-xs">
                        {"★".repeat(t.rating || 5)}{"☆".repeat(5 - (t.rating || 5))}
                      </div>
                    </div>
                  ))}
                  {(!testimonials || testimonials.length === 0) && (
                    <div className="col-span-full py-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                      No testimonials yet. Add one to build trust!
                    </div>
                  )}
                </div>
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

  if (loading && isInitialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e1b4b] mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading landing page editor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Landing Page Editor</h1>
          <p className="text-sm text-gray-600">Manage hero, sections, and homepage highlights.</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border shadow-sm transition-colors disabled:opacity-50"
            style={{ color: brandColors.primaryHex, borderColor: brandColors.primaryHex, backgroundColor: '#fff' }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-72 border-r border-gray-200 flex-shrink-0 bg-slate-50 flex flex-col">
          <div className="p-5 border-b border-gray-200">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Page Sections</div>
            <p className="text-sm text-gray-500">Select a section to edit</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id as any)}
                className={`w-full flex items-center justify-between px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${activeTab === section.id
                  ? 'bg-white shadow-sm border border-gray-200 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${activeTab === section.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                    {section.icon}
                  </span>
                  <span>{section.label}</span>
                </div>
                {activeTab === section.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50/30">
          <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-300">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {sections.find(s => s.id === activeTab)?.label}
                </h2>
                <p className="text-gray-500 mt-1">
                  {sections.find(s => s.id === activeTab)?.description}
                </p>
              </div>

              {/* Context Action Button (e.g. Preview Section) - Placeholder */}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <X className="h-5 w-5 text-red-600 mr-3" />
                  <span className="text-red-800">{error}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefresh}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg border hover:bg-white transition-colors"
                    style={{ color: brandColors.primaryHex, borderColor: brandColors.primaryHex }}
                  >
                    Retry
                  </button>
                  <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {renderSectionEditor()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPageEditor;
