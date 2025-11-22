import React, { useState, useRef } from 'react';
import {
  Paperclip,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Download,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { forumApi } from '../../../services/api/forums';

interface Attachment {
  id: string;
  file_name: string;
  original_name: string;
  file_path: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string;
  uploader_first_name?: string;
  uploader_last_name?: string;
  created_at: string;
}

interface AttachmentManagerProps {
  attachments: Attachment[];
  postId?: string;
  topicId?: string;
  canUpload?: boolean;
  canDelete?: boolean;
  onAttachmentChange?: () => void;
}

const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  attachments,
  postId,
  topicId,
  canUpload = false,
  canDelete = false,
  onAttachmentChange
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon className="h-5 w-5 text-green-600" />;
      case 'video':
        return <Video className="h-5 w-5 text-red-600" />;
      case 'audio':
        return <Music className="h-5 w-5 text-purple-600" />;
      default:
        return <FileText className="h-5 w-5 text-blue-600" />;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov',
      'audio/mp3', 'audio/wav', 'audio/m4a',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadError('File type not supported. Please upload images, videos, audio files, or documents.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError('');

      const formData = new FormData();
      formData.append('file', file);
      if (postId) formData.append('postId', postId);
      if (topicId) formData.append('topicId', topicId);

      await forumApi.uploadAttachment(formData);
      onAttachmentChange?.();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      setUploadError(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      await forumApi.deleteAttachment(attachmentId);
      onAttachmentChange?.();
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    // In a real app, this would generate a download URL
    // For now, we'll simulate download
    const link = document.createElement('a');
    link.href = attachment.file_path;
    link.download = attachment.original_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">
            Attachments ({attachments.length})
          </h3>
        </div>

        {canUpload && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#27AE60]/10 text-[#27AE60] rounded-md hover:bg-[#27AE60]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b border-[#27AE60]"></div>
              ) : (
                <Upload className="h-3 w-3" />
              )}
              Upload
            </button>
          </div>
        )}
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(attachment.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.original_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.file_size)} •
                    Uploaded by {attachment.uploader_first_name} {attachment.uploader_last_name} •
                    {new Date(attachment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadAttachment(attachment)}
                  className="p-1.5 text-gray-600 hover:text-[#27AE60] hover:bg-[#27AE60]/10 rounded transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>

                {canDelete && (
                  <button
                    onClick={() => handleDeleteAttachment(attachment.id)}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Paperclip className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No attachments yet</p>
          {canUpload && (
            <p className="text-gray-400 text-xs mt-1">
              Click "Upload" to add files to this {postId ? 'post' : 'topic'}
            </p>
          )}
        </div>
      )}

      {/* Upload Instructions */}
      {canUpload && attachments.length === 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-1">Supported file types:</h4>
          <p className="text-xs text-blue-700">
            Images (JPEG, PNG, GIF, WebP), Videos (MP4, AVI, MOV), Audio (MP3, WAV, M4A),
            Documents (PDF, DOC, DOCX, TXT, CSV) - Max 10MB per file
          </p>
        </div>
      )}
    </div>
  );
};

export default AttachmentManager;
