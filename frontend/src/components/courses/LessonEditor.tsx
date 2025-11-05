import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi, videoApi } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useFormValidation, validationRules } from '../../hooks/useFormValidation';
import type { Lesson } from '../../types/courses';
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
} from 'lucide-react';
import { Spinner, LoadingButton } from '../shared/LoadingStates';

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

interface ThumbnailOption {
  time: number;
  dataUrl: string;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({
  lessonId,
  courseId,
  onSave,
  onCancel,
}) => {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const videoInputRef = useRef<HTMLInputElement>(null);
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

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [thumbnailOptions, setThumbnailOptions] = useState<ThumbnailOption[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string>('');
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);

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
      if (lesson.video_url) {
        setVideoPreviewUrl(lesson.video_url);
      }
      // Load resources if they exist in lesson metadata
      if (lesson.resources && Array.isArray(lesson.resources)) {
        setResources(lesson.resources);
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

  // Video file selection
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      showNotification({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select a video file',
        duration: 5000,
      });
      return;
    }

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      showNotification({
        type: 'error',
        title: 'File Too Large',
        message: 'Video must be less than 500MB',
        duration: 5000,
      });
      return;
    }

    setVideoFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);

    // Extract video metadata (duration)
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const durationInSeconds = Math.floor(video.duration);
      
      // Auto-populate duration if not already set
      if (formData.duration === 0 || !formData.duration) {
        setFormData(prev => ({ ...prev, duration: durationInSeconds }));
        showNotification({
          type: 'info',
          title: 'Duration Detected',
          message: `Video duration: ${Math.floor(durationInSeconds / 60)}m ${durationInSeconds % 60}s`,
          duration: 3000,
        });
      }
    };
    video.src = url;
  };

  // Upload video
  const handleUploadVideo = async () => {
    if (!videoFile) {
      showNotification({
        type: 'error',
        title: 'No Video Selected',
        message: 'Please select a video file to upload',
        duration: 3000,
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await videoApi.uploadVideoFile(videoFile, lessonId, (progress) => {
        setUploadProgress(progress);
      });

      showNotification({
        type: 'success',
        title: 'Upload Complete',
        message: 'Video uploaded successfully and is being processed',
        duration: 5000,
      });

      // Refresh video status
      refetchVideoStatus();
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      
      setVideoFile(null);
      setIsUploading(false);
      setUploadProgress(0);
    } catch (error: any) {
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: error.response?.data?.message || 'Failed to upload video',
        duration: 5000,
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Replace video
  const handleReplaceVideo = () => {
    setVideoFile(null);
    setVideoPreviewUrl('');
    videoInputRef.current?.click();
  };

  // Remove video
  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreviewUrl('');
    setThumbnailOptions([]);
    setSelectedThumbnail('');
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  // Generate thumbnail options from video
  const generateThumbnails = async () => {
    if (!videoPreviewUrl) return;

    setIsGeneratingThumbnails(true);
    const thumbnails: ThumbnailOption[] = [];

    try {
      const video = document.createElement('video');
      video.src = videoPreviewUrl;
      video.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      const duration = video.duration;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Generate 6 thumbnails at different timestamps
      const timestamps = [
        duration * 0.1,
        duration * 0.25,
        duration * 0.4,
        duration * 0.55,
        duration * 0.7,
        duration * 0.85,
      ];

      for (const time of timestamps) {
        video.currentTime = time;
        await new Promise((resolve) => {
          video.onseeked = resolve;
        });

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        thumbnails.push({ time, dataUrl });
      }

      setThumbnailOptions(thumbnails);
      if (thumbnails.length > 0) {
        setSelectedThumbnail(thumbnails[0].dataUrl);
      }

      showNotification({
        type: 'success',
        title: 'Thumbnails Generated',
        message: 'Select a thumbnail for your video',
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Thumbnail generation error:', error);
      showNotification({
        type: 'error',
        title: 'Thumbnail Generation Failed',
        message: 'Could not generate thumbnails from video',
        duration: 5000,
      });
    } finally {
      setIsGeneratingThumbnails(false);
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

        {/* Order and Duration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-2">
              Lesson Order
            </label>
            <input
              type="number"
              id="order"
              value={formData.order}
              onChange={(e) => handleChange('order', parseInt(e.target.value) || 0)}
              min={0}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="0"
            />
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              Duration (seconds)
            </label>
            <input
              type="number"
              id="duration"
              value={formData.duration}
              onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
              min={0}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="0"
            />
          </div>
        </div>

        {/* Video Management Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Video Content</h3>
          
          {/* Video Status */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            {getVideoStatusDisplay()}
            {videoStatusData?.data?.errorMessage && (
              <p className="mt-2 text-sm text-red-600">{videoStatusData.data.errorMessage}</p>
            )}
          </div>

          {/* Video Preview */}
          {videoPreviewUrl && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video Preview
              </label>
              <div className="relative">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full max-w-2xl rounded-lg border border-gray-300"
                  style={{ maxHeight: '400px' }}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleReplaceVideo}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Replace Video
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </button>
                  {videoFile && thumbnailOptions.length === 0 && (
                    <button
                      type="button"
                      onClick={generateThumbnails}
                      disabled={isGeneratingThumbnails}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingThumbnails ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Video className="h-4 w-4 mr-2" />
                          Generate Thumbnails
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Thumbnail Selection */}
          {thumbnailOptions.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Video Thumbnail
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {thumbnailOptions.map((thumbnail, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedThumbnail(thumbnail.dataUrl)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedThumbnail === thumbnail.dataUrl
                        ? 'border-purple-600 ring-2 ring-purple-200'
                        : 'border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    <img
                      src={thumbnail.dataUrl}
                      alt={`Thumbnail at ${thumbnail.time.toFixed(1)}s`}
                      className="w-full h-auto"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs px-2 py-1">
                      {thumbnail.time.toFixed(1)}s
                    </div>
                    {selectedThumbnail === thumbnail.dataUrl && (
                      <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-1">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Upload */}
          {!videoPreviewUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Video
              </label>
              <div
                onClick={() => videoInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all"
              >
                <Video className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-1">Click to upload video</p>
                <p className="text-xs text-gray-500">MP4, WebM, or other video formats up to 500MB</p>
              </div>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Upload Progress */}
          {videoFile && !isUploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Selected: {videoFile.name}</span>
                <span className="text-sm text-gray-500">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <button
                onClick={handleUploadVideo}
                className="w-full inline-flex items-center justify-center px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-all"
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload Video
              </button>
            </div>
          )}

          {isUploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Uploading...</span>
                <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

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
