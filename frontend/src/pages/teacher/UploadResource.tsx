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
  defaultScope?: 'chapter_wide' | 'platform_wide' | 'course_specific';
  defaultCourseId?: string;
  lockScope?: boolean;
}

const UploadResource: React.FC<UploadResourceProps> = ({ 
  variant = 'full', 
  target = 'library',
  lessonId,
  onUploadComplete,
  defaultScope,
  defaultCourseId,
  lockScope = false
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
  const [compressionMessage, setCompressionMessage] = useState<string | null>(null);
  const [enableImageCompression, setEnableImageCompression] = useState(variant === 'embedded');

  const isAdmin = user?.role === 'admin';

  // Initialize scope from URL params
  useEffect(() => {
    if (activeTarget === 'lesson') return;

    // Priority: explicit defaults from props
    if (defaultScope) {
      setResourceScope(defaultScope);
      if (defaultScope === 'course_specific') {
        loadCourses();
        if (defaultCourseId) setSelectedCourse(defaultCourseId);
      }
      return;
    }

    const scopeParam = searchParams.get('scope');
    if (scopeParam === 'platform' && isAdmin) {
      setResourceScope('platform_wide');
    } else if (scopeParam === 'course') {
      setResourceScope('course_specific');
      loadCourses();
    } else {
      setResourceScope('chapter_wide');
    }
  }, [searchParams, isAdmin, activeTarget, defaultScope, defaultCourseId]);

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

  // Helper: compress image to WebP (or JPEG fallback)
  const compressImage = (inputFile: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1920;
          let { width, height } = img as HTMLImageElement;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > width && height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas not supported'));
          ctx.drawImage(img, 0, 0, width, height);
          const type = 'image/webp';
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            const compressedFile = new File([blob], inputFile.name.replace(/\.[^/.]+$/, '') + '.webp', { type });
            resolve(compressedFile);
          }, type, 0.8);
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(inputFile);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size (100MB limit)
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError('File size exceeds 100MB limit');
        return;
      }
      setCompressionMessage(null);

      if (enableImageCompression && selectedFile.type.startsWith('image/')) {
        try {
          const compressed = await compressImage(selectedFile);
          if (compressed && compressed.size < selectedFile.size) {
            setFile(compressed);
            setCompressionMessage(`Compressed image from ${(selectedFile.size/1024/1024).toFixed(2)} MB to ${(compressed.size/1024/1024).toFixed(2)} MB`);
          } else {
            setFile(selectedFile);
          }
        } catch (err) {
          console.warn('Image compression failed, using original:', err);
          setFile(selectedFile);
        }
      } else {
        setFile(selectedFile);
      }
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

    if (activeTarget === 'library' && !category) {
      setError('Please select a category');
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
        // Try to append chapter_id if available to fix foreign key constraint error
        if ((user as any)?.chapter_id) {
          formData.append('chapter_id', (user as any).chapter_id.toString());
        }

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
          <div className={variant === 'full' ? "p-8" : "p-4"}>
            
            {/* Target Toggle - Only if lessonId is present */}
            {lessonId && (
              <div className="flex p-1 bg-slate-100 rounded-lg mb-8">
                <button
                  type="button"
                  onClick={() => setActiveTarget('library')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    activeTarget === 'library'
                      ? 'bg-white text-[#1e1b4b] shadow-sm'
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
                      ? 'bg-white text-[#1e1b4b] shadow-sm'
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
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-[#1e1b4b] hover:bg-[#1e1b4b]/5 transition-all duration-200">
                      <div className="w-16 h-16 bg-[#1e1b4b]/5 text-[#1e1b4b] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
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
                      accept=".pdf,.doc,.docx,.rtf,.txt,.odt,.ppt,.pptx,.odp,.xls,.xlsx,.ods,.csv,.epub,.zip,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.mp3,.wav,.m4a,.aac,.flac,.mp4,.avi,.mov,.mkv,.webm"
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
                    {compressionMessage && (
                      <div className="text-xs text-emerald-600 mr-3">{compressionMessage}</div>
                    )}
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
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent outline-none transition-all"
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
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Briefly describe this resource..."
                  />
                </div>

                {activeTarget === 'library' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {!lockScope && (
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
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent outline-none transition-all"
                      >
                        <option value="chapter_wide">Chapter Library</option>
                        {isAdmin && <option value="platform_wide">Platform Library</option>}
                        <option value="course_specific">Course Specific</option>
                      </select>
                    </div>
                    )}

                    {resourceScope === 'course_specific' && !lockScope && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Select Course <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedCourse}
                          onChange={(e) => setSelectedCourse(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent outline-none transition-all"
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

                    {resourceScope === 'course_specific' && lockScope && selectedCourse && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Destination
                        </label>
                        <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                          Uploading to this course
                        </div>
                        {variant === 'embedded' && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <input
                              id="compress-images"
                              type="checkbox"
                              checked={enableImageCompression}
                              onChange={(e) => setEnableImageCompression(e.target.checked)}
                            />
                            <label htmlFor="compress-images">Compress images before upload</label>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent outline-none transition-all"
                        required
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
                  className="w-full flex items-center justify-center px-6 py-3 bg-[#1e1b4b] hover:bg-[#1e1b4b]/90 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
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
