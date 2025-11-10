import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesApi } from '../../services/api';
import { 
  BookOpen, 
  Upload, 
  ArrowLeft, 
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
  BarChart3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  price?: number | undefined;
  language: string;
  welcomeMessage?: string | undefined;
  certificationAvailable: boolean;
}

interface CourseCreationFormProps {
  editMode?: boolean;
  courseId?: string;
  initialData?: Partial<CourseFormData>;
}

const CourseCreationForm: React.FC<CourseCreationFormProps> = ({ 
  editMode = false,
  courseId,
  initialData 
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [newTag, setNewTag] = useState('');
  const [showPreview, setShowPreview] = useState(false);

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

  // Categories with enhanced metadata
  const categories = useMemo(() => [
    { 
      value: 'faith', 
      label: t('courses.categories.faith'), 
      icon: BookOpen, 
      color: 'blue',
      description: t('courses.categories.faith_description')
    },
    { 
      value: 'history', 
      label: t('courses.categories.history'), 
      icon: Clock, 
      color: 'amber',
      description: t('courses.categories.history_description')
    },
    { 
      value: 'spiritual', 
      label: t('courses.categories.spiritual'), 
      icon: Sparkles, 
      color: 'purple',
      description: t('courses.categories.spiritual_description')
    },
    { 
      value: 'bible', 
      label: t('courses.categories.bible'), 
      icon: BookOpen, 
      color: 'green',
      description: t('courses.categories.bible_description')
    },
    { 
      value: 'liturgical', 
      label: t('courses.categories.liturgical'), 
      icon: Award, 
      color: 'red',
      description: t('courses.categories.liturgical_description')
    },
    { 
      value: 'youth', 
      label: t('courses.categories.youth'), 
      icon: Users, 
      color: 'pink',
      description: t('courses.categories.youth_description')
    }
  ], [t]);

  const levels = useMemo(() => [
    { 
      value: 'beginner', 
      label: t('courses.levels.beginner'), 
      description: t('courses.levels.beginner_description'),
      color: 'green',
      icon: BookOpen
    },
    { 
      value: 'intermediate', 
      label: t('courses.levels.intermediate'), 
      description: t('courses.levels.intermediate_description'),
      color: 'blue',
      icon: Target
    },
    { 
      value: 'advanced', 
      label: t('courses.levels.advanced'), 
      description: t('courses.levels.advanced_description'),
      color: 'purple',
      icon: Award
    }
  ], [t]);

  const durations = useMemo(() => [
    { value: '1-2', label: t('courses.durations.1_2_weeks'), description: t('courses.durations.short_course') },
    { value: '3-4', label: t('courses.durations.3_4_weeks'), description: t('courses.durations.standard_course') },
    { value: '5-8', label: t('courses.durations.5_8_weeks'), description: t('courses.durations.comprehensive_course') },
    { value: '9+', label: t('courses.durations.9_plus_weeks'), description: t('courses.durations.extended_program') }
  ], [t]);

  const languages = useMemo(() => [
    { value: 'en', label: t('common.english') },
    { value: 'am', label: t('common.amharic') },
    { value: 'ar', label: t('common.arabic') },
    { value: 'fr', label: t('common.french') },
    { value: 'es', label: t('common.spanish') }
  ], [t]);

  const validateStep = useCallback((step: number): boolean => {
    const stepErrors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!formData.title.trim()) {
          stepErrors.title = t('courses.errors.title_required');
        } else if (formData.title.length > 60) {
          stepErrors.title = t('courses.errors.title_too_long');
        }
        if (!formData.description.trim()) {
          stepErrors.description = t('courses.errors.description_required');
        } else if (formData.description.length < 50) {
          stepErrors.description = t('courses.errors.description_too_short');
        }
        break;
      
      case 2:
        if (!formData.category) {
          stepErrors.category = t('courses.errors.category_required');
        }
        if (formData.learningObjectives.some(obj => !obj.trim())) {
          stepErrors.learningObjectives = t('courses.errors.objectives_required');
        }
        break;
      
      case 3:
        if (formData.tags.length === 0) {
          stepErrors.tags = t('courses.errors.tags_required');
        }
        if (!formData.language) {
          stepErrors.language = t('courses.errors.language_required');
        }
        break;
    }
    
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }, [formData, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < 3) {
      if (!validateStep(currentStep)) return;
      setCurrentStep(currentStep + 1);
      return;
    }

    // Final validation
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setIsSubmitting(true);
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
        ...(formData.price !== undefined && { price: formData.price })
      };

      let result;
      if (editMode && courseId) {
        result = await coursesApi.updateCourse(courseId, courseData);
      } else {
        result = await coursesApi.createCourse(courseData);
      }

      // Handle cover image upload if present
      if (coverImageFile && result.data?.id) {
        try {
          await coursesApi.uploadCourseImage(result.data.id, coverImageFile);
        } catch (uploadError) {
          console.warn('Failed to upload cover image:', uploadError);
          // Continue without the image
        }
      }

      setSuccess(true);
      setTimeout(() => navigate('/teacher/courses'), 2000);
    } catch (error: any) {
      console.error('Failed to create course:', error);
      const errorMessage = error.response?.data?.message || t('courses.errors.creation_failed');
      setErrors({ submit: errorMessage });
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

  const handleCoverChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
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
    const key = editMode && courseId ? `edit-course-${courseId}-draft` : 'create-course-draft';
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('Failed to load draft:', error);
    }
  }, [editMode, courseId]);

  useEffect(() => {
    const key = editMode && courseId ? `edit-course-${courseId}-draft` : 'create-course-draft';
    const toSave = {
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
      price: formData.price
    };
    
    try {
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch (error) {
      console.warn('Failed to save draft:', error);
    }
  }, [formData, editMode, courseId]);

  // Clear draft on successful submission
  useEffect(() => {
    if (success) {
      const key = editMode && courseId ? `edit-course-${courseId}-draft` : 'create-course-draft';
      localStorage.removeItem(key);
    }
  }, [success, editMode, courseId]);

  const stepTitles = useMemo(() => [
    t('courses.creation.step1_title'),
    t('courses.creation.step2_title'),
    t('courses.creation.step3_title')
  ], [t]);

  if (success) {
    return (
      <>
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-700 rounded-xl shadow-sm p-8 text-white">
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
              onClick={() => navigate('/teacher/courses')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
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
                onClick={() => navigate(`/courses/${courseId}`)}
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
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl shadow-sm p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold">
                  {editMode ? t('courses.creation.edit_course') : t('courses.creation.create_new_course')}
                </h1>
                <p className="text-blue-100 mt-2">
                  {t('courses.creation.header_description')}
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center space-x-6 text-sm text-blue-200">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{t('courses.creation.autosave_enabled')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <BarChart3 className="h-4 w-4" />
                <span>{t('courses.creation.step_x_of_y', { current: currentStep, total: 3 })}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 mt-6 lg:mt-0">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? t('common.hide_preview') : t('common.show_preview')}
            </button>
            <button
              onClick={() => navigate('/teacher/courses')}
              className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back_to_courses')}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Eye className="h-5 w-5 mr-2 text-blue-600" />
            {t('courses.creation.course_preview')}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {coverImage && (
                <div>
                  <img src={coverImage} alt="Cover preview" className="w-full h-48 object-cover rounded-lg border" />
                </div>
              )}
              <div>
                <h4 className="font-semibold text-gray-900 text-xl">{formData.title || t('courses.creation.preview_title')}</h4>
                <p className="text-gray-600 mt-2">{formData.description || t('courses.creation.preview_description')}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('common.category')}:</span>
                <span className="font-medium">
                  {categories.find(c => c.value === formData.category)?.label || t('common.not_set')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('common.level')}:</span>
                <span className="font-medium">
                  {levels.find(l => l.value === formData.level)?.label || t('common.not_set')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('common.duration')}:</span>
                <span className="font-medium">
                  {durations.find(d => d.value === formData.estimatedDuration)?.label || t('common.not_set')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('common.visibility')}:</span>
                <span className="font-medium">
                  {formData.isPublic ? t('common.public') : t('common.private')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Progress Steps */}
        <div className="px-8 pt-8">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map(step => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 font-semibold transition-all duration-300 ${
                  step === currentStep
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : step < currentStep
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step < currentStep ? <CheckCircle className="h-6 w-6" /> : step}
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-2 mx-4 transition-all duration-300 rounded-full ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-sm font-medium text-gray-600 mb-6">
            {stepTitles.map((title, index) => (
              <div 
                key={index} 
                className={currentStep === index + 1 ? 'text-blue-600 font-semibold' : ''}
              >
                {title}
              </div>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {errors.submit && (
          <div className="mx-8 mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{errors.submit}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                  {t('courses.creation.step1_title')}
                </h3>
                <p className="text-gray-600">{t('courses.creation.step1_description')}</p>
              </div>

              {/* Course Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                  {t('courses.creation.course_title')} *
                  {formData.title && (
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                      formData.title.length > 60 
                        ? 'text-red-600 bg-red-100' 
                        : 'text-green-600 bg-green-100'
                    }`}>
                      {formData.title.length}/60 {t('common.characters')}
                    </span>
                  )}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg font-medium"
                />
                {errors.title && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-3">
                  {t('courses.creation.course_description')} *
                  <span className="text-gray-400 text-xs ml-2">
                    ({t('courses.creation.description_guideline')})
                  </span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('courses.creation.description_placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-vertical"
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>
                    {formData.description.length < 50 
                      ? t('courses.creation.description_too_short_warning') 
                      : t('courses.creation.good_description_length')
                    }
                  </span>
                  <span>{formData.description.length}/2000</span>
                </div>
                {errors.description && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('courses.creation.cover_image')}
                  <span className="text-gray-400 text-xs ml-2">({t('common.optional')})</span>
                </label>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleCoverChange} 
                    />
                    <Upload className="h-5 w-5 mr-2" />
                    {t('common.upload_image')}
                  </label>
                  {coverImage && (
                    <div className="relative">
                      <img 
                        src={coverImage} 
                        alt="Cover preview" 
                        className="h-20 w-32 object-cover rounded-lg border shadow-sm" 
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImage(null);
                          setCoverImageFile(null);
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                {errors.coverImage && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.coverImage}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  {t('courses.creation.cover_image_guidelines')}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Course Details */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                  <Target className="h-5 w-5 mr-2 text-green-600" />
                  {t('courses.creation.step2_title')}
                </h3>
                <p className="text-gray-600">{t('courses.creation.step2_description')}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    {t('courses.creation.category')} *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
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
                          className={`p-4 border-2 rounded-xl text-left transition-all duration-200 group ${
                            formData.category === category.value
                              ? `border-${category.color}-500 bg-${category.color}-50 shadow-sm`
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <Icon className={`h-5 w-5 mt-0.5 text-${category.color}-600 flex-shrink-0`} />
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{category.label}</div>
                              <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {errors.category && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.category}
                    </p>
                  )}
                </div>

                {/* Level and Duration */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      {t('courses.creation.difficulty_level')} *
                    </label>
                    <div className="space-y-3">
                      {levels.map(level => {
                        const Icon = level.icon;
                        return (
                          <button
                            key={level.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, level: level.value as CourseFormData['level'] }))}
                            className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 group ${
                              formData.level === level.value
                                ? `border-${level.color}-500 bg-${level.color}-50 shadow-sm`
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <Icon className={`h-5 w-5 text-${level.color}-600 flex-shrink-0`} />
                              <div>
                                <div className="font-medium text-gray-900">{level.label}</div>
                                <div className="text-sm text-gray-600 mt-1">{level.description}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t('courses.creation.estimated_duration')}
                    </label>
                    <select
                      name="estimatedDuration"
                      value={formData.estimatedDuration}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">{t('common.select_duration')}</option>
                      {durations.map(duration => (
                        <option key={duration.value} value={duration.value}>
                          {duration.label} • {duration.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Learning Objectives */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4 flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-amber-600" />
                  {t('courses.creation.learning_objectives')} *
                  <span className="text-gray-400 text-xs ml-2">
                    ({t('courses.creation.objectives_guideline')})
                  </span>
                </label>
                <div className="space-y-3">
                  {formData.learningObjectives.map((objective, index) => (
                    <div key={index} className="flex space-x-3 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={objective}
                          onChange={(e) => updateLearningObjective(index, e.target.value)}
                          placeholder={t('courses.creation.objective_placeholder', { number: index + 1 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                      {formData.learningObjectives.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLearningObjective(index)}
                          className="px-3 py-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors flex items-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addLearningObjective}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('courses.creation.add_another_objective')}
                  </button>
                </div>
                {errors.learningObjectives && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.learningObjectives}
                  </p>
                )}
              </div>

              {/* Prerequisites */}
              <div>
                <label htmlFor="prerequisites" className="block text-sm font-medium text-gray-700 mb-3">
                  {t('courses.creation.prerequisites')}
                  <span className="text-gray-400 text-xs ml-2">({t('common.optional')})</span>
                </label>
                <textarea
                  id="prerequisites"
                  name="prerequisites"
                  rows={3}
                  value={formData.prerequisites}
                  onChange={handleChange}
                  placeholder={t('courses.creation.prerequisites_placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-vertical"
                />
              </div>
            </div>
          )}

          {/* Step 3: Finalize */}
          {currentStep === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-purple-600" />
                  {t('courses.creation.step3_title')}
                </h3>
                <p className="text-gray-600">{t('courses.creation.step3_description')}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Tag className="h-4 w-4 mr-2 text-blue-600" />
                    {t('courses.creation.tags')} *
                    <span className="text-gray-400 text-xs ml-2">
                      ({t('courses.creation.tags_guideline')})
                    </span>
                  </label>
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={handleTagKeyPress}
                        placeholder={t('courses.creation.add_tag_placeholder')}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        disabled={!newTag.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  {errors.tags && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.tags}
                    </p>
                  )}
                </div>

                {/* Language */}
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-3">
                    {t('courses.creation.language')} *
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    {languages.map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                  {errors.language && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.language}
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Settings */}
              <div className="space-y-6">
                {/* Welcome Message */}
                <div>
                  <label htmlFor="welcomeMessage" className="block text-sm font-medium text-gray-700 mb-3">
                    {t('courses.creation.welcome_message')}
                    <span className="text-gray-400 text-xs ml-2">({t('common.optional')})</span>
                  </label>
                  <textarea
                    id="welcomeMessage"
                    name="welcomeMessage"
                    rows={3}
                    value={formData.welcomeMessage || ''}
                    onChange={handleChange}
                    placeholder={t('courses.creation.welcome_message_placeholder')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-vertical"
                  />
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Privacy Setting */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${formData.isPublic ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {formData.isPublic ? (
                          <Globe className="h-6 w-6 text-green-600" />
                        ) : (
                          <Lock className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {formData.isPublic ? t('common.public_course') : t('common.private_course')}
                            </h4>
                            <p className="text-gray-600 text-sm mt-1">
                              {formData.isPublic 
                                ? t('courses.creation.public_course_description')
                                : t('courses.creation.private_course_description')
                              }
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              formData.isPublic ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Certification */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${formData.certificationAvailable ? 'bg-purple-100' : 'bg-gray-100'}`}>
                        <Award className={`h-6 w-6 ${formData.certificationAvailable ? 'text-purple-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {t('courses.creation.certification_available')}
                            </h4>
                            <p className="text-gray-600 text-sm mt-1">
                              {t('courses.creation.certification_description')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              certificationAvailable: !prev.certificationAvailable 
                            }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              formData.certificationAvailable ? 'bg-purple-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                formData.certificationAvailable ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-8 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={currentStep === 1}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              {t('common.previous')}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-500/25"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
                  {editMode ? t('common.updating') : t('common.creating')}...
                </>
              ) : currentStep === 3 ? (
                <>
                  <BookOpen className="mr-2 h-5 w-5" />
                  {editMode ? t('common.update_course') : t('common.create_course')}
                </>
              ) : (
                <>
                  {t('common.continue')}
                  <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CourseCreationForm;