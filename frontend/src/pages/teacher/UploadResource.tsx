import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, ArrowLeft, FileText, Image, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const UploadResource: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [language, setLanguage] = useState('en');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size (100MB limit)
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError('File size exceeds 100MB limit');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      // Auto-fill title if empty
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) {
      return <FileText className="h-6 w-6 text-red-500" />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="h-6 w-6 text-green-500" />;
    }
    return <File className="h-6 w-6 text-blue-500" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      if (description) formData.append('description', description);
      if (category) formData.append('category', category);
      if (tags) formData.append('tags', tags);
      if (language) formData.append('language', language);
      if (topic) formData.append('topic', topic);
      if (user?.id) formData.append('author_id', user.id.toString());

      const response = await apiClient.post('/resources/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/teacher/resources');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to upload resource');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to upload resource');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-[#27AE60]/50 p-12 text-center shadow-md max-w-2xl mx-auto">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-[#27AE60]/20 rounded-full blur-xl"></div>
            <CheckCircle className="relative h-16 w-16 text-[#27AE60] mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-2">Resource Uploaded Successfully!</h2>
          <p className="text-stone-600 mb-6">Your resource has been uploaded and is now available in the resource library.</p>
          <Link
            to="/teacher/resources"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Go to Resource Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-stone-800">Upload Resource</h1>
            </div>
            <p className="text-stone-600 font-medium">Share faith-based resources with your students</p>
          </div>
          <Link
            to="/teacher/resources"
            className="inline-flex items-center px-4 py-2.5 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-semibold rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Resources
          </Link>
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-6 shadow-md max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-stone-800 mb-2">
              Resource File <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              {!file ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer bg-stone-50 hover:bg-stone-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-10 w-10 text-stone-400 mb-3" />
                    <p className="mb-2 text-sm text-stone-600">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-stone-500">PDF, DOC, DOCX, Images, etc. (Max 100MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.name)}
                    <div>
                      <p className="text-sm font-medium text-stone-800">{file.name}</p>
                      <p className="text-xs text-stone-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-stone-800 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
              placeholder="Enter resource title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-stone-800 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
              placeholder="Describe the resource content..."
            />
          </div>

          {/* Category and Language */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
              >
                <option value="">Select category</option>
                <option value="bible">Bible Study</option>
                <option value="theology">Theology</option>
                <option value="history">Church History</option>
                <option value="liturgy">Liturgy</option>
                <option value="spiritual">Spiritual Growth</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
              >
                <option value="en">English</option>
                <option value="am">Amharic</option>
                <option value="ti">Tigrinya</option>
                <option value="or">Oromo</option>
              </select>
            </div>
          </div>

          {/* Tags and Topic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
                placeholder="e.g., scripture, prayer, faith"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">
                Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
                placeholder="e.g., Holy Trinity, Prayer"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading || !file || !title.trim()}
              className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Resource
                </>
              )}
            </button>
            <Link
              to="/teacher/resources"
              className="inline-flex items-center justify-center px-6 py-3 bg-white/90 hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-semibold rounded-lg transition-all duration-200"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadResource;

