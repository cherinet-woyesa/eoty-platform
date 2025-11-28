import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Upload, File, FileText, Image, X, CheckCircle, AlertCircle, ArrowLeft, BookOpen, Globe, Hash, Tag, Sparkles, Link as LinkIcon } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';
import { lessonResourcesApi } from '@/services/api/lessonResources';
import { coursesApi } from '@/services/api';

interface UploadResourceProps {
  variant?: 'full' | 'embedded';
  target?: 'library' | 'lesson';
  lessonId?: string;
  onUploadComplete?: () => void;
}

const UploadResource: React.FC<UploadResourceProps> = ({ 
  variant = 'full', 
  target = 'library',
  lessonId,
  onUploadComplete 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // State
  const [activeTarget, setActiveTarget] = useState<'library' | 'lesson'>(target);
  const [autoAttach, setAutoAttach] = useState(true);
  
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [language, setLanguage] = useState('en');
  const [topic, setTopic] = useState('');
  const [resourceScope, setResourceScope] = useState<'chapter_wide' | 'platform_wide' | 'course_specific'>('chapter_wide');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Initialize scope from URL params
  useEffect(() => {
    if (activeTarget === 'lesson') return;

    const scopeParam = searchParams.get('scope');
    if (scopeParam === 'platform' && isAdmin) {
      setResourceScope('platform_wide');
    } else if (scopeParam === 'course') {
      setResourceScope('course_specific');
      loadCourses();
    } else {
      setResourceScope('chapter_wide');
    }
  }, [searchParams, isAdmin, activeTarget]);

  // Update activeTarget if target prop changes
  useEffect(() => {
    setActiveTarget(target);
  }, [target]);

  const loadCourses = async () => {
    try {
      const response = await apiClient.get('/courses/teacher');
      if (response.data.success) {
        setCourses(response.data.data.courses || []);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

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

    if (activeTarget === 'library' && !title.trim()) {
      setError('Please enter a title');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeTarget === 'lesson' && lessonId) {
        // Upload directly to Lesson (Lesson Resource)
        await lessonResourcesApi.uploadResource(lessonId, {
          file,
          description: description || undefined
        });
        setSuccess(true);
      } else {
        // Upload to Library
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        if (description) formData.append('description', description);
        if (category) formData.append('category', category);
        if (tags) formData.append('tags', tags);
        if (language)       formData.append('language', language);
        if (topic) formData.append('topic', topic);
        formData.append('resourceScope', resourceScope);
        if (resourceScope === 'course_specific' && selectedCourse) {
          formData.append('courseId', selectedCourse);
        }
        if (user?.id) formData.append('author_id', user.id.toString());

        const response = await apiClient.post('/resources/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          // If auto-attach is enabled and we have a lessonId, attach the new library resource to the lesson
          if (autoAttach && lessonId) {
            const resourceId = response.data.data?.id || response.data.resource?.id || response.data.id;
            if (resourceId) {
              try {
                await coursesApi.addResourceToLesson(parseInt(lessonId), resourceId);
              } catch (attachErr) {
                console.error('Failed to auto-attach resource:', attachErr);
                // Don't fail the whole upload, just warn
              }
            }
          }
          setSuccess(true);
        } else {
          throw new Error(response.data.message || 'Failed to upload resource');
        }
      }

      if (onUploadComplete) {
        onUploadComplete();
      }
      
      if (variant === 'full') {
        setTimeout(() => {
          navigate('/teacher/resources');
        }, 2000);
      } else {
        // Reset form for next upload
        setFile(null);
        setTitle('');
        setDescription('');
        setSuccess(false); // Reset success state manually if embedded
      }

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to upload resource');
    } finally {
      setLoading(false);
    }
  };

  if (success && variant === 'full') {
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
                <h1 className="text-3xl font-bold text-stone-800">📚 Resource Uploaded!</h1>
                <p className="text-lg text-stone-600 mt-1">Your teaching material is now live</p>
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
            <p className="text-stone-600 mb-8 text-lg">Your educational resource has been uploaded and is now available to enhance Orthodox learning and spiritual growth.</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/teacher/resources"
                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-lg font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <BookOpen className="h-5 w-5 mr-3" />
                View My Resources
              </Link>
              <Link
                to="/teacher/content?tab=upload"
                className="inline-flex items-center justify-center px-8 py-4 bg-white/90 backdrop-blur-sm hover:bg-white border-2 border-[#27AE60]/30 hover:border-[#27AE60]/60 text-[#27AE60] hover:text-[#16A085] text-lg font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Upload className="h-5 w-5 mr-3" />
                Upload Another
          </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const content = (
    <div className={variant === 'full' ? "max-w-4xl mx-auto p-6 lg:p-8" : "w-full"}>
      {/* Ethiopian Orthodox Themed Header - Only show in full variant */}
      {variant === 'full' && (
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-2xl p-8 border border-[#27AE60]/25 shadow-xl mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-2xl flex items-center justify-center shadow-lg">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-800">
                  {activeTarget === 'lesson' ? '📤 Add Lesson Resource' : '📤 Upload Educational Resource'}
                </h1>
                <p className="text-lg text-stone-600 mt-1">
                  {activeTarget === 'lesson' ? 'Upload materials for this specific lesson' : 'Share teaching materials for Orthodox spiritual growth'}
                </p>
              </div>
            </div>
            <Link
              to="/teacher/content"
              className="inline-flex items-center px-6 py-3 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Content
            </Link>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className={`${variant === 'full' ? 'bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200 shadow-xl' : 'bg-white rounded-xl border border-stone-200'} overflow-hidden`}>
        <div className={variant === 'full' ? "p-8" : "p-6"}>
          
          {/* Target Toggle - Only if lessonId is present */}
          {lessonId && (
            <div className="flex p-1 bg-stone-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setActiveTarget('library')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTarget === 'library'
                    ? 'bg-white text-[#27AE60] shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Add to Library
              </button>
              <button
                type="button"
                onClick={() => setActiveTarget('lesson')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTarget === 'lesson'
                    ? 'bg-white text-[#2980B9] shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <LinkIcon className="h-4 w-4" />
                Direct Lesson Attachment
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* File Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-lg flex items-center justify-center">
                  <File className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-stone-800">Resource File</h2>
              </div>

              <div className="pl-13">
                {!file ? (
                  <label className="block">
                    <div className="border-2 border-dashed border-[#27AE60]/30 rounded-xl p-8 text-center cursor-pointer bg-gradient-to-br from-[#27AE60]/5 to-[#16A085]/5 hover:from-[#27AE60]/10 hover:to-[#16A085]/10 transition-all duration-300 hover:shadow-lg">
                      <Upload className="h-12 w-12 text-[#27AE60] mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-stone-800 mb-2">📎 Choose Your Teaching Resource</h3>
                      <p className="text-stone-600 mb-4">
                        Click here or drag & drop your educational material
                      </p>
                      <p className="text-sm text-stone-500 bg-stone-50 rounded-lg px-4 py-2 inline-block">
                        📄 PDFs &bull; 📝 Documents &bull; 🖼️ Images &bull; 🎵 Audio &bull; 🎬 Video (Max 100MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.mp3,.mp4,.avi,.mov"
                    />
                  </label>
                ) : (
                  <div className="bg-gradient-to-r from-stone-50 to-neutral-50 rounded-xl p-6 border-2 border-[#27AE60]/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-lg flex items-center justify-center shadow-md">
                          {getFileIcon(file.name)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-stone-800">{file.name}</h3>
                          <p className="text-stone-600">
                            📏 {(file.size / 1024 / 1024).toFixed(2)} MB &bull;
                            📂 {file.type || 'Unknown type'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove file"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resource Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#16A085] to-[#2980B9] rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-stone-800">Resource Details</h2>
              </div>

              <div className="pl-13 space-y-6">
                {/* Title - Only for Library Upload */}
                {activeTarget === 'library' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-800 mb-3">
                      Resource Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700 text-lg transition-all duration-200"
                      placeholder="e.g., Introduction to Ethiopian Orthodox Liturgy, Bible Study Guide"
                      required
                    />
                    <p className="text-sm text-stone-500 mt-2">Choose a clear, descriptive title for your teaching resource</p>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-stone-800 mb-3">
                    Description {activeTarget === 'library' && '& Learning Objectives'}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700 transition-all duration-200 resize-none"
                    placeholder={activeTarget === 'lesson' ? "Optional description for this file..." : "Describe what this resource covers and how it will help students in their Orthodox faith journey..."}
                  />
                </div>
              </div>
            </div>

            {/* Organization Section - Only for Library Upload */}
            {activeTarget === 'library' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#2980B9] to-[#27AE60] rounded-lg flex items-center justify-center">
                    <Tag className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-stone-800">Organization & Discovery</h2>
                </div>

                <div className="pl-13 space-y-6">
                  {/* Resource Scope */}
                  <div>
                    <label className="block text-sm font-medium text-stone-800 mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-[#2980B9]" />
                      Resource Scope <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={resourceScope}
                      onChange={(e) => {
                        const newScope = e.target.value as 'chapter_wide' | 'platform_wide' | 'course_specific';
                        setResourceScope(newScope);
                        if (newScope === 'course_specific') {
                          loadCourses();
                        }
                      }}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700 transition-all duration-200"
                    >
                      <option value="chapter_wide">📚 Chapter Library - Available to all chapter members</option>
                      {isAdmin && <option value="platform_wide">🌍 Platform Library - Available to all users</option>}
                      <option value="course_specific">📖 Course Specific - Available to enrolled students only</option>
                    </select>
                    <p className="text-sm text-stone-500 mt-2">
                      Choose where this resource will be available to students
                    </p>
                  </div>

                  {/* Course Selection for Course-specific Resources */}
                  {resourceScope === 'course_specific' && (
                    <div>
                      <label className="block text-sm font-medium text-stone-800 mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-[#27AE60]" />
                        Select Course <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700 transition-all duration-200"
                      >
                        <option value="">Choose a course...</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title} - {course.description?.substring(0, 50)}...
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-stone-500 mt-2">
                        This resource will only be visible to students enrolled in the selected course
                      </p>
                    </div>
                  )}

                  {/* Category and Language */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-stone-800 mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-[#27AE60]" />
                        Orthodox Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700 transition-all duration-200"
                      >
                        <option value="">Choose a category</option>
                        <option value="bible">📖 Bible Study & Scripture</option>
                        <option value="theology">✨ Theology & Doctrine</option>
                        <option value="history">🏛️ Church History</option>
                        <option value="liturgy">🕊️ Liturgy & Worship</option>
                        <option value="spiritual">🙏 Spiritual Growth</option>
                        <option value="education">📚 Religious Education</option>
                        <option value="other">🎭 Other Topics</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-800 mb-3 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-[#2980B9]" />
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700 transition-all duration-200"
                      >
                        <option value="en">🇺🇸 English</option>
                        <option value="am">🇪🇹 Amharic</option>
                        <option value="ti">🇪🇷 Tigrinya</option>
                        <option value="or">🇪🇹 Oromo</option>
                      </select>
                    </div>
                  </div>

                  {/* Tags and Topic */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-stone-800 mb-3 flex items-center gap-2">
                        <Hash className="h-4 w-4 text-[#16A085]" />
                        Tags (for discovery)
                      </label>
                      <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700 transition-all duration-200"
                        placeholder="scripture, prayer, fasting, liturgy"
                      />
                      <p className="text-sm text-stone-500 mt-2">Comma-separated keywords to help students find this resource</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-800 mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#2980B9]" />
                        Specific Topic
                      </label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700 transition-all duration-200"
                        placeholder="Holy Trinity, Prayer, Fasting"
                      />
                      <p className="text-sm text-stone-500 mt-2">The main subject or theme of this resource</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Auto-Attach Checkbox - Only if Library Upload AND LessonId present */}
            {activeTarget === 'library' && lessonId && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <input
                  type="checkbox"
                  id="autoAttach"
                  checked={autoAttach}
                  onChange={(e) => setAutoAttach(e.target.checked)}
                  className="w-5 h-5 text-[#27AE60] rounded focus:ring-[#27AE60] border-gray-300"
                />
                <label htmlFor="autoAttach" className="text-sm font-medium text-stone-700 cursor-pointer">
                  Automatically attach this resource to the current lesson after upload
                </label>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Upload failed</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-stone-200">
              <button
                type="submit"
                disabled={loading || !file || (activeTarget === 'library' && !title.trim())}
                className="flex-1 inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-lg font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-3 border-stone-900 border-t-transparent rounded-full animate-spin mr-3"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-3" />
                    {activeTarget === 'lesson' ? 'Add to Lesson' : 'Share Teaching Resource'}
                  </>
                )}
              </button>
              {variant === 'full' && (
                <Link
                  to="/teacher/content"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white/90 hover:bg-white border-2 border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-lg font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <ArrowLeft className="h-5 w-5 mr-3" />
                  Back to Content
                </Link>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadResource;
