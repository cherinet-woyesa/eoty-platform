import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, ArrowLeft, CheckCircle, AlertCircle, Sparkles, 
  Users, BookOpen, Heart, Music, Hand, Star, Zap, ChevronRight, ChevronLeft 
} from 'lucide-react';
import { forumsApi } from '@/services/api/community';

const CreateForum: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    isPublic: false
  });

  const categories = [
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

  const handleSubmit = async () => {
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
    if (error) setError(null);
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.title.trim()) {
        setError('Please enter a forum title to continue');
        return;
      }
      if (!formData.category) {
        setError('Please select a category to continue');
        return;
      }
    }
    setError(null);
    setCurrentStep(prev => Math.min(prev + 1, 2));
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Forum Created!</h2>
          <p className="text-slate-600 mb-8">Your new community space is ready.</p>
          <div className="animate-pulse text-sm text-slate-400">Redirecting to community...</div>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 1, label: 'Forum Details' },
    { id: 2, label: 'Review & Settings' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/teacher/community" className="p-2 hover:bg-slate-100 rounded-full transition-colors" aria-label="Back to Community">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">Create New Forum</h1>
          </div>
          <div className="text-sm text-slate-500">
            Step {currentStep} of 2
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {/* Stepper */}
        <div className="mb-8" aria-label="Progress">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-200 -z-10" />
            <div 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-green-600 -z-10 transition-all duration-300" 
              style={{ width: `${((currentStep - 1) / 1) * 100}%` }}
            />
            
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center bg-slate-50 px-2">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300 ${
                    currentStep >= step.id 
                      ? 'bg-green-600 text-white' 
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {currentStep > step.id ? <CheckCircle className="h-5 w-5" /> : step.id}
                </div>
                <span className={`text-xs mt-2 font-medium ${currentStep >= step.id ? 'text-slate-900' : 'text-slate-500'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 min-h-[400px]">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700" role="alert">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-slate-900 mb-2">
                    Forum Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    placeholder="e.g., Youth Bible Study Group"
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-slate-900 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none"
                    placeholder="What is this forum about?"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-4">
                  Select a Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isSelected = formData.category === category.value;
                    return (
                      <button
                        key={category.value}
                        onClick={() => handleInputChange('category', category.value)}
                        className={`flex items-start p-4 border rounded-xl text-left transition-all hover:shadow-md ${
                          isSelected 
                            ? 'border-green-500 bg-green-50 ring-1 ring-green-500' 
                            : 'border-slate-200 hover:border-green-500/50'
                        }`}
                        type="button"
                        aria-pressed={isSelected}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="ml-3">
                          <div className={`font-medium ${isSelected ? 'text-green-700' : 'text-slate-900'}`}>
                            {category.label}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {category.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Visibility Settings</h3>
                <div className="flex items-start gap-4">
                  <div className="flex items-center h-6">
                    <input
                      id="isPublic"
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                      className="w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="isPublic" className="text-base font-medium text-slate-900 cursor-pointer">
                      Make this forum public
                    </label>
                    <p className="text-sm text-slate-500 mt-1">
                      {formData.isPublic
                        ? "Visible to all members across all chapters."
                        : "Only visible to members of your specific chapter."
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Summary</h3>
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <dt className="text-slate-500">Title</dt>
                    <dd className="font-medium text-slate-900 text-right">{formData.title}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <dt className="text-slate-500">Category</dt>
                    <dd className="font-medium text-slate-900 text-right">
                      {categories.find(c => c.value === formData.category)?.label || formData.category}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <dt className="text-slate-500">Visibility</dt>
                    <dd className="font-medium text-slate-900 text-right">
                      {formData.isPublic ? 'Public' : 'Chapter Only'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentStep === 1 
                ? 'text-slate-300 cursor-not-allowed' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </button>

          {currentStep < 2 ? (
            <button
              onClick={nextStep}
              className="flex items-center px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
            >
              Next Step
              <ChevronRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center px-8 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Forum
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateForum;
