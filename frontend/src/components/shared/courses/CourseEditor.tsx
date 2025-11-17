import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { coursesApi } from '@/services/api';
import { systemConfigApi } from '@/services/api/systemConfig';
import { useNotification } from '@/context/NotificationContext';
import { useFormValidation, validationRules } from '@/hooks/useFormValidation';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import type { Course, CourseFormData } from '@/types/courses';
import {
  BookOpen,
  X,
  Plus,
  GripVertical,
  Save,
  AlertCircle,
  CheckCircle,
  Loader,
  Image as ImageIcon,
  Eye,
  Download,
  Share2,
  Settings,
  Clock,
  Users,
  Tag,
  Target,
  Zap,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  FileText,
  Languages,
  Globe,
  Lock,
  Award
} from 'lucide-react';
import { Spinner, LoadingButton } from '@/components/shared/LoadingStates';
import { useTranslation } from 'react-i18next';

interface CourseEditorProps {
  courseId: string;
  onSave?: (course: Course) => void;
  onCancel?: () => void;
  mode?: 'edit' | 'view' | 'preview';
}

type EditorMode = 'basic' | 'content' | 'settings' | 'analytics' | 'preview';

export const CourseEditor: React.FC<CourseEditorProps> = ({
  courseId,
  onSave,
  onCancel,
  mode = 'edit'
}) => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [activeTab, setActiveTab] = useState<EditorMode>('basic');
  const [formData, setFormData] = useState<CourseFormData>(
    {
      title: '',
      description: '',
      category: 'faith',
      level: 'beginner',
      cover_image: '',
      learning_objectives: [''],
      prerequisites: '',
      estimated_duration: '',
      tags: [],
      language: 'en',
      is_public: true,
      certification_available: false,
      welcome_message: '',
      price: 0,
      status: 'draft'
    } as CourseFormData
  );

  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [courseStats, setCourseStats] = useState({
    totalStudents: 0,
    completionRate: 0,
    averageRating: 0,
    totalLessons: 0
  });

  // Fetch course data
  const { 
    data: courseData, 
    isLoading: isLoadingCourse,
    error: courseError,
    refetch: refetchCourse 
  } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.getCourse(courseId),
    enabled: !!courseId,
  });

  const course = courseData?.data?.course;

  // Fetch course statistics
  const { data: statsData } = useQuery({
    queryKey: ['course-stats', courseId],
    queryFn: () => coursesApi.getCourseAnalytics(courseId),
    enabled: !!courseId && !!course,
  });

  // Fetch dynamic configuration options
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['system-config', 'categories', 'active'],
    queryFn: () => systemConfigApi.getCategories(true),
    staleTime: 1000 * 60 * 60,
  });

  const { data: levels = [], isLoading: isLoadingLevels } = useQuery({
    queryKey: ['system-config', 'levels', 'active'],
    queryFn: () => systemConfigApi.getLevels(true),
    staleTime: 1000 * 60 * 60,
  });

  const { data: durations = [], isLoading: isLoadingDurations } = useQuery({
    queryKey: ['system-config', 'durations', 'active'],
    queryFn: () => systemConfigApi.getDurations(true),
    staleTime: 1000 * 60 * 60,
  });

  const { data: tags = [], isLoading: isLoadingTags } = useQuery({
    queryKey: ['system-config', 'tags', 'active'],
    queryFn: () => systemConfigApi.getTags(true, 'usage'),
    staleTime: 1000 * 60 * 60,
  });

  const { data: languages = [] } = useQuery({
    queryKey: ['system-config', 'languages'],
    queryFn: () => systemConfigApi.getLanguages(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  // Initialize form data when course loads
  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        description: course.description || '',
        category: course.category || 'faith',
        level: (course.level as any) || 'beginner',
        cover_image: course.cover_image || '',
        learning_objectives: course.learning_objectives || [''],
        prerequisites: course.prerequisites || '',
        estimated_duration: course.estimated_duration || '',
        tags: course.tags || [],
        language: course.language || 'en',
        is_public: course.is_public ?? true,
        certification_available: course.certification_available ?? false,
        welcome_message: course.welcome_message || '',
        price: course.price || 0,
        status: (course.status as any) || 'draft'
      });
      setCoverImagePreview(course.cover_image || '');
    }

    // Map analytics payload into compact stats used by the header/tabs
    if (statsData?.data?.analytics) {
      const analytics = statsData.data.analytics;
      setCourseStats({
        totalStudents: analytics.totalEnrollments ?? analytics.activeStudents ?? 0,
        completionRate: Number(analytics.completionRate ?? 0),
        averageRating: analytics.averageRating ?? 0,
        totalLessons: analytics.lessonCount ?? 0
      });
    }
  }, [course, statsData]);

  // Form validation
  const { errors, touched, validateField, validateForm, setFieldTouched, setFieldError, clearFieldError } =
    useFormValidation<CourseFormData>({
      title: {
        rules: [
          validationRules.required(t('courses.errors.title_required')),
          validationRules.minLength(3, t('courses.errors.title_too_short')),
          validationRules.maxLength(60, t('courses.errors.title_too_long')),
        ],
      },
      description: {
        rules: [
          validationRules.required(t('courses.errors.description_required')),
          validationRules.minLength(5, t('courses.errors.description_too_short')),
          validationRules.maxLength(2000, t('courses.errors.description_too_long')),
        ],
      },
      category: {
        rules: [validationRules.required(t('courses.errors.category_required'))],
      },
      level: {
        rules: [validationRules.required(t('courses.errors.level_required'))],
      },
      price: {
        rules: [
          validationRules.minValue(0, t('courses.errors.price_negative')),
          validationRules.maxValue(1000, t('courses.errors.price_too_high'))
        ],
      },
    });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CourseFormData>) =>
      coursesApi.updateCourse(courseId, data),
    onSuccess: (response) => {
      const updatedCourse = response.data.course;
      queryClient.setQueryData(['course', courseId], response);
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course-stats', courseId] });
      
      setIsDirty(false);
      setIsAutoSaving(false);
      setLastSaved(new Date());
      
      showNotification({
        type: 'success',
        title: t('common.saved'),
        message: t('courses.editor.course_updated'),
        duration: 3000,
      });

      if (onSave) {
        onSave(updatedCourse);
      }
    },
    onError: (error: any) => {
      setIsAutoSaving(false);
      showNotification({
        type: 'error',
        title: t('common.save_failed'),
        message: error.response?.data?.message || t('courses.errors.update_failed'),
        duration: 5000,
      });
    },
  });

  // Handle form field changes
  const handleChange = useCallback(
    (field: keyof CourseFormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      
      // Validate field on change
      const error = validateField(field, value);
      if (error) {
        setFieldError(field, error);
      } else {
        // Clear error if validation passes
        clearFieldError(field);
      }
      setFieldTouched(field, true);

      // Trigger auto-save after a delay
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }

      autoSaveRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000); // 2 seconds delay
    },
    [validateField, setFieldError, clearFieldError, setFieldTouched]
  );

  // Auto-save function
  const handleAutoSave = async () => {
    if (!isDirty || updateMutation.isPending || !validateForm(formData)) return;

    setIsAutoSaving(true);
    try {
      await updateMutation.mutateAsync(formData);
    } catch (error) {
      // Error handled in mutation
    }
  };

  // Manual save
  const handleSave = async () => {
    const isValid = validateForm(formData);
    if (!isValid) {
      showNotification({
        type: 'error',
        title: t('common.validation_error'),
        message: t('courses.editor.fix_errors_before_save'),
        duration: 5000,
      });
      return;
    }

    try {
      await updateMutation.mutateAsync(formData);
    } catch (error) {
      // Error handled in mutation
    }
  };

  // Cover image upload
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification({
        type: 'error',
        title: t('common.invalid_file'),
        message: t('courses.errors.invalid_image_type'),
        duration: 5000,
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification({
        type: 'error',
        title: t('common.file_too_large'),
        message: t('courses.errors.image_too_large'),
        duration: 5000,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCoverImagePreview(dataUrl);
      handleChange('cover_image', dataUrl);
    };
    reader.onerror = () => {
      showNotification({
        type: 'error',
        title: t('common.upload_failed'),
        message: t('courses.errors.image_upload_failed'),
        duration: 5000,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCoverImage = () => {
    setCoverImagePreview('');
    handleChange('cover_image', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Learning objectives management
  const handleAddObjective = () => {
    handleChange('learning_objectives', [...formData.learning_objectives, '']);
  };

  const handleUpdateObjective = (index: number, value: string) => {
    const updated = [...formData.learning_objectives];
    updated[index] = value;
    handleChange('learning_objectives', updated);
  };

  const handleRemoveObjective = (index: number) => {
    if (formData.learning_objectives.length === 1) {
      showNotification({
        type: 'warning',
        title: t('common.cannot_remove'),
        message: t('courses.editor.min_one_objective'),
        duration: 3000,
      });
      return;
    }
    const updated = formData.learning_objectives.filter((_, i) => i !== index);
    handleChange('learning_objectives', updated);
  };

  // Tag management
  const handleAddTag = () => {
    if (newTagInput.trim() && !formData.tags.includes(newTagInput.trim())) {
      handleChange('tags', [...formData.tags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Publish course
  const publishMutation = useMutation({
    mutationFn: () => coursesApi.publishCourse(courseId),
    onSuccess: (response) => {
      // Update local cache with the freshly published course
      if (response?.data?.course) {
        queryClient.setQueryData(['course', courseId], response);
      }
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-stats', courseId] });

      showNotification({
        type: 'success',
        title: t('common.published'),
        message: t('courses.editor.course_published'),
        duration: 5000,
      });
    },
  });

  const handlePublish = () => {
    publishMutation.mutate();
  };

  // Warn about unsaved changes
  useUnsavedChanges({
    hasUnsavedChanges: isDirty,
    message: t('courses.editor.unsaved_changes_warning'),
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, []);

  // Memoized computed values
  const sortedCategories = useMemo(() => 
    [...categories].sort((a, b) => a.display_order - b.display_order), 
    [categories]
  );

  const sortedLevels = useMemo(() => 
    [...levels].sort((a, b) => a.display_order - b.display_order), 
    [levels]
  );

  const sortedDurations = useMemo(() => 
    [...durations].sort((a, b) => a.display_order - b.display_order), 
    [durations]
  );

  const groupedTags = useMemo(() => 
    tags.reduce((acc, tag) => {
      const category = tag.category || t('common.uncategorized');
      if (!acc[category]) acc[category] = [];
      acc[category].push(tag);
      return acc;
    }, {} as Record<string, typeof tags>),
    [tags, t]
  );

  const isLoading = isLoadingCourse || isLoadingCategories || isLoadingLevels || isLoadingDurations || isLoadingTags;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 text-lg">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (courseError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('courses.errors.failed_to_load')}
        </h3>
        <p className="text-gray-600 mb-4">
          {t('courses.errors.course_load_error')}
        </p>
        <button
          onClick={() => refetchCourse()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('common.try_again')}
        </button>
      </div>
    );
  }

  const editorTabs: { id: EditorMode; label: string; icon: React.ElementType }[] = [
    { id: 'basic', label: t('courses.editor.basic_info'), icon: FileText },
    { id: 'content', label: t('courses.editor.content'), icon: BookOpen },
    { id: 'settings', label: t('courses.editor.settings'), icon: Settings },
    { id: 'analytics', label: t('courses.editor.analytics'), icon: BarChart3 },
    { id: 'preview', label: t('common.preview'), icon: Eye },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#27AE60]/10 via-[#16A085]/10 to-[#2980B9]/10 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-[#27AE60]/20">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/teacher/courses')}
              className="p-2 bg-white/80 hover:bg-white border border-stone-200 hover:border-[#27AE60]/50 rounded-lg transition-colors"
              title={t('common.back_to_courses')}
            >
              <ArrowLeft className="h-5 w-5 text-stone-700" />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-1 flex items-center text-stone-800">
                <BookOpen className="h-5 w-5 mr-2 text-[#27AE60]" />
                {course?.title || t('courses.editor.edit_course')}
              </h2>
              <p className="text-sm text-stone-600">
                {t('courses.editor.update_course_details')}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Course Stats */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-stone-700">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-[#27AE60]" />
                <span>{courseStats.totalStudents} {t('common.students')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4 text-[#16A085]" />
                <span>{courseStats.completionRate}% {t('common.completion')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-[#2980B9]" />
                <span>{courseStats.averageRating}/5 {t('common.rating')}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4 text-emerald-700" />
                <span>{courseStats.totalLessons} {t('common.lessons')}</span>
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex items-center gap-2">
              {/* Course Status */}
              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                course?.status === 'published' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {course?.status === 'published' ? t('common.published') : t('common.draft')}
              </div>

              {/* Save Indicator */}
              {isDirty && (
                <div className="hidden sm:flex items-center text-xs bg-white/80 px-3 py-1.5 rounded-lg border border-stone-200">
                  {isAutoSaving ? (
                    <>
                      <Loader className="h-3.5 w-3.5 mr-1 animate-spin text-[#27AE60]" />
                      {t('common.saving')}...
                    </>
                  ) : lastSaved ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 mr-1 text-[#27AE60]" />
                      {t('common.saved')} {lastSaved.toLocaleTimeString()}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 mr-1 text-amber-500" />
                      {t('common.unsaved_changes')}
                    </>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/teacher/courses/${courseId}`)}
                  className="inline-flex items-center px-3 py-1.5 border border-stone-200 text-xs font-medium rounded-lg text-stone-700 bg-white hover:border-[#27AE60]/60 hover:text-[#27AE60] transition-colors"
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  {t('common.view')}
                </button>
                
                {course?.status === 'draft' && (
                  <button
                    onClick={handlePublish}
                    disabled={publishMutation.isPending}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-[#27AE60] hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <Globe className="mr-1.5 h-3.5 w-3.5" />
                    {publishMutation.isPending ? t('common.publishing') : t('common.publish')}
                  </button>
                )}

                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="inline-flex items-center px-3 py-1.5 border border-stone-200 text-xs font-medium rounded-lg text-stone-700 bg-white hover:border-rose-300 hover:text-rose-600 transition-colors"
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    {t('common.cancel')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <div className="px-8">
          <nav className="flex space-x-8">
            {editorTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 inline mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Course Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
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
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                onBlur={() => setFieldTouched('title', true)}
                maxLength={60}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  touched.title && errors.title
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300'
                }`}
                placeholder={t('courses.creation.title_placeholder')}
              />
              {touched.title && errors.title && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Course Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                {t('courses.creation.course_description')} *
                {formData.description && (
                  <span className="ml-2 text-xs text-gray-500">
                    {formData.description.length}/2000 {t('common.characters')}
                  </span>
                )}
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                onBlur={() => setFieldTouched('description', true)}
                rows={6}
                maxLength={2000}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-vertical ${
                  touched.description && errors.description
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300'
                }`}
                placeholder={t('courses.creation.description_placeholder')}
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>
                  {formData.description && formData.description.length < 50 
                    ? t('courses.creation.description_guideline') 
                    : t('courses.creation.good_description_length')
                  }
                </span>
                <span>{formData.description.length}/2000</span>
              </div>
              {touched.description && errors.description && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('courses.creation.cover_image')}
              </label>
              <div className="space-y-3">
                {coverImagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={coverImagePreview}
                      alt="Cover preview"
                      className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-300 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveCoverImage}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-md h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-1">{t('common.click_to_upload')}</p>
                    <p className="text-xs text-gray-500">PNG, JPG {t('common.up_to')} 5MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Category and Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('courses.creation.category')} *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  onBlur={() => setFieldTouched('category', true)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    touched.category && errors.category
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300'
                  }`}
                >
                  {sortedCategories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {touched.category && errors.category && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.category}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('courses.creation.difficulty_level')} *
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => handleChange('level', e.target.value as any)}
                  onBlur={() => setFieldTouched('level', true)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    touched.level && errors.level
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300'
                  }`}
                >
                  {sortedLevels.map((level) => (
                    <option key={level.id} value={level.slug}>
                      {level.name} - {level.description}
                    </option>
                  ))}
                </select>
                {touched.level && errors.level && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.level}
                  </p>
                )}
              </div>
            </div>

            {/* Duration and Language */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('courses.creation.estimated_duration')}
                </label>
                <select
                  value={formData.estimated_duration}
                  onChange={(e) => handleChange('estimated_duration', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">{t('common.select_duration')}</option>
                  {sortedDurations.map((duration) => (
                    <option key={duration.id} value={duration.value}>
                      {duration.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('courses.creation.language')}
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Learning Objectives */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('courses.creation.learning_objectives')}
              </label>
              <div className="space-y-3">
                {formData.learning_objectives.map((objective, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-3">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={objective}
                        onChange={(e) => handleUpdateObjective(index, e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder={t('courses.creation.objective_placeholder', { number: index + 1 })}
                      />
                    </div>
                    {formData.learning_objectives.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveObjective(index)}
                        className="flex-shrink-0 mt-2 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddObjective}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('courses.creation.add_another_objective')}
                </button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('courses.creation.tags')}
              </label>
              <div className="space-y-3">
                {/* Selected Tags */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {formData.tags.map((tagName) => {
                      const tag = tags.find(t => t.name === tagName);
                      return (
                        <span
                          key={tagName}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                          style={{
                            backgroundColor: tag?.color ? `${tag.color}20` : '#3B82F620',
                            color: tag?.color || '#3B82F6',
                            border: `1px solid ${tag?.color || '#3B82F6'}40`
                          }}
                        >
                          {tagName}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tagName)}
                            className="ml-2 hover:opacity-70"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Tag Input */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    placeholder={t('courses.creation.add_tag_placeholder')}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!newTagInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Tag Suggestions */}
                <select
                  value=""
                  onChange={(e) => {
                    const tagName = e.target.value;
                    if (tagName && !formData.tags.includes(tagName)) {
                      handleChange('tags', [...formData.tags, tagName]);
                    }
                    e.target.value = '';
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">{t('courses.editor.select_from_suggestions')}</option>
                  {Object.entries(groupedTags).map(([category, categoryTags]) => (
                    <optgroup key={category} label={category}>
                      {categoryTags
                        .filter(tag => !formData.tags.includes(tag.name))
                        .map((tag) => (
                          <option key={tag.id} value={tag.name}>
                            {tag.name} {tag.usage_count > 0 ? `(${tag.usage_count})` : ''}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Privacy Settings */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${formData.is_public ? 'bg-green-100' : 'bg-blue-100'}`}>
                  {formData.is_public ? (
                    <Globe className="h-6 w-6 text-green-600" />
                  ) : (
                    <Lock className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {formData.is_public ? t('common.public_course') : t('common.private_course')}
                      </h4>
                      <p className="text-gray-600 text-sm mt-1">
                        {formData.is_public 
                          ? t('courses.creation.public_course_description')
                          : t('courses.creation.private_course_description')
                        }
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange('is_public', !formData.is_public)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.is_public ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.is_public ? 'translate-x-6' : 'translate-x-1'
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
                <div className={`p-3 rounded-lg ${formData.certification_available ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  <Award className={`h-6 w-6 ${formData.certification_available ? 'text-purple-600' : 'text-gray-400'}`} />
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
                      onClick={() => handleChange('certification_available', !formData.certification_available)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.certification_available ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.certification_available ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Welcome Message */}
            <div>
              <label htmlFor="welcomeMessage" className="block text-sm font-medium text-gray-700 mb-2">
                {t('courses.creation.welcome_message')}
              </label>
              <textarea
                id="welcomeMessage"
                value={formData.welcome_message}
                onChange={(e) => handleChange('welcome_message', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-vertical"
                placeholder={t('courses.creation.welcome_message_placeholder')}
              />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{courseStats.totalStudents}</div>
                <div className="text-sm text-blue-700">{t('common.students')}</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="text-2xl font-bold text-green-600">{courseStats.completionRate}%</div>
                <div className="text-sm text-green-700">{t('common.completion_rate')}</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{courseStats.averageRating}</div>
                <div className="text-sm text-purple-700">{t('common.average_rating')}</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{courseStats.totalLessons}</div>
                <div className="text-sm text-orange-700">{t('common.lessons')}</div>
              </div>
            </div>

            {/* Analytics placeholder */}
            <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('courses.editor.analytics_coming_soon')}
              </h3>
              <p className="text-gray-600">
                {t('courses.editor.detailed_analytics_description')}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-6">
            {/* Course Preview */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('courses.editor.course_preview')}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {coverImagePreview && (
                    <img
                      src={coverImagePreview}
                      alt="Course cover"
                      className="w-full h-48 object-cover rounded-lg border border-gray-300"
                    />
                  )}
                  <div>
                    <h4 className="font-bold text-gray-900 text-xl">{formData.title}</h4>
                    <p className="text-gray-600 mt-2">{formData.description}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{t('common.category')}:</span>
                    <span className="font-medium">
                      {categories.find(c => c.slug === formData.category)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{t('common.level')}:</span>
                    <span className="font-medium">
                      {levels.find(l => l.slug === formData.level)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{t('common.duration')}:</span>
                    <span className="font-medium">
                      {durations.find(d => d.value === formData.estimated_duration)?.label || t('common.not_set')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{t('common.language')}:</span>
                    <span className="font-medium">
                      {languages.find(l => l.code === formData.language)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">{t('common.visibility')}:</span>
                    <span className="font-medium">
                      {formData.is_public ? t('common.public') : t('common.private')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/teacher/courses')}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all"
          >
            {t('common.back_to_courses')}
          </button>
          <LoadingButton
            loading={updateMutation.isPending}
            onClick={handleSave}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {t('common.save_changes')}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};

export default CourseEditor;