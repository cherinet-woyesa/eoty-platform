import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Upload, File, FileText, Image, X, CheckCircle, AlertCircle, ArrowLeft, BookOpen, Globe, Hash, Tag, Sparkles, Link as LinkIcon, Trash2 } from 'lucide-react';
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Complete!</h2>
          <p className="text-slate-600 mb-8">Your resource has been successfully added to the library.</p>

          <div className="flex flex-col gap-3">
            <Link
              to="/teacher/resources"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              View Library
            </Link>
            <button
              onClick={() => {
                setSuccess(false);
                setFile(null);
                setTitle('');
                setDescription('');
              }}
              className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-colors"
            >
              Upload Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const content = (
    <div className={variant === 'full' ? "min-h-screen bg-slate-50 p-6 lg:p-8" : "w-full"}>
      <div className={variant === 'full' ? "max-w-3xl mx-auto" : ""}>
        {/* Header - Only show in full variant */}
        {variant === 'full' && (
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Upload Resource</h1>
              <p className="text-slate-500 mt-1">Add new materials to your library</p>
            </div>
            <Link
              to="/teacher/resources"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </Link>
          </div>
        )}

        {/* Main Form Card */}
        <div className={`${variant === 'full' ? 'bg-white rounded-2xl border border-slate-200 shadow-sm' : 'bg-white rounded-xl border border-slate-200'} overflow-hidden`}>
          <div className={variant === 'full' ? "p-8" : "p-6"}>
            
            {/* Target Toggle - Only if lessonId is present */}
            {lessonId && (
              <div className="flex p-1 bg-slate-100 rounded-lg mb-8">
                <button
                  type="button"
                  onClick={() => setActiveTarget('library')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    activeTarget === 'library'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  Add to Library
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTarget('lesson')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    activeTarget === 'lesson'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <LinkIcon className="h-4 w-4" />
                  Direct Lesson Attachment
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* File Upload Area */}
              <div>
                {!file ? (
                  <label className="block group cursor-pointer">
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200">
                      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Click to upload or drag and drop</h3>
                      <p className="text-slate-500 text-sm max-w-xs mx-auto">
                        Support for PDF, DOC, Images, Audio and Video files (Max 100MB)
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
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm">
                        {getFileIcon(file.name)}
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 truncate max-w-[200px] sm:max-w-xs">{file.name}</h3>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                {activeTarget === 'library' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="e.g., Introduction to Liturgy"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Briefly describe this resource..."
                  />
                </div>

                {activeTarget === 'library' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Scope
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
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="chapter_wide">Chapter Library</option>
                        {isAdmin && <option value="platform_wide">Platform Library</option>}
                        <option value="course_specific">Course Specific</option>
                      </select>
                    </div>

                    {resourceScope === 'course_specific' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Select Course <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedCourse}
                          onChange={(e) => setSelectedCourse(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                          <option value="">Choose a course...</option>
                          {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="">Select category...</option>
                        <option value="bible">Bible Study</option>
                        <option value="theology">Theology</option>
                        <option value="history">History</option>
                        <option value="liturgy">Liturgy</option>
                        <option value="spiritual">Spiritual Growth</option>
                        <option value="education">Education</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading || !file || (activeTarget === 'library' && !title.trim())}
                  className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      Upload Resource
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  return content;
};

export default UploadResource;
