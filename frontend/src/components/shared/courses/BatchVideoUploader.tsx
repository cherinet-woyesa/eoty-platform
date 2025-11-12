import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader, FileVideo, Trash2, Play } from 'lucide-react';
import { coursesApi, videoApi } from '@/services/api';
import { useNotification } from '@/context/NotificationContext';
import { formatTime } from '@/utils/formatters';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';

interface VideoFile {
  id: string;
  file: File;
  title: string;
  description: string;
  order: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  lessonId?: string;
  error?: string;
}

interface BatchVideoUploaderProps {
  courseId: string;
  onUploadComplete?: (lessonIds: string[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

const BatchVideoUploader: React.FC<BatchVideoUploaderProps> = ({
  courseId,
  onUploadComplete,
  onClose,
  isOpen
}) => {
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const videoFiles = files.filter(file => file.type.startsWith('video/'));

    if (videoFiles.length === 0) {
      showNotification({
        type: 'warning',
        title: 'No Video Files',
        message: 'Please select video files only.',
        duration: 3000
      });
      return;
    }

    const newVideos: VideoFile[] = videoFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      description: '',
      order: videoFiles.length + index,
      status: 'pending',
      progress: 0
    }));

    setVideoFiles(prev => [...prev, ...newVideos]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    setVideoFiles(prev => prev.filter(v => v.id !== id).map((v, index) => ({
      ...v,
      order: index + 1
    })));
  };

