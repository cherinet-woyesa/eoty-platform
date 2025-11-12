import React, { useState, useEffect } from 'react';
import { Save, X, Tag, FileText, Clock, Image, Hash, Edit2 } from 'lucide-react';
import { coursesApi } from '@/services/api';
import { useNotification } from '@/context/NotificationContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import ThumbnailSelector from './ThumbnailSelector';

interface VideoMetadataEditorProps {
  lessonId: string;
  courseId: string;
  initialData?: {
    title?: string;
    description?: string;
    tags?: string[];
    duration?: number;
    thumbnail_url?: string | null;
    allow_download?: boolean;
  };
  onSave?: (data: any) => void;
  onCancel?: () => void;
  isOpen: boolean;
}

const VideoMetadataEditor: React.FC<VideoMetadataEditorProps> = ({
  lessonId,
  courseId,
  initialData,
  onSave,
  onCancel,
  isOpen
}) => {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [duration, setDuration] = useState(initialData?.duration || 0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initialData?.thumbnail_url || null);
  const [allowDownload, setAllowDownload] = useState(initialData?.allow_download || false);
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update state when initialData changes
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setTags(initialData.tags || []);
      setDuration(initialData.duration || 0);
      setThumbnailUrl(initialData.thumbnail_url || null);
      setAllowDownload(initialData.allow_download || false);
    }
  }, [initialData]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => coursesApi.updateLesson(lessonId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] });
      
      showNotification({
        type: 'success',
        title: 'Metadata Updated',
        message: 'Video metadata has been saved successfully.',
        duration: 3000
      });

      if (onSave) {
        onSave(response.data.lesson);
      }
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.message || 'Failed to save metadata.',
        duration: 5000
      });
    }
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (description.length > 5000) {
      newErrors.description = 'Description must be less than 5000 characters';
    }

    if (duration < 0) {
      newErrors.duration = 'Duration must be non-negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const updateData: any = {
      title: title.trim(),
      description: description.trim(),
      duration: Math.floor(duration),
      allow_download: allowDownload
    };

    // Add tags in metadata field (will be stored as JSON string in backend)
    if (tags.length > 0) {
      updateData.metadata = { tags };
    } else {
      updateData.metadata = {};
    }

    if (thumbnailUrl) {
      updateData.thumbnail_url = thumbnailUrl;
    }

    updateMutation.mutate(updateData);
  };

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90">
          <h3 className="text-xl font-bold text-slate-700 flex items-center space-x-2">
            <Edit2 className="h-6 w-6 text-slate-600" />
            <span>Edit Video Metadata</span>
          </h3>
          <button
            onClick={onCancel}
            disabled={updateMutation.isPending}
            className="p-2 rounded-full hover:bg-slate-100/50 text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors({ ...errors, title: '' });
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent text-sm bg-white/80 text-slate-700 ${
                errors.title ? 'border-red-300' : 'border-slate-300'
              }`}
              placeholder="Enter lesson title"
              maxLength={200}
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">{title.length}/200 characters</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors({ ...errors, description: '' });
              }}
              rows={4}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent text-sm bg-white/80 text-slate-700 resize-none ${
                errors.description ? 'border-red-300' : 'border-slate-300'
              }`}
              placeholder="Enter lesson description (optional)"
              maxLength={5000}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">{description.length}/5000 characters</p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Tag className="h-4 w-4 inline mr-1" />
              Tags
            </label>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent text-sm bg-white/80 text-slate-700"
                placeholder="Add a tag (press Enter)"
                maxLength={30}
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim() || tags.length >= 10}
                className="px-4 py-2 bg-gradient-to-r from-[#4FC3F7]/90 to-[#00D4FF]/90 text-white rounded-lg hover:from-[#00B8E6] hover:to-[#0099CC] transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-[#39FF14]/20 to-[#00FF41]/20 text-[#39FF14] rounded-full text-sm border border-[#39FF14]/30"
                  >
                    <Hash className="h-3 w-3" />
                    <span>{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-[#00E6B8] transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {tags.length}/10 tags. Use tags to help students find your content.
            </p>
          </div>

          {/* Duration and Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Duration (minutes)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setDuration(value);
                  if (errors.duration) setErrors({ ...errors, duration: '' });
                }}
                min="0"
                step="0.1"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent text-sm bg-white/80 text-slate-700 ${
                  errors.duration ? 'border-red-300' : 'border-slate-300'
                }`}
                placeholder="0"
              />
              {errors.duration && (
                <p className="text-xs text-red-500 mt-1">{errors.duration}</p>
              )}
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="allowDownload"
                checked={allowDownload}
                onChange={(e) => setAllowDownload(e.target.checked)}
                className="h-4 w-4 text-[#39FF14] rounded focus:ring-2 focus:ring-[#39FF14]/50"
              />
              <label htmlFor="allowDownload" className="ml-2 text-sm text-slate-700">
                Allow students to download this video
              </label>
            </div>
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Image className="h-4 w-4 inline mr-1" />
              Thumbnail
            </label>
            {thumbnailUrl ? (
              <div className="relative inline-block">
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail"
                  className="w-32 h-20 object-cover rounded-lg border border-slate-300"
                />
                <button
                  onClick={() => setThumbnailUrl(null)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowThumbnailSelector(true)}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white/80 hover:bg-white hover:border-slate-400/50 transition-all text-sm text-slate-700"
              >
                Select Thumbnail
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200/50 bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90">
          <button
            onClick={onCancel}
            disabled={updateMutation.isPending}
            className="px-4 py-2 border border-slate-300/50 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white hover:border-slate-400/50 transition-all duration-200 text-slate-700 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending || !title.trim()}
            className="px-6 py-2 bg-gradient-to-r from-[#39FF14]/90 to-[#00FF41]/90 text-white rounded-lg hover:from-[#00E6B8] hover:to-[#00D4A3] transition-all duration-200 font-semibold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" color="white" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

        {/* Thumbnail Selector Modal */}
        {showThumbnailSelector && (
          <ThumbnailSelector
            lessonId={lessonId}
            currentThumbnailUrl={thumbnailUrl}
            onThumbnailSelected={(url) => {
              setThumbnailUrl(url);
              setShowThumbnailSelector(false);
            }}
            onClose={() => setShowThumbnailSelector(false)}
            isOpen={showThumbnailSelector}
          />
        )}
      </div>
    </div>
  );
};

export default VideoMetadataEditor;

