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
      color: 'blue'
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
      color: 'purple'
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
      color: 'pink'
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
      color: 'blue'
    },
    { 
      value: 'advanced', 
      label: t('courses.levels.advanced'), 
      color: 'purple'
    }
  ], [t]);

  const languages = useMemo(() => [
    { value: 'en', label: t('common.english') },
    { value: 'am', label: t('common.amharic') },
    { value: 'ar', label: t('common.arabic') },
    { value: 'fr', label: t('common.french') },
    { value: 'es', label: t('common.spanish') }
  ], [t]);

  const validateForm = useCallback((): boolean => {
    const formErrors: Record<string, string> = {};
    
    // Title validation
    if (!formData.title.trim()) {
      formErrors.title = t('courses.errors.title_required');
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
        try {
          await coursesApi.uploadCourseImage(result.data.id, coverImageFile);
        } catch (uploadError) {
          console.warn('Failed to upload cover image:', uploadError);
          // Continue without the image
        }
      }

      // Clear the teacher dashboard cache to force a refresh of course counts
      dataCache.delete('teacher_dashboard');
      
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
      <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Error Alert */}
        {errors.submit && (
          <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{errors.submit}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Simplified Form - Clean and Focused */}
          <div className="space-y-6">
            {/* Course Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
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
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                {t('courses.creation.course_description')} *
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder={t('courses.creation.description_placeholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <div className="flex justify-between mt-1 text-xs text-gray-500">
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
                <label className="block text-sm font-medium text-gray-700 mb-3">
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
                            ? `border-${category.color}-500 bg-${category.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className={`h-4 w-4 text-${category.color}-600 flex-shrink-0`} />
                          <div className="font-medium text-gray-900 text-sm">{category.label}</div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            ? `border-${level.color}-500 bg-${level.color}-50 text-${level.color}-700`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-xs font-medium">{level.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('courses.creation.language')} *
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-3">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
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
            <div className="border-t border-gray-200 pt-4">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div className="flex items-center text-sm font-medium text-gray-700">
                    <span>Additional Options</span>
                  </div>
                  <div className="text-gray-400 group-open:rotate-180 transition-transform">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                
                <div className="mt-4 space-y-4">
                  {/* Prerequisites */}
                  <div>
                    <label htmlFor="prerequisites" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('courses.creation.prerequisites')}
                    </label>
                    <textarea
                      id="prerequisites"
                      name="prerequisites"
                      rows={2}
                      value={formData.prerequisites}
                      onChange={handleChange}
                      placeholder={t('courses.creation.prerequisites_placeholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={addTag}
                          disabled={!newTag.trim()}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
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
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('courses.creation.cover_image')}
                    </label>
                    <div className="flex items-center space-x-3">
                      <label className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleCoverChange} 
                        />
                        <Upload className="h-4 w-4 mr-1" />
                        {t('common.upload_image')}
                      </label>
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
                          >
                            <X className="h-2 w-2" />
                          </button>
                        </div>
                      )}
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
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {formData.isPublic ? (
                            <Globe className="h-5 w-5 text-green-600" />
                          ) : (
                            <Lock className="h-5 w-5 text-blue-600" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {formData.isPublic ? t('common.public_course') : t('common.private_course')}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            formData.isPublic ? 'bg-green-600' : 'bg-blue-600'
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
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Award className={`h-5 w-5 ${formData.certificationAvailable ? 'text-purple-600' : 'text-gray-400'}`} />
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
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
                            formData.certificationAvailable ? 'bg-purple-600' : 'bg-gray-300'
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
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
        </form>
      </div>
    </>
  );
};

export default CourseCreationForm;