  const handleUpdateVideo = (id: string, updates: Partial<VideoFile>) => {
    setVideoFiles(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const uploadVideo = async (videoFile: VideoFile): Promise<string> => {
    // Create lesson first
    const lessonResponse = await coursesApi.createLesson(courseId, {
      title: videoFile.title,
      description: videoFile.description,
      order: videoFile.order
    });

    if (!lessonResponse.success || !lessonResponse.data?.lesson?.id) {
      throw new Error('Failed to create lesson');
    }

    const lessonId = lessonResponse.data.lesson.id.toString();

    // Get Mux upload URL
    const uploadUrlResponse = await videoApi.createMuxUploadUrl(lessonId);

    if (!uploadUrlResponse.success || !uploadUrlResponse.data?.uploadUrl) {
      throw new Error('Failed to get upload URL');
    }

    const uploadUrl = uploadUrlResponse.data.uploadUrl;

    // Upload to Mux
    const formData = new FormData();
    formData.append('file', videoFile.file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          handleUpdateVideo(videoFile.id, { progress });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          handleUpdateVideo(videoFile.id, { status: 'processing', progress: 100 });
          resolve(lessonId);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.send(formData);
    });
  };

  const handleBatchUpload = async () => {
    if (videoFiles.length === 0) {
      showNotification({
        type: 'warning',
        title: 'No Videos Selected',
        message: 'Please select at least one video file.',
        duration: 3000
      });
      return;
    }

    setIsUploading(true);
    setCurrentUploadIndex(0);
    const completedLessonIds: string[] = [];

    // Update all to uploading status
    setVideoFiles(prev => prev.map(v => ({ ...v, status: 'pending' as const })));

    try {
      // Upload videos sequentially to avoid overwhelming the server
      for (let i = 0; i < videoFiles.length; i++) {
        const videoFile = videoFiles[i];
        setCurrentUploadIndex(i);

        try {
          handleUpdateVideo(videoFile.id, { status: 'uploading', progress: 0 });
          const lessonId = await uploadVideo(videoFile);
          handleUpdateVideo(videoFile.id, { status: 'completed', lessonId });
          completedLessonIds.push(lessonId);
        } catch (error: any) {
          console.error(`Failed to upload ${videoFile.title}:`, error);
          handleUpdateVideo(videoFile.id, {
            status: 'error',
            error: error.message || 'Upload failed'
          });
        }
      }

      if (completedLessonIds.length > 0) {
        showNotification({
          type: 'success',
          title: 'Batch Upload Complete',
          message: `Successfully uploaded ${completedLessonIds.length} of ${videoFiles.length} videos.`,
          duration: 5000
        });
        onUploadComplete?.(completedLessonIds);
      } else {
        showNotification({
          type: 'error',
          title: 'Upload Failed',
          message: 'All uploads failed. Please try again.',
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error('Batch upload error:', error);
      showNotification({
        type: 'error',
        title: 'Batch Upload Error',
        message: error.message || 'An error occurred during batch upload.',
        duration: 5000
      });
    } finally {
      setIsUploading(false);
      setCurrentUploadIndex(0);
    }
  };

  const getFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90">
          <h3 className="text-xl font-bold text-slate-700 flex items-center space-x-2">
            <Upload className="h-6 w-6 text-slate-600" />
            <span>Batch Video Upload</span>
          </h3>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-full hover:bg-slate-100/50 text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* File Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Video Files
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileSelect}
              disabled={isUploading}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent text-sm bg-white/80 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-2">
              You can select multiple video files at once. They will be uploaded sequentially.
            </p>
          </div>

          {/* Video List */}
          {videoFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">
                Videos ({videoFiles.length})
              </h4>
              {videoFiles.map((videoFile) => (
                <div
                  key={videoFile.id}
                  className="p-4 bg-slate-50/50 rounded-lg border border-slate-200/50"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                        <FileVideo className="h-8 w-8 text-slate-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={videoFile.title}
                        onChange={(e) => handleUpdateVideo(videoFile.id, { title: e.target.value })}
                        disabled={isUploading || videoFile.status === 'uploading'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent text-sm bg-white/80 text-slate-700 mb-2 disabled:opacity-50"
                        placeholder="Lesson title"
                      />
                      <textarea
                        value={videoFile.description}
                        onChange={(e) => handleUpdateVideo(videoFile.id, { description: e.target.value })}
                        disabled={isUploading || videoFile.status === 'uploading'}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent text-sm bg-white/80 text-slate-700 mb-2 disabled:opacity-50"
                        placeholder="Lesson description (optional)"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{videoFile.file.name}</span>
                        <span>{getFileSize(videoFile.file.size)}</span>
                      </div>
                      {videoFile.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                            <span>Uploading...</span>
                            <span>{Math.round(videoFile.progress)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div
                              className="bg-gradient-to-r from-[#4FC3F7] to-[#00D4FF] h-1.5 rounded-full transition-all"
                              style={{ width: `${videoFile.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {videoFile.status === 'processing' && (
                        <div className="mt-2 flex items-center space-x-2 text-xs text-slate-600">
                          <Loader className="h-3 w-3 animate-spin" />
                          <span>Processing...</span>
                        </div>
                      )}
                      {videoFile.status === 'completed' && (
                        <div className="mt-2 flex items-center space-x-2 text-xs text-[#39FF14]">
                          <CheckCircle className="h-3 w-3" />
                          <span>Upload complete</span>
                        </div>
                      )}
                      {videoFile.status === 'error' && (
                        <div className="mt-2">
                          <ErrorAlert error={videoFile.error || 'Upload failed'} />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveFile(videoFile.id)}
                      disabled={isUploading || videoFile.status === 'uploading'}
                      className="p-2 text-red-500 hover:bg-red-50/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove video"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {videoFiles.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FileVideo className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p>No videos selected</p>
              <p className="text-sm mt-2">Select video files to get started</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200/50 bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90">
          <div className="text-sm text-slate-600">
            {isUploading && (
              <span>
                Uploading {currentUploadIndex + 1} of {videoFiles.length}...
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 border border-slate-300/50 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white hover:border-slate-400/50 transition-all duration-200 text-slate-700 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBatchUpload}
              disabled={videoFiles.length === 0 || isUploading}
              className="px-6 py-2 bg-gradient-to-r from-[#39FF14]/90 to-[#00FF41]/90 text-white rounded-lg hover:from-[#00E6B8] hover:to-[#00D4A3] transition-all duration-200 font-semibold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  <span>Upload All ({videoFiles.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchVideoUploader;

