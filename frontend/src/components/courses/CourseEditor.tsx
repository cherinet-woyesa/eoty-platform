import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useFormValidation, validationRules } from '../../hooks/useFormValidation';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import type { Course, CourseFormData } from '../../types/courses';
import {
  BookOpen,
  X,
  Plus,
  GripVertical,
  Save,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader,
  Image as ImageIcon,
} from 'lucide-react';
import { Spinner, LoadingButton } from '../shared/LoadingStates';

interface CourseEditorProps {
  courseId: string;
  onSave?: (course: Course) => void;
  onCancel?: () => void;
}

const CATEGORIES = [
  { value: 'faith', label: 'Faith & Doctrine', icon: BookOpen },
  { value: 'history', label: 'Church History', icon: Clock },
  { value: 'spiritual', label: 'Spiritual Development', icon: BookOpen },
  { value: 'bible', label: 'Bible Study', icon: BookOpen },
  { value: 'liturgical', label: 'Liturgical Studies', icon: BookOpen },
  { value: 'youth', label: 'Youth Ministry', icon: BookOpen },
];

const LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'No prior knowledge required' },
  { value: 'intermediate', label: 'Intermediate', description: 'Basic understanding recommended' },
  { value: 'advanced', label: 'Advanced', description: 'For experienced learners' },
];

const DURATIONS = [
  { value: '1-2', label: '1-2 weeks' },
  { value: '3-4', label: '3-4 weeks' },
  { value: '5-8', label: '5-8 weeks' },
  { value: '9+', label: '9+ weeks' },
];

