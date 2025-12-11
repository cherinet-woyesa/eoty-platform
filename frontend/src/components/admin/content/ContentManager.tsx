import React, { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import type { ContentUpload } from '@/types/admin';
import UnifiedUploadForm from './UnifiedUploadForm';
import { brandColors } from '@/theme/brand';
import {
  Upload,
  Plus,
  Search,
  FileText,
  Video,
  Image,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Hash,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const ContentManager: React.FC = () => {
  const { confirm } = useConfirmDialog();
  const [uploads, setUploads] = useState<ContentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [newUpload, setNewUpload] = useState({
    title: '',
    description: '',
    category: '',
    tags: [] as string[],
    chapterId: '', // Will be set dynamically
    file: null as File | null
  });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadMetadata, setUploadMetadata] = useState<{
    template: {
      title: string;
      description: string;
      category: string;
      tags: string[];
    };
    individual: Record<string, {
      title: string;
      description: string;
      category: string;
      tags: string[];
    }>;
  }>({
    template: {
      title: '{filename}',
      description: 'Uploaded file: {filename}',
      category: '',
      tags: []
    },
    individual: {}
  });
  const [chapters, setChapters] = useState<{id: number, name: string, location: string}[]>([]);
  const [showUnifiedUpload, setShowUnifiedUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUploads, setSelectedUploads] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<Record<number, any>>({});
  const [loadingPreview, setLoadingPreview] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  // Template variable processing
  const processTemplate = (template: string, variables: Record<string, any>): string => {
    return template.replace(/{(\w+)}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  };

  // Generate metadata for a file using template or individual settings
  const generateFileMetadata = (file: File, index: number) => {
    const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    const variables = {
      filename: fileName,
      index: (index + 1).toString(),
      date: new Date().toISOString().split('T')[0],
      extension: file.name.split('.').pop() || '',
      size: (file.size / 1024 / 1024).toFixed(2) + 'MB'
    };

    const fileKey = `${file.name}-${file.size}`;
    const individual = uploadMetadata.individual[fileKey];

    if (individual) {
      // Use individual metadata
      return {
        title: individual.title || processTemplate(uploadMetadata.template.title, variables),
        description: individual.description || processTemplate(uploadMetadata.template.description, variables),
        category: individual.category || uploadMetadata.template.category,
        tags: individual.tags.length > 0 ? individual.tags : uploadMetadata.template.tags,
        chapterId: newUpload.chapterId,
        file
      };
    } else {
      // Use template metadata
      return {
        title: processTemplate(uploadMetadata.template.title, variables),
        description: processTemplate(uploadMetadata.template.description, variables),
        category: uploadMetadata.template.category,
        tags: uploadMetadata.template.tags,
        chapterId: newUpload.chapterId,
        file
      };
    }
  };

  // Fetch uploads on mount and when filters change
  useEffect(() => {
    fetchUploads(1);
  }, [statusFilter]);

  // Auto-refresh every 30 seconds (less aggressive)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !showUnifiedUpload) {
        fetchUploads(pagination.page, true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [loading, showUnifiedUpload, statusFilter, pagination.page]);

  const fetchUploads = async (page = pagination.page, background = false) => {
    try {
      if (!background) setLoading(true);
      setError(null);
      console.log('Fetching uploads with status filter:', statusFilter, 'page:', page);

      const response = await adminApi.getUploadQueue(
        statusFilter !== '' ? statusFilter : undefined,
        undefined,
        page,
        pagination.limit
      );
      console.log('Upload queue response:', response);

      if (response.success && response.data) {
        console.log('Setting uploads:', response.data.uploads?.length || 0, 'items');
        setUploads(response.data.uploads || []);
        if (response.data.pagination) {
          setPagination(prev => ({
            ...prev,
            page: response.data.pagination.page,
            limit: response.data.pagination.limit,
            total: response.data.pagination.total
          }));
        }
      } else {
        console.warn('Upload response not successful:', response);
        setUploads([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch uploads:', err);
      console.error('Error details:', err.response?.data || err.message);
      if (!background) {
        setError(`Failed to load content uploads: ${err.response?.data?.message || err.message}`);
      }
      setUploads([]);
    } finally {
      if (!background) setLoading(false);
    }
  };

  // Fetch chapters on mount
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const { chaptersApi } = await import('@/services/api/chapters');
        const response = await chaptersApi.getChapters();
        if (response.success && response.data?.chapters) {
          setChapters(response.data.chapters);
          // Set default chapter to first available
          if (response.data.chapters.length > 0 && !newUpload.chapterId) {
            setNewUpload(prev => ({ ...prev, chapterId: response.data.chapters[0].id.toString() }));
          }
        }
      } catch (err) {
        console.error('Error fetching chapters:', err);
      }
    };
    fetchChapters();
  }, []);

  // Unified upload handler
  const handleUnifiedUploadSubmit = async (files: File[], metadata: typeof uploadMetadata) => {
    setUploadFiles(files);
    setUploadMetadata(metadata);

    let successCount = 0;
    let errorCount = 0;
    const results: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploadData = generateFileMetadata(file, i);
        const response = await adminApi.uploadContent(uploadData);

        const isApproved = response.data?.upload?.status === 'approved';
        const statusMsg = isApproved ? 'approved' : 'pending approval';
        results.push(`✓ ${uploadData.title} (${statusMsg})`);

        successCount++;
      } catch (err: any) {
        console.error(`Failed to upload ${file.name}:`, err);
        const errorMsg = err.response?.data?.message || err.message || 'Upload failed';
        results.push(`✗ ${file.name}: ${errorMsg}`);
        errorCount++;
      }
    }

    // Show results
    if (successCount > 0) {
      const resultSummary = results.join('\n');
      setSuccessMessage(`Upload complete!\n${resultSummary}`);
      setTimeout(() => setSuccessMessage(null), 10000); // Longer timeout for bulk results
    }

    if (errorCount > 0 && successCount === 0) {
      setError(`All uploads failed:\n${results.filter(r => r.startsWith('✗')).join('\n')}`);
    }

    // Reset form on complete success
    if (errorCount === 0) {
      setUploadFiles([]);
      setUploadMetadata({
        template: {
          title: '{filename}',
          description: 'Uploaded file: {filename}',
          category: '',
          tags: []
        },
        individual: {}
      });
      setShowUnifiedUpload(false);
      fetchUploads();
    }
  };

  // Handle approve/reject actions
  const handleApprove = async (uploadId: number, action: 'approve' | 'reject', rejectionReason?: string) => {
    try {
      console.log('Handling approve/reject:', { uploadId, action, rejectionReason });
      const response = await adminApi.approveContent(uploadId, action, rejectionReason);
      if (response.success) {
        setSuccessMessage(`Content ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        fetchUploads(); // Refresh the list
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('Approval action failed:', err);
      setError(`Failed to ${action} content: ${err.response?.data?.message || err.message}`);
    }
  };

  // Handle delete action
  const handleDelete = async (uploadId: number) => {
    const isConfirmed = await confirm({
      title: 'Delete Content',
      message: 'Are you sure you want to delete this content? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger'
    });

    if (!isConfirmed) return;

    try {
      const response = await adminApi.deleteContent(uploadId);
      if (response.success) {
        setSuccessMessage('Content deleted successfully');
        fetchUploads(); // Refresh the list
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('Delete action failed:', err);
      setError(`Failed to delete content: ${err.response?.data?.message || err.message}`);
    }
  };

  // Toggle preview
  const togglePreview = async (uploadId: number) => {
    if (previewId === uploadId) {
      setPreviewId(null);
      return;
    }

    setPreviewId(uploadId);
    setLoadingPreview(uploadId);

    try {
      const response = await adminApi.getUploadPreview(uploadId);
      if (response.success) {
        setPreviewData(prev => ({
          ...prev,
          [uploadId]: response.data.preview
        }));
      }
    } catch (err: any) {
      console.error('Preview failed:', err);
      setError('Failed to load preview');
    } finally {
      setLoadingPreview(null);
    }
  };

  // Toggle select upload
  const toggleSelectUpload = (uploadId: number) => {
    setSelectedUploads(prev =>
      prev.includes(uploadId)
        ? prev.filter(id => id !== uploadId)
        : [...prev, uploadId]
    );
  };

  // File icon helper
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('video')) return <Video className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('image')) return <Image className="h-5 w-5 text-green-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Time ago helper
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  // Filtered uploads
  const filteredUploads = uploads.filter(upload =>
    (upload.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (upload.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (upload.chapter_id?.toString() || '').includes(searchTerm.toLowerCase()) ||
    (upload.file_type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: brandColors.primaryHex }} />
          <p className="text-gray-600 text-lg">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               {/* Left side empty or for filters later */}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnifiedUpload(true)}
                  className="inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md hover:opacity-90"
                  style={{ backgroundColor: brandColors.primaryHex }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Files
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fetchUploads()}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all border border-gray-300 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid - Removed as per request */}
        
        {/* Debug Info - Removed as per request */}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search uploads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  {status === '' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

      {/* Unified Upload Form */}
      {showUnifiedUpload && (
        <UnifiedUploadForm
          chapters={chapters}
          chapterId={newUpload.chapterId}
          onChapterChange={(chapterId) => setNewUpload(prev => ({ ...prev, chapterId }))}
          onSubmit={handleUnifiedUploadSubmit}
          onCancel={() => {
            setShowUnifiedUpload(false);
            setUploadFiles([]);
            setUploadMetadata({
              template: {
                title: '{filename}',
                description: 'Uploaded file: {filename}',
                category: '',
                tags: []
              },
              individual: {}
            });
          }}
        />
      )}

      {/* Uploads Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => setSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chapter</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploader</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUploads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No uploads found</h3>
                  <p className="text-gray-500">
                    {searchTerm || statusFilter
                      ? 'Try adjusting your search or filters'
                      : 'Upload your first content to get started'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredUploads.map((upload) => (
                <React.Fragment key={upload.id}>
                  <tr
                    className={selectedUploads.includes(upload.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUploads.includes(upload.id)}
                        onChange={() => toggleSelectUpload(upload.id)}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getFileIcon(upload.file_type)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{upload.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">{upload.description?.substring(0, 50)}...</div>
                          {upload.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {upload.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <Hash className="h-2.5 w-2.5 mr-1" />
                                  {tag}
                                </span>
                              ))}
                              {upload.tags.length > 2 && (
                                <span className="text-xs text-gray-500">+{upload.tags.length - 2} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 capitalize">{upload.file_type}</div>
                      <div className="text-xs text-gray-400">
                        {upload.file_size ? `${(parseInt(upload.file_size) / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">Chapter {upload.chapter_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {upload.uploader_first_name} {upload.uploader_last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getTimeAgo(upload.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(upload.status)}`}>
                        {upload.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {upload.status === 'pending' && (
                          <button
                            onClick={() => handleApprove(upload.id, 'approve')}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        )}
                        {upload.status === 'pending' && (
                          <button
                            onClick={() => handleApprove(upload.id, 'reject')}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => togglePreview(upload.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Preview"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(upload.id)}
                          className="text-gray-600 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Preview Row */}
                  {previewId === upload.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        {loadingPreview === upload.id ? (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                            <span className="text-gray-600">Loading preview...</span>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Upload Time Display - FR5 Requirement: <5 minutes */}
                            <div className="flex items-center text-sm text-gray-600 mb-3">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>
                                Uploaded {getTimeAgo(upload.created_at)} •
                                {(() => {
                                  const uploadDate = new Date(upload.created_at);
                                  const now = new Date();
                                  const diffMinutes = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60));
                                  return diffMinutes < 5 ? (
                                    <span className="text-green-600 font-medium ml-1">✓ Under 5 minutes</span>
                                  ) : (
                                    <span className="text-yellow-600 font-medium ml-1">⚠ {diffMinutes} minutes ago</span>
                                  );
                                })()}
                              </span>
                            </div>

                            {/* File Preview */}
                            {upload.file_type === 'image' && (
                              <div className="bg-gray-100 rounded-lg overflow-hidden">
                                <div className="aspect-video flex items-center justify-center">
                                  {previewData[upload.id]?.preview_url ? (
                                    <img
                                      src={previewData[upload.id].preview_url}
                                      alt={upload.title}
                                      className="max-w-full max-h-96 object-contain"
                                    />
                                  ) : (
                                    <div className="text-center">
                                      <Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                      <p className="text-gray-600">Image Preview</p>
                                      <p className="text-gray-500 text-sm mt-1">File: {upload.file_name}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Document Preview */}
                            {upload.file_type !== 'video' && upload.file_type !== 'image' && (
                              <div className="bg-gray-50 rounded-lg p-6">
                                <div className="flex items-start">
                                  <FileText className="h-8 w-8 text-gray-400 mr-3 flex-shrink-0" />
                                  <div>
                                    <h4 className="font-medium text-gray-900">Document Preview</h4>
                                    <p className="text-gray-600 text-sm mt-1">File: {upload.file_name}</p>
                                    {previewData[upload.id]?.preview_url ? (
                                      <div className="mt-3">
                                        <iframe
                                          src={previewData[upload.id].preview_url}
                                          className="w-full h-96 border border-gray-300 rounded"
                                          title="Document Preview"
                                        />
                                      </div>
                                    ) : (
                                      <p className="text-gray-500 text-xs mt-2">
                                        This file type cannot be previewed directly. Click "Download" to view the full content.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Close Preview Button */}
                            <div className="flex justify-end">
                              <button
                                onClick={() => setPreviewId(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                              >
                                Close Preview
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination.total > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg shadow-sm">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => fetchUploads(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => fetchUploads(pagination.page + 1)}
              disabled={pagination.page * pagination.limit >= pagination.total}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => fetchUploads(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                {/* Simple page indicator */}
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                </span>
                <button
                  onClick={() => fetchUploads(pagination.page + 1)}
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentManager;