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

const LandingPageEditor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hero' | 'about' | 'how-it-works' | 'featured-courses' | 'resources' | 'videos' | 'blogs' | 'testimonials'>('hero');
  const [landingContent, setLandingContent] = useState<any>({});
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
  const [videoSourceTypes, setVideoSourceTypes] = useState<{[key: number]: 'youtube' | 'upload'}>({});

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
        setLandingContent(prev => {
            const newVideos = [...(prev.videos || [])];
            // Ensure the index exists
            if (!newVideos[index]) {
                console.error('[LandingPageEditor] Video index not found in state:', index);
                alert('Error: Video index not found. Please refresh and try again.');
                return prev;
            }
            newVideos[index] = { 
                ...newVideos[index], 
                videoUrl: response.data.videoUrl
            };
            console.log('[LandingPageEditor] State updated with URL:', response.data.videoUrl);
            return { ...prev, videos: newVideos };
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                    placeholder="Hero description"
                  />
                </div>
                <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-900">Video Settings</h4>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={currentContent.showVideo || false}
                        onChange={(e) => setLandingContent(prev => ({
                          ...prev,
                          hero: { ...prev.hero, showVideo: e.target.checked }
                        }))}
                        className="rounded border-gray-300 text-[#1e1b4b] focus:ring-[#1e1b4b]"
                      />
                      <span className="text-sm text-gray-700">Show Video</span>
                    </label>
                  </div>

                  {currentContent.showVideo && (
                    <div className="space-y-4 pl-4 border-l-2 border-gray-100">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
                        <input
                          type="text"
                          value={currentContent.videoUrl || ''}
                          onChange={(e) => setLandingContent(prev => ({
                            ...prev,
                            hero: { ...prev.hero, videoUrl: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleSaveSection('hero', currentContent)}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#1e1b4b] to-[#cfa15a] text-white px-6 py-2 rounded-lg hover:from-[#1e1b4b]/90 hover:to-[#cfa15a]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                    placeholder="Section description"
                  />
                </div>

                {/* Features Editor */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-medium text-gray-900">Features / Highlights</h4>
                    <button
                      onClick={() => {
                        const newFeatures = [...(currentContent.features || []), { icon: 'Target', title: '', description: '' }];
                        setLandingContent(prev => ({
                          ...prev,
                          about: { ...prev.about, features: newFeatures }
                        }));
                      }}
                      className="text-sm text-[#1e1b4b] hover:text-[#312e81] font-medium flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add Feature
                    </button>
                  </div>
                  <div className="space-y-4">
                    {(currentContent.features || []).map((feature: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative">
                        <button
                          onClick={() => {
                            const newFeatures = [...(currentContent.features || [])];
                            newFeatures.splice(index, 1);
                            setLandingContent(prev => ({
                              ...prev,
                              about: { ...prev.about, features: newFeatures }
                            }));
                          }}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
                            <select
                              value={feature.icon || 'Target'}
                              onChange={(e) => {
                                const newFeatures = [...(currentContent.features || [])];
                                newFeatures[index] = { ...feature, icon: e.target.value };
                                setLandingContent(prev => ({
                                  ...prev,
                                  about: { ...prev.about, features: newFeatures }
                                }));
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="Target">Target</option>
                              <option value="Users">Members</option>
                              <option value="Award">Award</option>
                              <option value="BookOpen">BookOpen</option>
                              <option value="Star">Star</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                            <input
                              type="text"
                              value={feature.title || ''}
                              onChange={(e) => {
                                const newFeatures = [...(currentContent.features || [])];
                                newFeatures[index] = { ...feature, title: e.target.value };
                                setLandingContent(prev => ({
                                  ...prev,
                                  about: { ...prev.about, features: newFeatures }
                                }));
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                            <textarea
                              value={feature.description || ''}
                              onChange={(e) => {
                                const newFeatures = [...(currentContent.features || [])];
                                newFeatures[index] = { ...feature, description: e.target.value };
                                setLandingContent(prev => ({
                                  ...prev,
                                  about: { ...prev.about, features: newFeatures }
                                }));
                              }}
                              rows={2}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
                  onClick={() => handleSaveSection('about', currentContent)}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#1e1b4b] to-[#cfa15a] text-white px-6 py-2 rounded-lg hover:from-[#1e1b4b]/90 hover:to-[#cfa15a]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
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
                          <div className="col-span-3">
                            <label className="block text-xs font-medium text-gray-500">Icon</label>
                            <select
                              value={step.icon || 'User'}
                              onChange={(e) => {
                                const newSteps = [...(currentContent.steps || [])];
                                newSteps[index] = { ...step, icon: e.target.value };
                                setLandingContent(prev => ({
                                  ...prev,
                                  howItWorks: { ...prev.howItWorks, steps: newSteps }
                                }));
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="User">Member</option>
                              <option value="BookOpen">BookOpen</option>
                              <option value="PlayCircle">PlayCircle</option>
                              <option value="Award">Award</option>
                            </select>
                          </div>
                          <div className="col-span-3">
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
                          <div className="col-span-4">
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
                  className="bg-gradient-to-r from-[#1e1b4b] to-[#cfa15a] text-white px-6 py-2 rounded-lg hover:from-[#1e1b4b]/90 hover:to-[#cfa15a]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
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
                  className="bg-[#1e1b4b] text-white px-4 py-2 rounded-lg hover:bg-[#312e81] transition-colors flex items-center gap-2"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role/Title</label>
                      <input
                        type="text"
                        value={editingTestimonial.role || ''}
                        onChange={(e) => setEditingTestimonial({ ...editingTestimonial, role: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
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
                      className="bg-[#1e1b4b] text-white px-4 py-2 rounded-lg hover:bg-[#312e81] transition-colors disabled:opacity-50"
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

      case 'featured-courses':
        return (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-md rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Featured Courses</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select courses to display on the landing page. These will be prioritized over the default popular courses.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto p-2">
                {allCourses.map(course => {
                  const courseId = parseInt(course.id);
                  const isSelected = featuredCourseIds.includes(courseId);
                  return (
                    <div 
                      key={course.id} 
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-[#1e1b4b] bg-[#1e1b4b]/5 ring-1 ring-[#1e1b4b]' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setFeaturedCourseIds(prev => {
                          if (prev.includes(courseId)) {
                            return prev.filter(pid => pid !== courseId);
                          } else {
                            return [...prev, courseId];
                          }
                        });
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-[#1e1b4b] border-[#1e1b4b]'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 line-clamp-1">{course.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {course.student_count || 0} students • {course.rating || 0} ★
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              course.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {course.is_published ? 'Published' : 'Draft'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      setSaving(true);
                      await adminApi.updateFeaturedCourses(featuredCourseIds);
                      // Show success toast/message
                    } catch (err) {
                      console.error(err);
                      setError('Failed to save featured courses');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#1e1b4b] to-[#cfa15a] text-white px-6 py-2 rounded-lg hover:from-[#1e1b4b]/90 hover:to-[#cfa15a]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Featured Courses'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-md rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resources Section</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                  <input
                    type="text"
                    value={currentContent.badge || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      resources: { ...prev.resources, badge: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                    placeholder="e.g., Resources"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={currentContent.title || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      resources: { ...prev.resources, title: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                    placeholder="Section title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={currentContent.description || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      resources: { ...prev.resources, description: e.target.value }
                    }))}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                    placeholder="Section description"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleSaveSection('resources', currentContent)}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#1e1b4b] to-[#cfa15a] text-white px-6 py-2 rounded-lg hover:from-[#1e1b4b]/90 hover:to-[#cfa15a]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Resources Section'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'videos':
        return (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-md rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Video Section</h3>
                  <p className="text-sm text-gray-600">Manage the videos displayed on the landing page.</p>
                </div>
                <button
                  onClick={() => {
                    const newVideos = [...(Array.isArray(currentContent) ? currentContent : []), { title: '', description: '', thumbnail: '', videoUrl: '' }];
                    setLandingContent(prev => ({ ...prev, videos: newVideos }));
                    setExpandedVideo(newVideos.length);
                  }}
                  className="bg-[#1e1b4b] text-white px-4 py-2 rounded-lg hover:bg-[#312e81] transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Video
                </button>
              </div>
              
              <div className="space-y-4">
                {(Array.isArray(currentContent) ? currentContent : []).map((video: any, index: number) => (
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
                              const newVideos = [...currentContent];
                              newVideos.splice(index, 1);
                              setLandingContent(prev => ({ ...prev, videos: newVideos }));
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
                                const newVideos = [...currentContent];
                                newVideos[index] = { ...video, title: e.target.value };
                                setLandingContent(prev => ({ ...prev, videos: newVideos }));
                              }}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                              placeholder="Video Title"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Video Source</label>
                            <div className="flex space-x-4 mb-2">
                              <button
                                onClick={() => setVideoSourceTypes(prev => ({ ...prev, [index]: 'youtube' }))}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  (videoSourceTypes[index] || 'youtube') === 'youtube'
                                    ? 'bg-[#1e1b4b] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                YouTube Link
                              </button>
                              <button
                                onClick={() => setVideoSourceTypes(prev => ({ ...prev, [index]: 'upload' }))}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  videoSourceTypes[index] === 'upload'
                                    ? 'bg-[#1e1b4b] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                Upload Video
                              </button>
                            </div>

                            {(videoSourceTypes[index] || 'youtube') === 'youtube' ? (
                              <>
                                <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
                                <input
                                  type="text"
                                  value={video.videoUrl || ''}
                                  onChange={(e) => {
                                    const newVideos = [...currentContent];
                                    newVideos[index] = { ...video, videoUrl: e.target.value };
                                    setLandingContent(prev => ({ ...prev, videos: newVideos }));
                                  }}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                                  placeholder="https://youtube.com/..."
                                />
                              </>
                            ) : (
                              <>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Video</label>
                                <div className="flex items-center space-x-4">
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => handleVideoUpload(e, index)}
                                    disabled={uploadingVideoIndex === index}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1e1b4b]/10 file:text-[#1e1b4b] hover:file:bg-[#1e1b4b]/20 disabled:opacity-50"
                                  />
                                  {uploadingVideoIndex === index && (
                                    <div className="flex items-center text-sm text-[#1e1b4b]">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1e1b4b] mr-2"></div>
                                      Uploading...
                                    </div>
                                  )}
                                </div>
                                {video.videoUrl && !video.videoUrl.includes('youtube') && (
                                  <p className="text-xs text-gray-500 mt-1">Current video: {video.videoUrl}</p>
                                )}
                              </>
                            )}
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                              value={video.description || ''}
                              onChange={(e) => {
                                const newVideos = [...currentContent];
                                newVideos[index] = { ...video, description: e.target.value };
                                setLandingContent(prev => ({ ...prev, videos: newVideos }));
                              }}
                              rows={2}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                              placeholder="Brief description of the video content"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
                            <div className="flex gap-4">
                              <input
                                type="text"
                                value={video.thumbnail || ''}
                                onChange={(e) => {
                                  const newVideos = [...currentContent];
                                  newVideos[index] = { ...video, thumbnail: e.target.value };
                                  setLandingContent(prev => ({ ...prev, videos: newVideos }));
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                                placeholder="https://source.unsplash.com/..."
                              />
                            </div>
                          </div>
                          
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                              <input
                                type="text"
                                value={video.duration || ''}
                                onChange={(e) => {
                                  const newVideos = [...currentContent];
                                  newVideos[index] = { ...video, duration: e.target.value };
                                  setLandingContent(prev => ({ ...prev, videos: newVideos }));
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                                placeholder="e.g. 10:00"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                              <input
                                type="text"
                                value={video.category || ''}
                                onChange={(e) => {
                                  const newVideos = [...currentContent];
                                  newVideos[index] = { ...video, category: e.target.value };
                                  setLandingContent(prev => ({ ...prev, videos: newVideos }));
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                                placeholder="e.g. Teaching"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                              <input
                                type="text"
                                value={video.author || ''}
                                onChange={(e) => {
                                  const newVideos = [...currentContent];
                                  newVideos[index] = { ...video, author: e.target.value };
                                  setLandingContent(prev => ({ ...prev, videos: newVideos }));
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                                placeholder="e.g. Deacon Yared"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {(Array.isArray(currentContent) ? currentContent : []).length === 0 && (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <PlayCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">No videos added yet</p>
                    <p className="text-sm mt-1">Click "Add Video" to start building your video gallery.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleSaveSection('videos', currentContent)}
                  disabled={saving || uploadingVideoIndex !== null}
                  className="bg-gradient-to-r from-[#1e1b4b] to-[#cfa15a] text-white px-6 py-2 rounded-lg hover:from-[#1e1b4b]/90 hover:to-[#cfa15a]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : (uploadingVideoIndex !== null ? 'Uploading Video...' : 'Save Video Section')}
                </button>
              </div>
            </div>
          </div>
        );

      case 'blogs':
        return (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-md rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Blogs/News Section</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                  <input
                    type="text"
                    value={currentContent.badge || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      blogs: { ...prev.blogs, badge: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={currentContent.title || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      blogs: { ...prev.blogs, title: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={currentContent.description || ''}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      blogs: { ...prev.blogs, description: e.target.value }
                    }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Posts to Show</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={currentContent.count || 3}
                    onChange={(e) => setLandingContent(prev => ({
                      ...prev,
                      blogs: { ...prev.blogs, count: parseInt(e.target.value) }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleSaveSection('blogs', currentContent)}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#1e1b4b] to-[#cfa15a] text-white px-6 py-2 rounded-lg hover:from-[#1e1b4b]/90 hover:to-[#cfa15a]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Blogs Section'}
                </button>
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

      <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-gray-200 overflow-hidden flex h-[calc(100vh-8rem)]">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r border-gray-200 flex-shrink-0 bg-gray-50/50 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Page Sections
            </h2>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === section.id
                      ? 'bg-[#1e1b4b]/10 text-[#1e1b4b]'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className={`${activeTab === section.id ? 'text-[#1e1b4b]' : 'text-gray-400'}`}>
                    {section.icon}
                  </span>
                  <div className="text-left">
                    <span className="block">{section.label}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-6 max-w-4xl mx-auto animate-in fade-in duration-300">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {sections.find(s => s.id === activeTab)?.label}
              </h2>
              <p className="text-gray-500 mt-1">
                {sections.find(s => s.id === activeTab)?.description}
              </p>
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
                    className="text-sm font-medium px-3 py-1.5 rounded-lg border"
                    style={{ color: brandColors.primaryHex, borderColor: brandColors.primaryHex }}
                  >
                    Retry
                  </button>
                  <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                    ×
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
