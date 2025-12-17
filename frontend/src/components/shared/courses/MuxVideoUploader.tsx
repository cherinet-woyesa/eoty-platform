import { useState, useCallback, useEffect, useRef } from 'react';
import type { FC } from 'react';
import MuxUploader from '@mux/mux-uploader-react';
import { apiClient } from '@/services/api/apiClient';
import { Upload, CheckCircle, AlertCircle, Loader, X } from 'lucide-react';

interface MuxVideoUploaderProps {
  lessonId: string;
  videoBlob?: Blob; // Optional: if provided, will auto-upload this blob
  onUploadComplete: (lessonId: string) => void; // Changed: now passes lessonId
  onUploadProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

interface UploadUrlResponse {
  success: boolean;
  data: {
    uploadUrl: string;
    uploadId: string;
    lessonId: string;
  };
}

const MuxVideoUploader: FC<MuxVideoUploaderProps> = ({
  lessonId,
  videoBlob,
  onUploadComplete,
  onUploadProgress,
  onError,
  onCancel
}) => {
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'preparing' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  // Fetch upload URL from backend
  const fetchUploadUrl = useCallback(async () => {
    if (!lessonId) {
      const error = new Error('Lesson ID is required to create upload URL');
      setErrorMessage(error.message);
      setUploadStatus('error');
      onError?.(error);
      return;
    }

    if (isFetchingRef.current || uploadUrl) return;

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setUploadStatus('preparing');
      setErrorMessage(null);

      const response = await apiClient.post<UploadUrlResponse>('/videos/mux/upload-url', {
        lessonId,
        metadata: {
          source: 'web-uploader',
          timestamp: new Date().toISOString()
        }
      });

      if (response.data.success && response.data.data) {
        setUploadUrl(response.data.data.uploadUrl);
        setUploadStatus('idle');
      } else {
        throw new Error('Failed to get upload URL');
      }
    } catch (error: any) {
      console.error('Failed to fetch Mux upload URL:', error);
      let message = 'Failed to prepare upload';
      
      // Parse error message from response
      if (error.response?.data?.error) {
        // Check if it's a Mux API error with details
        const errorStr = typeof error.response.data.error === 'string' 
          ? error.response.data.error 
          : JSON.stringify(error.response.data.error);
        
        // Check for Mux asset limit error
        if (errorStr.includes('Free plan is limited to 10 assets') || 
            errorStr.includes('exceeding this limit')) {
          message = 'Upload limit reached: You have reached the limit for video uploads. Please delete old videos to upload more.';
        } else if (errorStr.includes('invalid_parameters')) {
          // Try to extract the actual error message from Mux
          try {
            const errorObj = typeof error.response.data.error === 'string' 
              ? JSON.parse(error.response.data.error) 
              : error.response.data.error;
            if (errorObj?.error?.messages?.[0]) {
              message = `Upload error: ${errorObj.error.messages[0]}`;
            }
          } catch {
            message = errorStr;
          }
        } else {
          message = errorStr;
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      
      // Log full error for debugging
      console.error('Upload URL error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      setErrorMessage(message);
      setUploadStatus('error');
      onError?.(new Error(message));
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, onError]);

  // Handle upload progress
  const handleProgress = useCallback((event: any) => {
    const progress = event.detail;
    if (typeof progress === 'number') {
      setUploadProgress(Math.round(progress));
      setUploadStatus('uploading');
      onUploadProgress?.(progress);
    }
  }, [onUploadProgress]);

  // Handle upload success
  const handleSuccess = useCallback(() => {
    // The `onSuccess` event from MuxUploader confirms the file has been uploaded.
    // It does not provide the assetId or playbackId directly.
    // These details are sent to the backend via webhooks from Mux.
    setUploadStatus('success');
    setUploadProgress(100);
    onUploadComplete(lessonId);
  }, [onUploadComplete, lessonId]);

  // Handle upload error
  const handleError = useCallback((event: any) => {
    console.error('Mux upload error:', event.detail);
    const message = event.detail?.message || 'Upload failed';
    setErrorMessage(message);
    setUploadStatus('error');
    onError?.(new Error(message));
  }, [onError]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setUploadUrl(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setErrorMessage(null);
    onCancel?.();
  }, [onCancel]);

  // Initialize upload URL when component mounts
  const handleInitialize = useCallback(() => {
    if (!uploadUrl) {
      fetchUploadUrl();
    }
  }, [uploadUrl, fetchUploadUrl]);

  // Simple blob validation
  const validateBlob = useCallback((blob: Blob): void => {
    // Validation info removed from console for cleaner UX

    // Check blob size
    if (blob.size < 1024) {
      throw new Error('Video file is too small (less than 1KB). Recording may have failed.');
    }

    if (blob.size > 2 * 1024 * 1024 * 1024) {
      throw new Error('Video file is too large (over 2GB). Please record a shorter video.');
    }

    // Validation passed
  }, []);

  // Upload blob directly to Mux with validation
  const uploadBlobToMux = useCallback(async (blob: Blob, url: string) => {
    try {
      setUploadStatus('uploading');
      setUploadProgress(0);

      // Simple validation
      validateBlob(blob);
      // Blob validated

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(progress));
          onUploadProgress?.(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadStatus('success');
          setUploadProgress(100);
          // Mux will send webhook when asset is ready
          onUploadComplete(lessonId); // Pass lessonId - Asset ID will come via webhook
        } else {
          throw new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`);
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Network error during upload. Please check your connection and try again.');
      });

      xhr.addEventListener('abort', () => {
        throw new Error('Upload was aborted');
      });

      xhr.open('PUT', url);
      // Force a conservative content type to satisfy Mux/GCS upload requirements
      const contentType = 'application/octet-stream';
      xhr.setRequestHeader('Content-Type', contentType);
      // Content-Type set
      
      // Starting upload
      
      xhr.send(blob);
    } catch (error: any) {
      console.error('Failed to upload blob to Mux:', error);
      const message = error.message || 'Upload failed';
      setErrorMessage(message);
      setUploadStatus('error');
      onError?.(error);
    }
  }, [validateBlob, onUploadProgress, onUploadComplete, onError]);

  // Auto-upload when videoBlob is provided
  useEffect(() => {
    if (videoBlob && !uploadUrl && lessonId) {
      fetchUploadUrl();
    }
  }, [videoBlob, uploadUrl, lessonId, fetchUploadUrl]);

  // Upload blob when URL is ready
  useEffect(() => {
    if (videoBlob && uploadUrl && uploadStatus === 'idle') {
      uploadBlobToMux(videoBlob, uploadUrl);
    }
  }, [videoBlob, uploadUrl, uploadStatus, uploadBlobToMux]);

  return (
    <div className="w-full">
      {/* Status Messages */}
      {uploadStatus === 'error' && errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-2">Upload Failed</h4>
              <p className="text-sm text-red-700 mb-2">{errorMessage}</p>
              {errorMessage.includes('10 asset limit') && (
                <div className="mt-3 p-2 bg-red-100 rounded border border-red-200">
                  <p className="text-xs text-red-800 font-medium mb-1">Solutions:</p>
                  <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                    <li>Delete unused videos from your Mux dashboard</li>
                    <li>Upgrade your Mux plan for more storage</li>
                    <li>Use S3 upload instead (toggle in settings)</li>
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="text-red-600 hover:text-red-800 flex-shrink-0"
              aria-label="Close error"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-green-900">Upload Complete</h4>
            <p className="text-sm text-green-700 mt-1">
              Upload complete. You can safely close this window. A success message will appear when processing is done.
            </p>
            <p className="text-sm text-green-700 mt-2">
              <strong>Note:</strong> The video will be available for playback in a few minutes after Mux finishes processing it. You can close this window and check back later.
            </p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadStatus === 'uploading' && (videoBlob || uploadProgress <= 5) && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Loader className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm font-medium text-blue-900">Uploading...</span>
            </div>
            <span className="text-sm font-semibold text-blue-900">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Mux Uploader Component - Only show if no blob is provided */}
      {!uploadUrl && uploadStatus !== 'success' && !videoBlob && (
        <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload Video to Mux
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Click below to prepare your video upload
          </p>
          <button
            onClick={handleInitialize}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 mx-auto"
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Preparing...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Initialize Upload</span>
              </>
            )}
          </button>
        </div>
      )}

      {uploadUrl && uploadStatus !== 'success' && !videoBlob && (
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
          <MuxUploader
            endpoint={uploadUrl}
            onProgress={handleProgress}
            onSuccess={handleSuccess}
            onError={handleError}
            className="w-full"
          />
          {onCancel && (
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                Cancel Upload
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MuxVideoUploader;
