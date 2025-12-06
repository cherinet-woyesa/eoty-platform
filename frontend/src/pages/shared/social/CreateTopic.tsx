import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { forumsApi } from '@/services/api/community';
import { useAuth } from '@/context/AuthContext';

const CreateTopic: React.FC = () => {
  const navigate = useNavigate();
  const { forumId } = useParams<{ forumId: string }>();
  const { user, getRoleDashboard } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Please enter a topic title');
      return;
    }

    if (!formData.content.trim()) {
      setError('Please enter topic content');
      return;
    }

    if (!forumId) {
      setError('Forum ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await forumsApi.createTopic({
        forumId: parseInt(forumId),
        title: formData.title.trim(),
        content: formData.content.trim()
      });

      setSuccess(true);

      // Redirect to the forum topics page after a short delay
      setTimeout(() => {
        navigate(`/forums/${forumId}`);
      }, 1500);

    } catch (err: any) {
      console.error('Create topic error:', err);
      setError(err.response?.data?.message || 'Failed to create topic. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-[#27AE60]/25 shadow-lg p-10 text-center">
            <CheckCircle className="h-16 w-16 text-[#27AE60] mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-stone-900 mb-2">Topic Created Successfully!</h1>
            <p className="text-stone-600 mb-6">Your discussion is now visible to the community. Thank you for guiding the conversation.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to={getRoleDashboard()}
                className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Go to Dashboard
              </Link>
              <Link
                to={`/forums/${forumId}`}
                className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 px-6 py-3 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
              >
                View Forum
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-2xl border border-[#27AE60]/25 shadow-lg p-6 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Link
                to={`/forums/${forumId}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 hover:bg-white rounded-lg border border-stone-200 text-stone-700 hover:text-stone-900 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Forum
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-800">Create New Topic</h1>
                <p className="text-sm sm:text-base text-stone-600 mt-1 max-w-xl">Share thoughtful guidance, answer questions, or start a conversation grounded in Ethiopian Orthodox teaching.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-500 bg-white/80 px-3 py-2 rounded-lg border border-stone-200">
              <MessageSquare className="h-4 w-4 text-[#27AE60]" />
              Tips: craft a clear title, invite respectful dialogue, and include sources when possible.
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-stone-200 shadow-md p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Topic Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter a descriptive title for your topic"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                required
                maxLength={200}
              />
              <p className="text-xs text-stone-500 mt-1">{formData.title.length}/200 characters</p>
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Share your thoughts, ask questions, or start a discussion..."
                rows={8}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] resize-vertical"
                required
                minLength={10}
              />
              <p className="text-xs text-stone-500 mt-1">{formData.content.length} characters</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-[#27AE60]/5 border border-[#27AE60]/30 rounded-xl p-4 text-sm text-stone-700">
                <h2 className="font-semibold text-[#27AE60] mb-2">Community Guidelines</h2>
                <ul className="space-y-1 text-stone-600">
                  <li>• Keep discussions respectful and faith-aligned.</li>
                  <li>• Reference scripture or tradition when making theological points.</li>
                  <li>• Avoid sharing personal data or sensitive information.</li>
                </ul>
              </div>
              <div className="bg-[#2980B9]/5 border border-[#2980B9]/30 rounded-xl p-4 text-sm text-stone-700">
                <h2 className="font-semibold text-[#2980B9] mb-2">Helpful Prompts</h2>
                <ul className="space-y-1 text-stone-600">
                  <li>• “What does the Church teach about…?”</li>
                  <li>• “How do we guide students through…?”</li>
                  <li>• “Share a testimony or lesson learned from…”</li>
                </ul>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4">
              <Link
                to={`/forums/${forumId}`}
                className="px-4 py-2 text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 font-semibold rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Creating Topic...' : 'Create Topic'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTopic;
