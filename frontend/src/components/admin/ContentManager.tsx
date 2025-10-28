import React, { useState, useEffect, useRef } from 'react';
import { adminApi } from '../../services/api';
import type { ContentUpload } from '../../types/admin';
import { 
  Upload, 
  Plus, 
  Filter, 
  Search,
  FileText,
  Video,
  Image,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Trash2,
  Edit,
  Eye,
  Users,
  Tag,
  FolderOpen,
  Hash,
  X,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const ContentManager: React.FC = () => {
  const [uploads, setUploads] = useState<ContentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [newUpload, setNewUpload] = useState({
    title: '',
    description: '',
    category: '',
    tags: [] as string[],
    chapterId: 'addis-ababa',
    file: null as File | null
  });
  const [bulkUploadFiles, setBulkUploadFiles] = useState<File[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showBulkUploadForm, setShowBulkUploadForm] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUploads, setSelectedUploads] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, { progress: number; status: 'uploading' | 'success' | 'error' | 'retrying' }>>({});
  const [failedUploads, setFailedUploads] = useState<{file: File, data: any, attempts: number}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setUploads(response.data.uploads);
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
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: { progress: 0, status: 'retrying' }
      }));

      await adminApi.uploadContent(uploadData);
      
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });
      
      setFailedUploads(prev => prev.filter(item => item.file !== file));
      fetchUploads(); // Refresh the upload list
    } catch (err: any) {
      console.error('Retry failed:', err);
      if (attempts < 3) {
        // Retry again after a delay
        setTimeout(() => {
          retryUpload(file, uploadData, attempts + 1);
        }, 2000 * attempts); // Exponential backoff
      } else {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { progress: 0, status: 'error' }
        }));
      }
    }
  };

  // Handle single file upload with retry mechanism
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpload.file) {
      setError('Please select a file to upload');
      return;
    }

    const fileName = newUpload.file.name;
    
    try {
      setUploadProgress(prev => ({
        ...prev,
        [fileName]: { progress: 0, status: 'uploading' }
      }));

      const uploadData = {
        title: newUpload.title,
        description: newUpload.description,
        category: newUpload.category,
        tags: newUpload.tags,
        chapterId: newUpload.chapterId,
        file: newUpload.file
      };

      await adminApi.uploadContent(uploadData);
      
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileName];
        return newProgress;
      });
      
      setNewUpload({
        title: '',
        description: '',
        category: '',
        tags: [],
        chapterId: 'addis-ababa',
        file: null
      });
      setShowUploadForm(false);
      fetchUploads(); // Refresh the upload list
    } catch (err: any) {
      console.error('Failed to upload content:', err);
      
      // Add to failed uploads for retry
      setFailedUploads(prev => [
        ...prev,
        { file: newUpload.file!, data: { ...newUpload }, attempts: 1 }
      ]);
      
      setUploadProgress(prev => ({
        ...prev,
        [fileName]: { progress: 0, status: 'error' }
      }));
      
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
      const fileName = file.name;
      
      try {
        setUploadProgress(prev => ({
          ...prev,
          [fileName]: { progress: 0, status: 'uploading' }
        }));

        const uploadData = {
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
          description: `Bulk uploaded file: ${file.name}`,
          category: 'bulk_upload',
          tags: ['bulk'],
          chapterId: newUpload.chapterId,
          file: file
        };

        await adminApi.uploadContent(uploadData);
        
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileName];
          return newProgress;
        });
        
        successCount++;
      } catch (err: any) {
        console.error(`Failed to upload ${fileName}:`, err);
        errorCount++;
        
        // Add to failed uploads for retry
        setFailedUploads(prev => [
          ...prev,
          { file, data: { 
              title: file.name.replace(/\.[^/.]+$/, ""),
              description: `Bulk uploaded file: ${file.name}`,
              category: 'bulk_upload',
              tags: ['bulk'],
              chapterId: newUpload.chapterId,
              file: file
            }, attempts: 1 }
        ]);
        
        setUploadProgress(prev => ({
          ...prev,
          [fileName]: { progress: 0, status: 'error' }
        }));
      }
    }

    setBulkUploadFiles([]);
    setShowBulkUploadForm(false);
    
    if (errorCount > 0) {
      setError(`Uploaded ${successCount} of ${bulkUploadFiles.length} files. ${errorCount} failed.`);
    }
    
    fetchUploads(); // Refresh the upload list
  };

  const handleApprove = async (uploadId: number, action: 'approve' | 'reject', rejectionReason?: string) => {
    try {
      await adminApi.approveContent(uploadId, action, rejectionReason);
      fetchUploads(); // Refresh the upload list
    } catch (err: any) {
      console.error('Failed to process content:', err);
      setError('Failed to process content: ' + (err.response?.data?.message || err.message));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-blue-600" />
            Content Management
          </h2>
          <p className="text-gray-600 mt-1">Upload, review, and manage educational content</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowBulkUploadForm(!showBulkUploadForm)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </button>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Content
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Failed Uploads Section */}
      {failedUploads.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-yellow-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Failed Uploads
            </h3>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {failedUploads.length} failed
            </span>
          </div>
          <div className="space-y-2">
            {failedUploads.map((failed, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-yellow-200">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-yellow-500 mr-2" />
                  <div>
                    <div className="font-medium text-gray-900">{failed.file.name}</div>
                    <div className="text-sm text-gray-500">
                      Attempt {failed.attempts} of 3
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => retryUpload(failed.file, failed.data, failed.attempts)}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </button>
                  <button
                    onClick={() => setFailedUploads(prev => prev.filter((_, i) => i !== index))}
                    className="flex items-center px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm transition-colors"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedUploads.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center">
            <span className="text-blue-800 font-medium">
              {selectedUploads.length} item{selectedUploads.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleBulkApprove('approve')}
              className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm transition-colors"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve All
            </button>
            <button
              onClick={() => handleBulkApprove('reject')}
              className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm transition-colors"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject All
            </button>
            <button
              onClick={() => {
                setSelectedUploads([]);
                setSelectAll(false);
              }}
              className="flex items-center px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm transition-colors"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search uploads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

      {/* Upload Forms */}
      {showUploadForm && (
        <form onSubmit={handleUploadSubmit} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Plus className="h-5 w-5 mr-2 text-blue-600" />
            Upload New Content
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={newUpload.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Enter content title"
              />
            </div>
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
              >
                <option value="addis-ababa">Addis Ababa</option>
                <option value="toronto">Toronto</option>
                <option value="washington">Washington DC</option>
                <option value="london">London</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={newUpload.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter content description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <FolderOpen className="h-4 w-4 mr-1" />
                Category
              </label>
              <input
                type="text"
                name="category"
                value={newUpload.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Mathematics, Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                File
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Tag className="h-4 w-4 mr-1" />
                Tags
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-r-md hover:bg-gray-300"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {newUpload.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Upload Content
            </button>
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showBulkUploadForm && (
        <form onSubmit={handleBulkUploadSubmit} className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-6 border border-purple-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2 text-purple-600" />
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
              >
                <option value="addis-ababa">Addis Ababa</option>
                <option value="toronto">Toronto</option>
                <option value="washington">Washington DC</option>
                <option value="london">London</option>
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
                <tr 
                  key={upload.id} 
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
                            onClick={() => handleApprove(upload.id, 'approve')}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason !== null) {
                                handleApprove(upload.id, 'reject', reason);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
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
                      <button className="text-blue-600 hover:text-blue-900" title="Preview">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stats Summary */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {uploads.filter(u => u.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {uploads.filter(u => u.status === 'approved').length}
                </div>
                <div className="text-sm text-gray-600">Approved</div>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {uploads.filter(u => u.status === 'rejected').length}
                </div>
                <div className="text-sm text-gray-600">Rejected</div>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {uploads.filter(u => u.status === 'processing').length}
                </div>
                <div className="text-sm text-gray-600">Processing</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentManager;