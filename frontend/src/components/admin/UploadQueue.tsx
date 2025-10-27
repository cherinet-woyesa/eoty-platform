import React, { useState } from 'react';
import { Check, X, Clock, FileText, Video, Image, Download } from 'lucide-react';
import type { ContentUpload } from '../../types/admin';

interface UploadQueueProps {
  uploads: ContentUpload[];
  onApprove: (uploadId: number, action: 'approve' | 'reject', reason?: string) => Promise<boolean>;
  loading?: boolean;
}

const UploadQueue: React.FC<UploadQueueProps> = ({ uploads, onApprove, loading }) => {
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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
              
              <button className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                <Download className="h-4 w-4" />
                <span>Preview</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UploadQueue;