import React, { useState } from 'react';
import { Check, X, Clock, FileText, Video, Image, Download, Eye, EyeOff, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import type { ContentUpload } from '../../types/admin';

interface UploadQueueProps {
  uploads: ContentUpload[];
  onApprove: (uploadId: number, action: 'approve' | 'reject', reason?: string) => Promise<boolean>;
  loading?: boolean;
}

const UploadQueue: React.FC<UploadQueueProps> = ({ uploads, onApprove, loading }) => {
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [videoStates, setVideoStates] = useState<Record<number, { playing: boolean; muted: boolean }>>({});

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'video':
        return <Video className="h-5 w-5 text-red-500" />;
      case 'image':
        return <Image className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApprove = async (uploadId: number) => {
    const success = await onApprove(uploadId, 'approve');
    if (success) {
      // Success handled in parent
    }
  };

  const handleReject = async (uploadId: number) => {
    if (!rejectionReason.trim()) return;
    
    const success = await onApprove(uploadId, 'reject', rejectionReason);
    if (success) {
      setRejectingId(null);
      setRejectionReason('');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const togglePreview = (uploadId: number) => {
    setPreviewId(previewId === uploadId ? null : uploadId);
  };

  const toggleVideoPlay = (uploadId: number) => {
    setVideoStates(prev => ({
      ...prev,
      [uploadId]: {
        ...prev[uploadId],
        playing: !prev[uploadId]?.playing
      }
    }));
  };

  const toggleVideoMute = (uploadId: number) => {
    setVideoStates(prev => ({
      ...prev,
      [uploadId]: {
        ...prev[uploadId],
        muted: !prev[uploadId]?.muted
      }
    }));
  };

  const renderPreview = (upload: ContentUpload) => {
    if (previewId !== upload.id) return null;

    // In a real implementation, we would generate a preview URL
    // For now, we'll show a placeholder based on file type
    switch (upload.file_type) {
      case 'video':
        return (
          <div className="mt-4 bg-gray-900 rounded-lg overflow-hidden">
            <div className="relative aspect-video flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                <div className="text-center">
                  <Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Video Preview</p>
                  <p className="text-gray-500 text-sm mt-1">File: {upload.file_name}</p>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => toggleVideoPlay(upload.id)}
                    className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    {videoStates[upload.id]?.playing ? 
                      <Pause className="h-5 w-5 text-white" /> : 
                      <Play className="h-5 w-5 text-white" />
                    }
                  </button>
                  <button 
                    onClick={() => toggleVideoMute(upload.id)}
                    className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    {videoStates[upload.id]?.muted ? 
                      <VolumeX className="h-5 w-5 text-white" /> : 
                      <Volume2 className="h-5 w-5 text-white" />
                    }
                  </button>
                </div>
                <button className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors">
                  <Maximize2 className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="mt-4 bg-gray-100 rounded-lg overflow-hidden">
            <div className="aspect-video flex items-center justify-center">
              <div className="text-center">
                <Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Image Preview</p>
                <p className="text-gray-500 text-sm mt-1">File: {upload.file_name}</p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="mt-4 bg-gray-50 rounded-lg p-6">
            <div className="flex items-start">
              <FileText className="h-8 w-8 text-gray-400 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-900">Document Preview</h4>
                <p className="text-gray-600 text-sm mt-1">File: {upload.file_name}</p>
                <p className="text-gray-500 text-xs mt-2">
                  This file type cannot be previewed directly. 
                  Click "Download" to view the full content.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  if (loading && uploads.length === 0) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending uploads</h3>
        <p className="text-gray-600">All content has been processed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {uploads.map(upload => (
        <div key={upload.id} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {getFileIcon(upload.file_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {upload.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-2">
                  {upload.description || 'No description provided'}
                </p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>By {upload.uploader_first_name} {upload.uploader_last_name}</span>
                  <span>•</span>
                  <span>Chapter: {upload.chapter_id}</span>
                  <span>•</span>
                  <span>{formatFileSize(parseInt(upload.file_size || '0'))}</span>
                </div>
                
                {upload.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {upload.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(upload.status)}`}>
                {upload.status}
              </span>
            </div>
          </div>

          {/* Preview Section */}
          {renderPreview(upload)}

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Uploaded {new Date(upload.created_at).toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {upload.status === 'pending' && (
                <>
                  {rejectingId === upload.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Rejection reason..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => handleReject(upload.id)}
                        disabled={!rejectionReason.trim()}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(upload.id)}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" />
                        <span>Approve</span>
                      </button>
                      
                      <button
                        onClick={() => setRejectingId(upload.id)}
                        className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        <X className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}
                </>
              )}
              
              <button 
                onClick={() => togglePreview(upload.id)}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                {previewId === upload.id ? 
                  <EyeOff className="h-4 w-4" /> : 
                  <Eye className="h-4 w-4" />
                }
                <span>{previewId === upload.id ? 'Hide' : 'Preview'}</span>
              </button>
              
              <button className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UploadQueue;