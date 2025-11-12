import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi, videoApi } from '@/services/api';
import { useNotification } from '@/context/NotificationContext';
import { useFormValidation, validationRules } from '@/hooks/useFormValidation';
import type { Lesson } from '@/types/courses';
import {
  Video,
  X,
  Save,
  Upload,
  Loader,
  AlertCircle,
  CheckCircle,
  FileText,
  Plus,
  Trash2,
  Image,
}
from 'lucide-react';
import { Spinner, LoadingButton } from '@/components/shared/LoadingStates';
import MuxVideoUploader from './MuxVideoUploader';
import UnifiedVideoPlayer from './UnifiedVideoPlayer';
import ThumbnailSelector from './ThumbnailSelector';

interface LessonEditorProps {
  lessonId: string;
  courseId: string;
  onSave?: (lesson: Lesson) => void;
  onCancel?: () => void;
}

interface LessonFormData {
  title: string;
  description: string;
  order: number;
  duration: number;
}

interface Resource {
  id?: number;
  name: string;
  url: string;
  type: string;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({
  lessonId,
  courseId,
  onSave,
  onCancel,
}) => {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const subtitleInputRef = useRef<HTMLInputElement>(null);

  // Fetch lesson data
  const { data: lessonsData, isLoading: isLoadingLesson } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => coursesApi.getLessons(courseId),
  });

  const lesson = lessonsData?.data?.lessons?.find((l: Lesson) => l.id === parseInt(lessonId));

  // Form state
  const [formData, setFormData] = useState<LessonFormData>({
    title: '',
    description: '',
    order: 0,
    duration: 0,
  });

  const [resources, setResources] = useState<Resource[]>([]);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Video status polling
  const { data: videoStatusData, refetch: refetchVideoStatus } = useQuery({
    queryKey: ['videoStatus', lessonId],
    queryFn: () => coursesApi.getVideoStatus(lessonId),
    enabled: !!lesson?.video_url,
    refetchInterval: (query) => {
      const status = query?.state?.data?.data?.videoStatus;
      return status === 'processing' || status === 'uploading' ? 3000 : false;
    },
  });

  // Initialize form data when lesson loads
  useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title || '',
        description: lesson.description || '',
        order: lesson.order || 0,
        duration: lesson.duration || 0,
      });
      // Load resources if they exist in lesson metadata
      if (lesson.resources && Array.isArray(lesson.resources)) {
        setResources(lesson.resources);
      }
      // Load thumbnail URL
      if (lesson.thumbnail_url) {
        setThumbnailUrl(lesson.thumbnail_url);
      }
    }
  }, [lesson]);

  // Form validation
  const { errors, touched, validateField, validateForm, setFieldTouched, setFieldError } =
    useFormValidation<LessonFormData>({
      title: {
        rules: [
          validationRules.required('Lesson title is required'),
          validationRules.minLength(3, 'Title must be at least 3 characters'),
          validationRules.maxLength(200, 'Title must be less than 200 characters'),
        ],
      },
      description: {
        rules: [validationRules.maxLength(5000, 'Description must be less than 5000 characters')],
      },
    });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<LessonFormData>) =>
      coursesApi.updateLesson(lessonId, data),
    onSuccess: (response) => {
      const updatedLesson = response.data.lesson;
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      
      showNotification({
        type: 'success',
        title: 'Saved',
        message: 'Lesson updated successfully',
        duration: 3000,
      });

      if (onSave) {
        onSave(updatedLesson);
      }
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.message || 'Failed to save lesson changes',
        duration: 5000,
      });
    },
  });

  // Handle form field changes
  const handleChange = (field: keyof LessonFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    const error = validateField(field, value);
    if (error) {
      setFieldError(field, error);
    }
    setFieldTouched(field, true);
  };

  // Manual save
  const handleSave = async () => {
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
      // Include resources in the update
      const updateData = {
        ...formData,
        resources: resources.filter(r => r.name && r.url), // Only include valid resources
      };
      
      await updateMutation.mutateAsync(updateData);
    } catch (error) {
      // Error already handled in mutation
    }
  };

  // Subtitle upload
  const handleSubtitleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.vtt') && !file.name.endsWith('.srt')) {
      showNotification({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select a VTT or SRT subtitle file',
        duration: 5000,
      });
      return;
    }

    setSubtitleFile(file);
  };

  const handleUploadSubtitle = async () => {
    if (!subtitleFile) return;

    try {
      const blob = new Blob([await subtitleFile.arrayBuffer()], { type: 'text/vtt' });
      await videoApi.uploadSubtitle(blob, lessonId, 'en', 'English');

      showNotification({
        type: 'success',
        title: 'Subtitle Uploaded',
        message: 'Subtitle file uploaded successfully',
        duration: 3000,
      });

      setSubtitleFile(null);
      if (subtitleInputRef.current) {
        subtitleInputRef.current.value = '';
      }
    } catch (error: any) {
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: error.response?.data?.message || 'Failed to upload subtitle',
        duration: 5000,
      });
    }
  };

  // Resources management
  const handleAddResource = () => {
    setResources([...resources, { name: '', url: '', type: 'document' }]);
  };

  const handleUpdateResource = (index: number, field: keyof Resource, value: string) => {
    const updated = [...resources];
    updated[index] = { ...updated[index], [field]: value };
    setResources(updated);
  };

  const handleRemoveResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  // Get video status display
  const getVideoStatusDisplay = () => {
    const status = videoStatusData?.data?.videoStatus || lesson?.video_status || 'no_video';
    const progress = videoStatusData?.data?.processingProgress || lesson?.processing_progress || 0;

    switch (status) {
      case 'ready':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Video Ready</span>
          </div>
        );
      case 'processing':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader className="h-5 w-5 animate-spin" />
            <span className="font-medium">Processing {progress}%</span>
          </div>
        );
      case 'uploading':
        return (
          <div className="flex items-center gap-2 text-yellow-600">
            <Loader className="h-5 w-5 animate-spin" />
            <span className="font-medium">Uploading...</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Processing Error</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-gray-600">
            <Video className="h-5 w-5" />
            <span className="font-medium">No Video</span>
          </div>
        );
    }
  };

  if (isLoadingLesson) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Lesson Not Found</h3>
          <p className="text-gray-500 mt-2">The lesson you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1 flex items-center">
              <Video className="h-6 w-6 mr-2" />
              Edit Lesson
            </h2>
            <p className="text-purple-100 opacity-90 text-sm">
              Update lesson details and manage video content
            </p>
          </div>
          <div className="flex items-center space-x-3">
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
        {/* Lesson Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Lesson Title *
            {formData.title && (
              <span className="ml-2 text-xs text-gray-500">
                {formData.title.length}/200 characters
              </span>
            )}
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            onBlur={() => setFieldTouched('title', true)}
            maxLength={200}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
              touched.title && errors.title
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300'
            }`}
            placeholder="Enter lesson title"
          />
          {touched.title && errors.title && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Lesson Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Lesson Description
            {formData.description && (
              <span className="ml-2 text-xs text-gray-500">
                {formData.description.length}/5000 characters
              </span>
            )}
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            onBlur={() => setFieldTouched('description', true)}
            rows={6}
            maxLength={5000}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-vertical ${
              touched.description && errors.description
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300'
            }`}
            placeholder="Describe what students will learn in this lesson..."
          />
          {touched.description && errors.description && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.description}
            </p>
          )}
        </div>

        {/* END: Order and Duration */}

        {/* Video Management Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Video Content</h3>

          {lesson.video_provider === 'mux' && lesson.mux_playback_id ? (
            <div className="mb-4">
              <UnifiedVideoPlayer
                lesson={lesson}
              />
            </div>
          ) : lesson.video_url ? (
            <div className="mb-4">
              <UnifiedVideoPlayer
                lesson={lesson}
              />
            </div>
          ) : (
            <MuxVideoUploader
              lessonId={lessonId}
              onUploadComplete={() => {
                showNotification({
                  type: 'success',
                  title: 'Upload Complete',
                  message: 'Video is now processing.',
                  duration: 5000,
                });
                queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
                refetchVideoStatus();
              }}
              onError={(error) => {
                showNotification({
                  type: 'error',
                  title: 'Upload Failed',
                  message: error.message,
                  duration: 5000,
                });
              }}
            />
          )}

          {/* Thumbnail Selection - Only show if video is ready */}
          {(lesson.video_provider === 'mux' && lesson.mux_status === 'ready') || lesson.video_url ? (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                    <Image className="h-4 w-4" />
                    <span>Lesson Thumbnail</span>
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Select a thumbnail image for this lesson
                  </p>
                </div>
                <button
                  onClick={() => setShowThumbnailSelector(true)}
                  className="px-4 py-2 bg-gradient-to-r from-[#4FC3F7]/90 to-[#00D4FF]/90 text-white rounded-lg hover:from-[#00B8E6] hover:to-[#0099CC] transition-all text-sm font-medium flex items-center space-x-2"
                >
                  <Image className="h-4 w-4" />
                  <span>{thumbnailUrl ? 'Change Thumbnail' : 'Select Thumbnail'}</span>
                </button>
              </div>
              {thumbnailUrl && (
                <div className="mt-3">
                  <img
                    src={thumbnailUrl}
                    alt="Lesson thumbnail"
                    className="w-full max-w-xs rounded-lg border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Thumbnail Selector Modal */}
        <ThumbnailSelector
          lessonId={lessonId}
          currentThumbnailUrl={thumbnailUrl}
          onThumbnailSelected={(url) => {
            setThumbnailUrl(url);
            queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
          }}
          onClose={() => setShowThumbnailSelector(false)}
          isOpen={showThumbnailSelector}
        />

        {/* Subtitles Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subtitles / Captions</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Subtitle File (VTT or SRT)
              </label>
              <div className="flex gap-2">
                <input
                  ref={subtitleInputRef}
                  type="file"
                  accept=".vtt,.srt"
                  onChange={handleSubtitleFileChange}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {subtitleFile && (
                  <button
                    onClick={handleUploadSubtitle}
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-all"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </button>
                )}
              </div>
              {subtitleFile && (
                <p className="mt-2 text-sm text-gray-600">Selected: {subtitleFile.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Downloadable Resources Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Downloadable Resources</h3>
          
          <div className="space-y-3">
            {resources.map((resource, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <FileText className="h-5 w-5 text-gray-400 mt-2 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={resource.name}
                    onChange={(e) => handleUpdateResource(index, 'name', e.target.value)}
                    placeholder="Resource name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    value={resource.url}
                    onChange={(e) => handleUpdateResource(index, 'url', e.target.value)}
                    placeholder="Resource URL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <select
                    value={resource.type}
                    onChange={(e) => handleUpdateResource(index, 'type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="document">Document</option>
                    <option value="pdf">PDF</option>
                    <option value="link">Link</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveResource(index)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={handleAddResource}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
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
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
          >
            <Save className="h-5 w-5 mr-2" />
            Save Changes
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};

export default LessonEditor;
