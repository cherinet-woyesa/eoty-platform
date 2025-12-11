import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesApi } from '@/services/api';
import { dataCache } from '@/hooks/useRealTimeData';
import { 
  BookOpen, 
  Upload, 
  CheckCircle, 
  Sparkles, 
  Target,
  Users,
  Lock,
  Globe,
  Zap,
  Award,
  Clock,
  X,
  Plus,
  Trash2,
  AlertCircle,
  Eye,
  FileText,
  Calendar,
  Tag,
  BarChart3,
  Circle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const brandColors = {
  primary: '#1e1b4b',
  accent: '#4338ca',
  soft: 'rgba(67,56,202,0.08)',
  success: '#16A085',
};

// Types
interface CourseFormData {
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  isPublic: boolean;
  estimatedDuration: string;
  learningObjectives: string[];
  prerequisites: string;
  tags: string[];
  language: string;
  welcomeMessage?: string | undefined;
  certificationAvailable: boolean;
}

interface CourseCreationFormProps {
  editMode?: boolean;
  courseId?: string;
  initialData?: Partial<CourseFormData>;
  returnPath?: string;
}

const CourseCreationForm: React.FC<CourseCreationFormProps> = ({ 
  editMode = false,
  courseId,
  initialData,
  returnPath
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [newTag, setNewTag] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [coverUploadStatus, setCoverUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CourseFormData>(() => {
    const defaultFormData: CourseFormData = {
      title: '',
      description: '',
      category: 'faith',
      level: 'beginner',
      isPublic: true,
      estimatedDuration: '',
      learningObjectives: [''],
      prerequisites: '',
      tags: [],
      language: 'en',
      certificationAvailable: false,
    };
    return { ...defaultFormData, ...initialData };
  });

  const draftKey = useMemo(
    () => (editMode && courseId ? `edit-course-${courseId}-draft` : 'create-course-draft'),
    [editMode, courseId]
  );

  const buildDraftPayload = useCallback(() => ({
    title: formData.title,
    description: formData.description,
    category: formData.category,
    level: formData.level,
    isPublic: formData.isPublic,
    estimatedDuration: formData.estimatedDuration,
    learningObjectives: formData.learningObjectives,
    prerequisites: formData.prerequisites,
    tags: formData.tags,
    language: formData.language,
    certificationAvailable: formData.certificationAvailable,
    welcomeMessage: formData.welcomeMessage,
  }), [formData]);

  const checklistItems = useMemo(() => {
    const cleanedObjectives = formData.learningObjectives.filter(obj => obj.trim());
    return [
      {
        id: 'title',
        label: t('courses.creation.course_title'),
        done: formData.title.trim().length >= 3
      },
      {
        id: 'description',
        label: t('courses.creation.course_description'),
        done: formData.description.trim().length >= 5
      },
      {
        id: 'category',
        label: t('courses.creation.category'),
        done: !!formData.category
      },
      {
        id: 'level',
        label: t('courses.creation.difficulty_level'),
        done: !!formData.level
      },
      {
        id: 'language',
        label: t('courses.creation.language'),
        done: !!formData.language
      },
      {
        id: 'objectives',
        label: t('courses.creation.learning_objectives'),
        done: cleanedObjectives.length > 0
      },
      {
        id: 'cover',
        label: t('courses.creation.cover_image'),
        done: !!coverImage,
        optional: true
      }
    ];
  }, [formData, coverImage, t]);

  const checklistProgress = useMemo(() => {
    const completed = checklistItems.filter(item => item.done).length;
    return Math.round((completed / checklistItems.length) * 100);
  }, [checklistItems]);

  // Categories with enhanced metadata
  const categories = useMemo(() => [
    { 
      value: 'faith', 
      label: t('courses.categories.faith'), 
      icon: BookOpen, 
      color: 'emerald'
    },
    { 
      value: 'history', 
      label: t('courses.categories.history'), 
      icon: Clock, 
      color: 'amber'
    },
    { 
      value: 'spiritual', 
      label: t('courses.categories.spiritual'), 
      icon: Sparkles, 
      color: 'teal'
    },
    { 
      value: 'bible', 
      label: t('courses.categories.bible'), 
      icon: BookOpen, 
      color: 'green'
    },
    { 
      value: 'liturgical', 
      label: t('courses.categories.liturgical'), 
      icon: Award, 
      color: 'red'
    },
    { 
      value: 'youth', 
      label: t('courses.categories.youth'), 
      icon: Users, 
      color: 'cyan'
    }
  ], [t]);

  const levels = useMemo(() => [
    { 
      value: 'beginner', 
      label: t('courses.levels.beginner'), 
      color: 'green'
    },
    { 
      value: 'intermediate', 
      label: t('courses.levels.intermediate'), 
      color: 'teal'
    },
    { 
      value: 'advanced', 
      label: t('courses.levels.advanced'), 
      color: 'blue'
    }
  ], [t]);

  const languages = useMemo(() => [
    { value: 'en', label: t('common.english') },
    { value: 'am', label: t('common.amharic') }
   
  ], [t]);

  const validateForm = useCallback((): boolean => {
    const formErrors: Record<string, string> = {};
    
    // Title validation
    if (!formData.title.trim()) {
      formErrors.title = t('courses.errors.title_required');
    } else if (formData.title.trim().length < 3) {
      formErrors.title = t('courses.errors.title_too_short');
    } else if (formData.title.length > 60) {
      formErrors.title = t('courses.errors.title_too_long');
    }
    
    // Description validation (changed to 5 characters minimum)
    if (!formData.description.trim()) {
      formErrors.description = t('courses.errors.description_required');
    } else if (formData.description.length < 5) {
      formErrors.description = t('courses.errors.description_too_short');
    }
    
    // Category validation
    if (!formData.category) {
      formErrors.category = t('courses.errors.category_required');
    }
    
    // Learning objectives validation
    if (formData.learningObjectives.some(obj => !obj.trim())) {
      formErrors.learningObjectives = t('courses.errors.objectives_required');
    }
    
    // Language validation
    if (!formData.language) {
      formErrors.language = t('courses.errors.language_required');
    }
    
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  }, [formData, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setCoverUploadStatus('idle');
    setCoverUploadError(null);
    try {
      const courseData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        level: formData.level,
        isPublic: formData.isPublic,
        estimatedDuration: formData.estimatedDuration,
        learningObjectives: formData.learningObjectives.filter(obj => obj.trim()),
        prerequisites: formData.prerequisites.trim(),
        tags: formData.tags,
        language: formData.language,
        certificationAvailable: formData.certificationAvailable,
        welcomeMessage: formData.welcomeMessage?.trim(),
      };

      let result;
      if (editMode && courseId) {
        result = await coursesApi.updateCourse(courseId, courseData);
      } else {
        result = await coursesApi.createCourse(courseData);
      }

      // Handle cover image upload if present
      if (coverImageFile && result.data?.id) {
        setCoverUploadStatus('uploading');
        try {
          await coursesApi.uploadCourseImage(result.data.id, coverImageFile);
          setCoverUploadStatus('success');
        } catch (uploadError: any) {
          console.warn('Failed to upload cover image:', uploadError);
          setCoverUploadStatus('error');
          setCoverUploadError(
            uploadError?.response?.data?.message ||
            uploadError?.message ||
            t('courses.creation.cover_upload_failed')
          );
          // Continue without blocking main success
        }
      }

      // Clear the teacher dashboard cache to force a refresh of course counts
      dataCache.delete('teacher_dashboard');
      
      setSuccess(true);
      
      // Use returnPath if provided, otherwise default to teacher courses
      const redirectPath = returnPath || '/teacher/courses';
      setTimeout(() => navigate(redirectPath), 2000);
    } catch (error: any) {
      console.error('Failed to create course:', error);

      const apiData = error?.response?.data;
      // Support both shapes:
      // { success:false, error:{ code, message, details:{...} } }
      // and { success:false, message, details:{...} }
      const details =
        apiData?.error?.details ||
        apiData?.details ||
        apiData?.validationErrors ||
        apiData?.error?.validationErrors;

      const newErrors: Record<string, string> = {};

      if (details) {
        if (details.title) {
          newErrors.title = details.title;
        }
        if (details.description) {
          newErrors.description = details.description;
        }
        if (details.category) {
          newErrors.category = details.category;
        }
        if (details.level) {
          newErrors.level = details.level;
        }
        newErrors.submit =
          apiData?.error?.message ||
          apiData?.message ||
          t('courses.errors.creation_failed');
      } else {
        newErrors.submit =
          apiData?.error?.message ||
          apiData?.message ||
          t('courses.errors.creation_failed');
      }

      setErrors(newErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
    }
  }, [errors]);

  const processCoverFile = useCallback((file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, coverImage: t('courses.errors.invalid_image_type') }));
      return;
    }

    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, coverImage: t('courses.errors.image_too_large') }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCoverImage(reader.result as string);
      setCoverImageFile(file);
      setErrors(prev => ({ ...prev, coverImage: undefined }));
    };
    reader.readAsDataURL(file);
  }, [t]);

  const handleCoverChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCoverFile(file);
  }, [processCoverFile]);

  const handleCoverDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processCoverFile(file);
    }
  }, [processCoverFile]);

  const addLearningObjective = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: [...prev.learningObjectives, '']
    }));
  }, []);

  const updateLearningObjective = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: prev.learningObjectives.map((obj, i) => i === index ? value : obj)
    }));
  }, []);

  const removeLearningObjective = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: prev.learningObjectives.filter((_, i) => i !== index)
    }));
  }, []);

  const addTag = useCallback(() => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
      setErrors(prev => ({ ...prev, tags: undefined }));
    }
  }, [newTag, formData.tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  }, []);

  const handleTagKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  }, [addTag]);

  // Autosave draft to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('Failed to load draft:', error);
    }
  }, [draftKey]);

  useEffect(() => {
    const toSave = buildDraftPayload();
    
    try {
      localStorage.setItem(draftKey, JSON.stringify(toSave));
    } catch (error) {
      console.warn('Failed to save draft:', error);
    }
  }, [formData, buildDraftPayload, draftKey]);

  // Clear draft on successful submission
  useEffect(() => {
    if (success) {
      localStorage.removeItem(draftKey);
    }
  }, [success, draftKey]);

  const handleSaveDraft = useCallback(() => {
    try {
      const toSave = buildDraftPayload();
      localStorage.setItem(draftKey, JSON.stringify(toSave));
      setDraftSavedAt(new Date().toLocaleTimeString());
      setDraftError(null);
    } catch (error) {
      console.warn('Failed to save draft:', error);
      setDraftError(t('courses.creation.draft_save_error'));
    }
  }, [buildDraftPayload, draftKey, t]);

  if (success) {
    return (
      <>
        {/* Success Header */}
        <div className="bg-gradient-to-r from-[#27AE60] via-[#16A085] to-[#2980B9] rounded-xl shadow-sm p-8 text-white">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-4">
                {editMode ? t('courses.creation.update_success') : t('courses.creation.creation_success')} 🎉
              </h1>
              <p className="text-green-100 text-lg">
                {editMode 
                  ? t('courses.creation.course_updated')
                  : t('courses.creation.course_ready', { title: formData.title })
                }
              </p>
            </div>
          </div>
        </div>

        {/* Success Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-gray-600 text-lg mb-8">
            {t('courses.creation.next_steps_description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(returnPath || '/teacher/courses')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-all duration-200 shadow-lg shadow-[#27AE60]/25"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              {t('courses.creation.view_my_courses')}
            </button>
            <button
              onClick={() => navigate('/record')}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm"
            >
              <Upload className="mr-2 h-5 w-5" />
              {t('courses.creation.record_first_lesson')}
            </button>
            {editMode && courseId && (
              <button
                onClick={() => navigate(`/teacher/courses/${courseId}`)}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm"
              >
                <Eye className="mr-2 h-5 w-5" />
                {t('courses.creation.view_course')}
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-[2fr_1fr] gap-6 items-start">
          <div className="bg-white rounded-2xl border border-indigo-50 shadow-lg overflow-hidden">
            {/* Error Alert */}
            {errors.submit && (
              <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700">{errors.submit}</span>
                </div>
              </div>
            )}
            {coverUploadStatus === 'uploading' && (
              <div className="mx-6 mt-3 bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center space-x-2 text-indigo-800">
                <div className="w-4 h-4 border-t-2 border-indigo-600 border-solid rounded-full animate-spin"></div>
                <span>{t('courses.creation.cover_uploading')}</span>
              </div>
            )}
            {coverUploadStatus === 'error' && (
              <div className="mx-6 mt-3 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{coverUploadError || t('courses.creation.cover_upload_failed')}</span>
              </div>
            )}
            {coverUploadStatus === 'success' && (
              <div className="mx-6 mt-3 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span>{t('courses.creation.cover_upload_success')}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
              {/* Simplified Form - Clean and Focused */}
              <div className="space-y-6">
            {/* Course Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-2">
                {t('courses.creation.course_title')} *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                maxLength={60}
                value={formData.title}
                onChange={handleChange}
                placeholder={t('courses.creation.title_placeholder')}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4338ca] focus:border-transparent transition-all duration-200 text-lg"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-2">
                {t('courses.creation.course_description')} *
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder={t('courses.creation.description_placeholder')}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4338ca] focus:border-transparent transition-all duration-200"
              />
              <div className="flex justify-between mt-1 text-xs text-stone-500">
                <span>
                  {formData.description.length < 5 
                    ? t('courses.creation.description_too_short_warning') 
                    : ''
                  }
                </span>
                <span>{formData.description.length}/2000</span>
              </div>
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">
                  {t('courses.creation.category')} *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map(category => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          category: category.value
                        }))}
                        className={`p-3 border-2 rounded-xl text-left transition-all duration-200 ${
                          formData.category === category.value
                            ? `border-[#4338ca] bg-[#4338ca]/5 shadow-sm`
                            : 'border-stone-200 hover:border-indigo-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className={`h-4 w-4 ${formData.category === category.value ? 'text-[#4338ca]' : 'text-stone-500'} flex-shrink-0`} />
                          <div className="font-medium text-stone-900 text-sm">{category.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.category}
                  </p>
                )}
              </div>

              {/* Level and Language */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    {t('courses.creation.difficulty_level')} *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {levels.map(level => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, level: level.value as CourseFormData['level'] }))}
                        className={`p-2 border rounded-lg text-center transition-all ${
                          formData.level === level.value
                            ? `border-[#4338ca] bg-[#4338ca]/5 text-[#4338ca]`
                            : 'border-stone-200 hover:border-indigo-200'
                        }`}
                      >
                        <div className="text-xs font-medium">{level.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-stone-700 mb-2">
                    {t('courses.creation.language')} *
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4338ca] focus:border-transparent"
                  >
                    {languages.map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Learning Objectives */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">
                {t('courses.creation.learning_objectives')} *
              </label>
              <div className="space-y-2">
                {formData.learningObjectives.map((objective, index) => (
                  <div key={index} className="flex space-x-2 items-center">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={objective}
                        onChange={(e) => updateLearningObjective(index, e.target.value)}
                        placeholder={t('courses.creation.objective_placeholder', { number: index + 1 })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                      />
                    </div>
                    {formData.learningObjectives.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLearningObjective(index)}
                        className="px-2 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLearningObjective}
                  className="text-[#4338ca] hover:text-[#312e81] font-medium text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('courses.creation.add_another_objective')}
                </button>
              </div>
              {errors.learningObjectives && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.learningObjectives}
                </p>
              )}
            </div>

            {/* Optional Sections - Collapsible */}
            <div className="border-t border-stone-200 pt-4">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div className="flex items-center text-sm font-medium text-stone-700">
                    <span>Additional Options</span>
                  </div>
                  <div className="text-stone-400 group-open:rotate-180 transition-transform">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                
                <div className="mt-4 space-y-4">
                  {/* Prerequisites */}
                  <div>
                    <label htmlFor="prerequisites" className="block text-sm font-medium text-stone-700 mb-2">
                      {t('courses.creation.prerequisites')}
                    </label>
                    <textarea
                      id="prerequisites"
                      name="prerequisites"
                      rows={2}
                      value={formData.prerequisites}
                      onChange={handleChange}
                      placeholder={t('courses.creation.prerequisites_placeholder')}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      {t('courses.creation.tags')}
                    </label>
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={handleTagKeyPress}
                          placeholder={t('courses.creation.add_tag_placeholder')}
                          className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4338ca] focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={addTag}
                          disabled={!newTag.trim()}
                          className="px-3 py-2 bg-[#4338ca] text-white rounded-lg hover:bg-[#312e81] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-[#4338ca]/10 text-[#4338ca] rounded-full text-xs"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                            className="ml-1 text-[#4338ca] hover:text-[#312e81]"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      {t('courses.creation.cover_image')}
                    </label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleCoverDrop}
                      className={`relative border-2 border-dashed rounded-xl p-4 transition-colors ${
                        isDragging ? 'border-indigo-400 bg-indigo-50/60' : 'border-stone-200 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="inline-flex items-center px-3 py-2 border border-indigo-100 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition-colors">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleCoverChange} 
                          />
                          <Upload className="h-4 w-4 mr-1" />
                          {t('common.upload_image')}
                        </label>
                        <div className="text-xs text-stone-500 space-y-1">
                          <p className="font-medium text-stone-600">{t('courses.creation.cover_drop_label')}</p>
                          <p>{t('courses.creation.cover_image_guidelines')}</p>
                        </div>
                        {coverImage && (
                          <div className="relative">
                            <img 
                              src={coverImage} 
                              alt="Cover preview" 
                              className="h-16 w-24 object-cover rounded-lg border" 
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setCoverImage(null);
                                setCoverImageFile(null);
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                              aria-label={t('common.delete')}
                            >
                              <X className="h-2 w-2" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {errors.coverImage && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.coverImage}
                      </p>
                    )}
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Privacy Setting */}
                    <div className="bg-stone-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {formData.isPublic ? (
                            <Globe className="h-5 w-5 text-[#4338ca]" />
                          ) : (
                            <Lock className="h-5 w-5 text-stone-400" />
                          )}
                          <div>
                            <div className="font-medium text-stone-900 text-sm">
                              {formData.isPublic ? t('common.public_course') : t('common.private_course')}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            formData.isPublic ? 'bg-[#4338ca]' : 'bg-stone-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              formData.isPublic ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Certification */}
                    <div className="bg-stone-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Award className={`h-5 w-5 ${formData.certificationAvailable ? 'text-[#4338ca]' : 'text-stone-400'}`} />
                          <div>
                            <div className="font-medium text-stone-900 text-sm">
                              {t('courses.creation.certification_available')}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            certificationAvailable: !prev.certificationAvailable 
                          }))}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            formData.certificationAvailable ? 'bg-[#4338ca]' : 'bg-stone-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              formData.certificationAvailable ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-stone-200">
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  {draftSavedAt && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {t('courses.creation.draft_saved', { time: draftSavedAt })}
                    </span>
                  )}
                  {draftError && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {draftError}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="inline-flex items-center justify-center px-4 py-2 border border-indigo-100 text-sm font-medium rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    {t('courses.creation.save_draft')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-[#4338ca] to-[#6366f1] hover:from-[#4338ca]/90 hover:to-[#6366f1]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
                        {editMode ? t('common.updating') : t('common.creating')}...
                      </>
                    ) : (
                      <>
                        <BookOpen className="mr-2 h-4 w-4" />
                        {editMode ? t('common.update_course') : t('common.create_course')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Checklist side panel */}
          <aside className="space-y-4">
            <div className="bg-white rounded-2xl border border-indigo-50 shadow-md p-4 sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">{t('courses.creation.checklist_heading')}</p>
                  <p className="text-xs text-stone-500">{t('courses.creation.checklist_subtitle')}</p>
                </div>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {checklistProgress}%
                </span>
              </div>

              <div className="space-y-2">
                {checklistItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl border border-stone-100 hover:border-indigo-100"
                  >
                    <div className="flex items-center gap-2">
                      {item.done ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-stone-300" />
                      )}
                      <span className="text-sm text-stone-800">{item.label}</span>
                      {item.optional && (
                        <span className="text-[11px] text-stone-400">
                          {t('common.optional')}
                        </span>
                      )}
                    </div>
                    {item.done ? (
                      <span className="text-[11px] text-green-600">{t('common.done', { defaultValue: 'Done' })}</span>
                    ) : (
                      <span className="text-[11px] text-stone-400">{t('common.pending', { defaultValue: 'Pending' })}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                <p className="text-xs font-semibold text-indigo-800 mb-1">{t('courses.creation.helper_tips')}</p>
                <p className="text-xs text-indigo-700">{t('courses.creation.helper_validation')}</p>
                <p className="text-xs text-indigo-700 mt-1">{t('courses.creation.helper_media')}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default CourseCreationForm;