export const CourseEditor: React.FC<CourseEditorProps> = ({
  courseId,
  onSave,
  onCancel,
}) => {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch course data
  const { data: courseData, isLoading: isLoadingCourse } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.getCourse(courseId),
    enabled: !!courseId,
  });

  const course = courseData?.data?.course;

  // Form state
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    category: 'faith',
    level: 'beginner',
    cover_image: '',
    learning_objectives: [''],
    prerequisites: '',
    estimated_duration: '',
  });

  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Initialize form data when course loads
  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        description: course.description || '',
        category: course.category || 'faith',
        level: course.level || 'beginner',
        cover_image: course.cover_image || '',
        learning_objectives: course.learning_objectives || [''],
        prerequisites: course.prerequisites || '',
        estimated_duration: course.estimated_duration || '',
      });
      setCoverImagePreview(course.cover_image || '');
    }
  }, [course]);

  // Form validation
  const { errors, touched, validateField, validateForm, setFieldTouched, setFieldError } =
    useFormValidation<CourseFormData>({
      title: {
        rules: [
          validationRules.required('Course title is required'),
          validationRules.minLength(3, 'Title must be at least 3 characters'),
          validationRules.maxLength(60, 'Title must be less than 60 characters'),
        ],
      },
      description: {
        rules: [validationRules.maxLength(500, 'Description must be less than 500 characters')],
      },
      category: {
        rules: [validationRules.required('Please select a category')],
      },
      level: {
        rules: [validationRules.required('Please select a difficulty level')],
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
      setIsDirty(false);
      setLastSaved(new Date());
      
      if (onSave) {
        onSave(updatedCourse);
      }
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.message || 'Failed to save course changes',
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
      }
      setFieldTouched(field, true);
    },
    [validateField, setFieldError, setFieldTouched]
  );

  // Auto-save to localStorage
  useEffect(() => {
    if (isDirty) {
      const draftKey = `course-editor-draft-${courseId}`;
      try {
        localStorage.setItem(draftKey, JSON.stringify(formData));
      } catch (error) {
        console.error('Failed to save draft to localStorage:', error);
      }
    }
  }, [formData, isDirty, courseId]);

  // Auto-save to server every 30 seconds
  useEffect(() => {
    if (isDirty && !updateMutation.isPending) {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      const timer = setTimeout(() => {
        handleAutoSave();
      }, 30000); // 30 seconds

      setAutoSaveTimer(timer);

      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }
  }, [formData, isDirty]);

  // Auto-save function
  const handleAutoSave = async () => {
    if (!isDirty || updateMutation.isPending) return;

    try {
      await updateMutation.mutateAsync(formData);
      showNotification({
        type: 'success',
        title: 'Auto-saved',
        message: 'Your changes have been automatically saved',
        duration: 2000,
      });
    } catch (error) {
      // Error already handled in mutation
    }
  };

  // Manual save
  const handleSave = async () => {
    // Validate form
    const isValid = validateForm(formData);
    if (!isValid) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the errors before saving',
        duration: 5000,
      });
      return;
    }

    try {
      await updateMutation.mutateAsync(formData);
      showNotification({
        type: 'success',
        title: 'Saved',
        message: 'Course updated successfully',
        duration: 3000,
      });
    } catch (error) {
      // Error already handled in mutation
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
        title: 'Invalid File',
        message: 'Please select an image file',
        duration: 5000,
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification({
        type: 'error',
        title: 'File Too Large',
        message: 'Image must be less than 5MB',
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
        title: 'Cannot Remove',
        message: 'At least one learning objective is required',
        duration: 3000,
      });
      return;
    }
    const updated = formData.learning_objectives.filter((_, i) => i !== index);
    handleChange('learning_objectives', updated);
  };

  // Warn about unsaved changes
  useUnsavedChanges({
    hasUnsavedChanges: isDirty,
    message: 'You have unsaved changes. Are you sure you want to leave?',
  });

  if (isLoadingCourse) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1 flex items-center">
              <BookOpen className="h-6 w-6 mr-2" />
              Edit Course
            </h2>
            <p className="text-blue-100 opacity-90 text-sm">
              Update your course details and content
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Auto-save indicator */}
            {isDirty && (
              <div className="flex items-center text-sm bg-white/10 px-3 py-1.5 rounded-lg">
                {updateMutation.isPending ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : lastSaved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved {new Date(lastSaved).toLocaleTimeString()}
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Unsaved changes
                  </>
                )}
              </div>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="inline-flex items-center px-3 py-1.5 border border-white/30 text-xs font-medium rounded-lg text-white bg-white/10 hover:bg-white/20 transition-all duration-200"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 space-y-6">
        {/* Course Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Course Title *
            {formData.title && (
              <span className="ml-2 text-xs text-gray-500">
                {formData.title.length}/60 characters
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
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
              touched.title && errors.title
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300'
            }`}
            placeholder="Enter course title"
          />
          {touched.title && errors.title && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Course Description with Rich Text */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Course Description
            {formData.description && (
              <span className="ml-2 text-xs text-gray-500">
                {formData.description.length}/500 characters
              </span>
            )}
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            onBlur={() => setFieldTouched('description', true)}
            rows={6}
            maxLength={500}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-vertical ${
              touched.description && errors.description
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300'
            }`}
            placeholder="Describe what students will learn in this course..."
          />
          {touched.description && errors.description && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.description}
            </p>
          )}
        </div>

        {/* Cover Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cover Image
          </label>
          <div className="space-y-3">
            {coverImagePreview ? (
              <div className="relative inline-block">
                <img
                  src={coverImagePreview}
                  alt="Cover preview"
                  className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-300"
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
                className="w-full max-w-md h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-1">Click to upload cover image</p>
                <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
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

        {/* Category and Level */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              onBlur={() => setFieldTouched('category', true)}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                touched.category && errors.category
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
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

          {/* Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level *
            </label>
            <select
              value={formData.level}
              onChange={(e) => handleChange('level', e.target.value as any)}
              onBlur={() => setFieldTouched('level', true)}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                touched.level && errors.level
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
            >
              {LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label} - {level.description}
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

        {/* Estimated Duration and Prerequisites */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Estimated Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Duration
            </label>
            <select
              value={formData.estimated_duration}
              onChange={(e) => handleChange('estimated_duration', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">Select duration</option>
              {DURATIONS.map((duration) => (
                <option key={duration.value} value={duration.value}>
                  {duration.label}
                </option>
              ))}
            </select>
          </div>

          {/* Prerequisites */}
          <div>
            <label htmlFor="prerequisites" className="block text-sm font-medium text-gray-700 mb-2">
              Prerequisites
            </label>
            <input
              type="text"
              id="prerequisites"
              value={formData.prerequisites}
              onChange={(e) => handleChange('prerequisites', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="e.g., Basic knowledge of Christianity"
            />
          </div>
        </div>

        {/* Learning Objectives */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Learning Objectives
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder={`Learning objective ${index + 1}`}
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
              Add Learning Objective
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
          )}
          <LoadingButton
            loading={updateMutation.isPending}
            onClick={handleSave}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <Save className="h-5 w-5 mr-2" />
            Save Changes
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};

export default CourseEditor;
