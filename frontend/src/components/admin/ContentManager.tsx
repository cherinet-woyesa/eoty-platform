import React, { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/services/api';
import type { ContentUpload } from '@/types/admin';
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
  AlertCircle,
  Eye,
  Users,
  Tag,
  FolderOpen,
  Hash,
  X,
  RefreshCw,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

const ContentManager: React.FC = () => {
  const [uploads, setUploads] = useState<ContentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [newUpload, setNewUpload] = useState({
    title: '',
    description: '',
    category: '',
    tags: [] as string[],
    chapterId: '', // Will be set dynamically
    file: null as File | null
  });
  const [bulkUploadFiles, setBulkUploadFiles] = useState<File[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showBulkUploadForm, setShowBulkUploadForm] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUploads, setSelectedUploads] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [failedUploads, setFailedUploads] = useState<{file: File, data: any, attempts: number}[]>([]);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<Record<number, any>>({});
  const [loadingPreview, setLoadingPreview] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chapters, setChapters] = useState<{id: number, name: string, location: string}[]>([]);

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

  useEffect(() => {
    fetchUploads();
  }, [statusFilter]);

  useEffect(() => {
    if (selectAll) {
      setSelectedUploads(uploads.map(upload => upload.id));
    } else {
      setSelectedUploads([]);
    }
  }, [selectAll, uploads]);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUploadQueue(statusFilter);
      // Ensure we have the uploads array
      if (response && response.data) {
        if (response.data.uploads && Array.isArray(response.data.uploads)) {
          setUploads(response.data.uploads);
        } else if (Array.isArray(response.data)) {
          setUploads(response.data);
        } else {
          setUploads([]);
        }
      } else {
        setUploads([]);
      }
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch uploads:', err);
      setError('Failed to load content uploads');
    } finally {
      setLoading(false);
    }
  };

  // Retry a failed upload
  const retryUpload = async (file: File, uploadData: any, attempts: number) => {
    try {
      await adminApi.uploadContent(uploadData);
      
      setFailedUploads(prev => prev.filter(item => item.file !== file));
      fetchUploads(); // Refresh the upload list
    } catch (err: any) {
      console.error('Retry failed:', err);
      if (attempts < 3) {
        // Retry again after a delay
        setTimeout(() => {
          retryUpload(file, uploadData, attempts + 1);
        }, 2000 * attempts); // Exponential backoff
      }
    }
  };

  // FR5: Get upload preview (REQUIREMENT: Preview functionality)
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
    } catch (error) {
      console.error('Failed to load preview:', error);
      setError('Failed to load preview');
    } finally {
      setLoadingPreview(null);
    }
  };

  // FR5: Retry failed upload from queue (REQUIREMENT: Retry functionality)
  const handleRetryUpload = async (uploadId: number) => {
    try {
      const response = await adminApi.retryUpload(uploadId);
      if (response.success) {
        fetchUploads(); // Refresh the upload list
      }
    } catch (err: any) {
      console.error('Failed to retry upload:', err);
      setError('Failed to retry upload: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle single file upload with retry mechanism
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpload.file) {
      setError('Please select a file to upload');
      return;
    }
    
    try {
      const uploadData = {
        title: newUpload.title,
        description: newUpload.description,
        category: newUpload.category,
        tags: newUpload.tags,
        chapterId: newUpload.chapterId,
        file: newUpload.file
      };

      const response = await adminApi.uploadContent(uploadData);
      
      // Check if upload was auto-approved (admin uploads)
      const isApproved = response.data?.upload?.status === 'approved';
      const successMsg = isApproved 
        ? `Successfully uploaded "${uploadData.title}"! The file has been automatically approved.`
        : `Successfully uploaded "${uploadData.title}"! The file is now pending approval.`;
      
      // Show success message
      setSuccessMessage(successMsg);
      setError(null);
      
      // Reset form
      setNewUpload({
        title: '',
        description: '',
        category: '',
        tags: [],
        chapterId: 'addis-ababa',
        file: null
      });
      setShowUploadForm(false);
      
      // Ensure we're showing the right status filter
      // If approved, show approved; otherwise show pending
      const targetFilter = isApproved ? 'approved' : 'pending';
      if (statusFilter !== targetFilter && statusFilter !== '') {
        // Changing filter will trigger useEffect to fetchUploads
        setStatusFilter(targetFilter);
      } else {
        // Refresh the upload list immediately and again after a short delay
        await fetchUploads();
        setTimeout(() => {
          fetchUploads();
        }, 1000);
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('Failed to upload content:', err);
      
      // Add to failed uploads for retry
      setFailedUploads(prev => [
        ...prev,
        { file: newUpload.file!, data: { ...newUpload }, attempts: 1 }
      ]);
      
      setError('Failed to upload content: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle bulk upload with retry mechanism
  const handleBulkUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkUploadFiles.length === 0) {
      setError('Please select files to upload');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const file of bulkUploadFiles) {
      try {
        const uploadData = {
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
          description: `Bulk uploaded file: ${file.name}`,
          category: 'bulk_upload',
          tags: ['bulk'], // Ensure it's an array
          chapterId: newUpload.chapterId,
          file: file
        };

        await adminApi.uploadContent(uploadData);
        
        successCount++;
      } catch (err: any) {
        console.error(`Failed to upload ${file.name}:`, err);
        errorCount++;
        
        // Add to failed uploads for retry
        setFailedUploads(prev => [
          ...prev,
          { file, data: { 
              title: file.name.replace(/\.[^/.]+$/, ""),
              description: `Bulk uploaded file: ${file.name}`,
              category: 'bulk_upload',
              tags: ['bulk'], // Ensure it's an array
              chapterId: newUpload.chapterId,
              file: file
            }, attempts: 1 }
        ]);
      }
    }

    // Show success/error message for bulk upload
    if (successCount > 0) {
      setSuccessMessage(`Successfully uploaded ${successCount} file(s)! ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
    
    if (errorCount > 0 && successCount === 0) {
      setError(`Failed to upload ${errorCount} file(s). Please try again.`);
    }

    setBulkUploadFiles([]);
    setShowBulkUploadForm(false);
    
    // Refresh the upload list after bulk upload
    setTimeout(() => {
      fetchUploads();
    }, 1000);
  };

  const handleApprove = async (uploadId: number, action: 'approve' | 'reject', rejectionReason?: string) => {
    try {
      console.log('Handling approve/reject:', { uploadId, action, rejectionReason });
      const response = await adminApi.approveContent(uploadId, action, rejectionReason);
      console.log('Approve response:', response);
      if (response.success) {
        fetchUploads(); // Refresh the upload list
      } else {
        setError(response.message || 'Failed to process content');
      }
    } catch (err: any) {
      console.error('Failed to process content:', err);
      setError('Failed to process content: ' + (err.response?.data?.message || err.message || 'Unknown error'));
    }
  };

  const handleBulkApprove = async (action: 'approve' | 'reject') => {
    if (selectedUploads.length === 0) return;
    
    try {
      for (const uploadId of selectedUploads) {
        await adminApi.approveContent(uploadId, action);
      }
      setSelectedUploads([]);
      setSelectAll(false);
      fetchUploads(); // Refresh the upload list
    } catch (err: any) {
      console.error('Failed to process content:', err);
      setError('Failed to process content: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewUpload(prev => ({
        ...prev,
        file: e.target.files![0]
      }));
    }
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setBulkUploadFiles(files);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !newUpload.tags.includes(newTag.trim())) {
      setNewUpload(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewUpload(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUpload(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleSelectUpload = (uploadId: number) => {
    if (selectedUploads.includes(uploadId)) {
      setSelectedUploads(selectedUploads.filter(id => id !== uploadId));
    } else {
      setSelectedUploads([...selectedUploads, uploadId]);
    }
  };

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
        return 'bg-blue-100 text-blue-800';
    }
  };

  const filteredUploads = uploads.filter(upload => {
    if (!searchTerm) return true;
    return (
      upload.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.chapter_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.file_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getTimeAgo = (date: string | Date) => {
    const now = new Date();
    const contentDate = typeof date === 'string' ? new Date(date) : date;
    const diffInHours = Math.floor((now.getTime() - contentDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return contentDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-[#27AE60] mx-auto mb-4" />
          <p className="text-stone-600 text-lg">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-[#27AE60]/20 rounded-lg blur-md"></div>
                <div className="relative p-2 bg-gradient-to-br from-[#27AE60]/15 to-[#16A085]/15 rounded-lg border border-[#27AE60]/25">
                  <Upload className="h-6 w-6 text-[#27AE60]" />
              </div>
              <h1 className="text-3xl font-bold text-stone-800">Content Management</h1>
            </div>
            <p className="text-stone-700 text-sm mt-2">
              Upload, review, and manage educational content
            </p>
            <p className="text-stone-600 text-xs mt-1">
              {uploads.length} total uploads • {uploads.filter(u => u.status === 'pending').length} pending review
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                fetchUploads();
              }}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all border border-gray-300 shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 mr-2 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowBulkUploadForm(!showBulkUploadForm);
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowUploadForm(!showUploadForm);
              }}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload
            </button>
          </div>
          </div>
        </div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { 
            name: 'Pending', 
            value: uploads.filter(u => u.status === 'pending').length.toString(), 
            icon: Clock, 
            color: 'bg-blue-100',
            iconColor: 'text-blue-600',
            textColor: 'text-blue-700'
          },
          { 
            name: 'Approved', 
            value: uploads.filter(u => u.status === 'approved').length.toString(), 
            icon: CheckCircle, 
            color: 'bg-green-100',
            iconColor: 'text-green-600',
            textColor: 'text-green-700'
          },
          { 
            name: 'Rejected', 
            value: uploads.filter(u => u.status === 'rejected').length.toString(), 
            icon: XCircle, 
            color: 'bg-red-100',
            iconColor: 'text-red-600',
            textColor: 'text-red-700'
          },
          { 
            name: 'Processing', 
            value: uploads.filter(u => u.status === 'processing').length.toString(), 
            icon: AlertCircle, 
            color: 'bg-amber-100',
            iconColor: 'text-amber-600',
            textColor: 'text-amber-700'
          }
        ].map((stat, index) => (
          <div key={index} className={`${stat.color} rounded-lg p-4 border border-gray-200`}>
            <div className="flex items-center">
              <div className={`p-2 ${stat.color} rounded-lg`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">{stat.name}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-green-800 text-sm">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800 text-lg">
            ×
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center">
            <XCircle className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 text-lg">
            ×
          </button>
        </div>
      )}

      {/* Search and Filter Section - Compact */}
      <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Status Filter */}
            <div className="sm:w-32">
              <select
                value={statusFilter}
                onChange={(e) => {
                  const newFilter = e.target.value;
                  setStatusFilter(newFilter);
                  // fetchUploads will be called by useEffect when statusFilter changes
                }}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="processing">Processing</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Failed Uploads Section - Compact */}
      {failedUploads.length > 0 && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-yellow-800 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1.5" />
              Failed Uploads
            </h3>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {failedUploads.length}
            </span>
          </div>
          <div className="space-y-2">
            {failedUploads.map((failed, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded-md border border-yellow-200">
                <div className="flex items-center min-w-0 flex-1">
                  <FileText className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{failed.file.name}</div>
                    <div className="text-xs text-gray-500">
                      Attempt {failed.attempts} of 3
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1.5 ml-2">
                  <button
                    onClick={() => retryUpload(failed.file, failed.data, failed.attempts)}
                    className="flex items-center px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs transition-colors"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </button>
                  <button
                    onClick={() => setFailedUploads(prev => prev.filter((_, i) => i !== index))}
                    className="flex items-center px-2 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-xs transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Actions Bar - Compact */}
      {selectedUploads.length > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center">
            <span className="text-blue-800 font-medium text-sm">
              {selectedUploads.length} selected
            </span>
          </div>
          <div className="flex space-x-1.5">
            <button
              onClick={() => handleBulkApprove('approve')}
              className="flex items-center px-2.5 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs transition-colors"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </button>
            <button
              onClick={() => handleBulkApprove('reject')}
              className="flex items-center px-2.5 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs transition-colors"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </button>
            <button
              onClick={() => {
                setSelectedUploads([]);
                setSelectAll(false);
              }}
              className="flex items-center px-2.5 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-xs transition-colors"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Upload Form - Compact */}
      {showUploadForm && (
        <form onSubmit={handleUploadSubmit} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Plus className="h-4 w-4 mr-1.5 text-blue-600" />
            Upload New Content
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={newUpload.title}
                onChange={handleInputChange}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
                placeholder="Enter content title"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                <Users className="h-3 w-3 mr-1" />
                Chapter
              </label>
              <select
                name="chapterId"
                value={newUpload.chapterId}
                onChange={handleInputChange}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              >
                {chapters.length === 0 ? (
                  <option value="">Loading chapters...</option>
                ) : (
                  chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.location}</option>
                  ))
                )}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={newUpload.description}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Enter content description"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                <FolderOpen className="h-3 w-3 mr-1" />
                Category
              </label>
              <input
                type="text"
                name="category"
                value={newUpload.category}
                onChange={handleInputChange}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="e.g., Mathematics, Science"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                <FileText className="h-3 w-3 mr-1" />
                File
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                <Tag className="h-3 w-3 mr-1" />
                Tags
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-r-md hover:bg-gray-300 text-sm"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {newUpload.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    <Hash className="h-2.5 w-2.5 mr-1" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1.5 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex space-x-2">
            <button
              type="submit"
              className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs font-medium"
            >
              Upload Content
            </button>
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showBulkUploadForm && (
        <form onSubmit={handleBulkUploadSubmit} className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 sm:p-4 rounded-lg border border-purple-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Upload className="h-4 w-4 mr-1.5 text-purple-600" />
            Bulk Upload Content
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Chapter
              </label>
              <select
                name="chapterId"
                value={newUpload.chapterId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {chapters.length === 0 ? (
                  <option value="">Loading chapters...</option>
                ) : (
                  chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.location}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                Files
              </label>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">
                  {bulkUploadFiles.length > 0 
                    ? `${bulkUploadFiles.length} file(s) selected` 
                    : 'Click to select files or drag and drop'}
                </p>
                <p className="text-sm text-gray-500 mt-1">Supports multiple files</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleBulkFileChange}
                  className="hidden"
                  multiple
                />
              </div>
              {bulkUploadFiles.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto">
                  <ul className="space-y-1">
                    {bulkUploadFiles.map((file, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="truncate">{file.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              disabled={bulkUploadFiles.length === 0}
            >
              Upload {bulkUploadFiles.length} File{bulkUploadFiles.length !== 1 ? 's' : ''}
            </button>
            <button
              type="button"
              onClick={() => setShowBulkUploadForm(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
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
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  +{upload.tags.length - 2}
                                </span>
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
                      <div className="text-sm text-gray-500 capitalize">{upload.chapter_id.replace('-', ' ')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {upload.uploader_first_name} {upload.uploader_last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(upload.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(upload.status)}`}>
                        {upload.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {upload.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleApprove(upload.id, 'approve');
                              }}
                              className="text-green-600 hover:text-green-900 cursor-pointer"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const reason = prompt('Enter rejection reason:');
                                if (reason !== null && reason.trim()) {
                                  handleApprove(upload.id, 'reject', reason);
                                }
                              }}
                              className="text-red-600 hover:text-red-900 cursor-pointer"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {upload.status === 'approved' && (
                          <span className="text-green-600 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approved
                          </span>
                        )}
                        {upload.status === 'rejected' && (
                          <span className="text-red-600 flex items-center">
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejected
                          </span>
                        )}
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePreview(upload.id);
                          }}
                          className="text-blue-600 hover:text-blue-900 cursor-pointer" 
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {upload.status === 'failed' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRetryUpload(upload.id);
                            }}
                            className="text-green-600 hover:text-green-900 cursor-pointer"
                            title="Retry"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
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

                            {/* Preview Content */}
                            {upload.file_type === 'video' && (
                              <div className="bg-gray-900 rounded-lg overflow-hidden">
                                <div className="relative aspect-video flex items-center justify-center">
                                  {previewData[upload.id]?.thumbnail_url ? (
                                    <img 
                                      src={previewData[upload.id].thumbnail_url} 
                                      alt={upload.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                                      <div className="text-center">
                                        <Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-400">Video Preview</p>
                                        <p className="text-gray-500 text-sm mt-1">File: {upload.file_name}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
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
    </div>
    </div>
  );
};

export default ContentManager;
