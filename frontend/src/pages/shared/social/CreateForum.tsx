import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { forumsApi } from '@/services/api/community';
import { useAuth } from '@/context/AuthContext';

const CreateForum: React.FC = () => {
  const navigate = useNavigate();
  const { user, getRoleDashboard } = useAuth();
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
    { value: '', label: 'Select category' },
    { value: 'general', label: 'General Discussion' },
    { value: 'spirituality', label: 'Spirituality & Faith' },
    { value: 'study', label: 'Bible Study' },
    { value: 'prayer', label: 'Prayer Requests' },
    { value: 'fellowship', label: 'Fellowship & Events' },
    { value: 'youth', label: 'Youth Ministry' },
    { value: 'music', label: 'Music & Worship' },
    { value: 'service', label: 'Community Service' },
    { value: 'other', label: 'Other' }
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
      <div className="w-full space-y-2 p-2">
        <div className="bg-white/90 backdrop-blur-md rounded-lg border border-[#27AE60]/50 p-8 text-center shadow-sm max-w-2xl mx-auto">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-[#27AE60]/20 rounded-full blur-xl"></div>
            <CheckCircle className="relative h-16 w-16 text-[#27AE60] mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-2">Forum Created Successfully!</h2>
          <p className="text-stone-600 mb-6">Your forum has been created and is now available for discussions.</p>
          <Link
            to="/teacher/community"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Go to Community
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 p-2">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3">
        <Link
          to="/teacher/community"
          className="inline-flex items-center px-3 py-1.5 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-medium rounded-lg transition-all duration-200"
        >
          <ArrowLeft className="h-3 w-3 mr-1.5" />
          Back to Community
        </Link>
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-4 w-4 text-[#2980B9]" />
          <span className="text-sm font-medium text-stone-700">Create New Forum</span>
        </div>
      </div>

      {/* Create Form */}
      <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-4 shadow-sm max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-stone-800 mb-2">
              Forum Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
              placeholder="Enter forum title..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-800 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
              placeholder="Describe the purpose of this forum..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-stone-800 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Public/Private Toggle */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => handleInputChange('isPublic', e.target.checked)}
              className="w-4 h-4 text-[#27AE60] border-stone-300 rounded focus:ring-[#27AE60]/50"
            />
            <label htmlFor="isPublic" className="text-sm text-stone-700">
              Make this forum public (visible to all chapters)
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-3">
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Create Forum
                </>
              )}
            </button>
            <Link
              to="/teacher/community"
              className="inline-flex items-center justify-center px-4 py-2 bg-white/90 hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-semibold rounded-lg transition-all duration-200"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateForum;
