import React, { useState } from 'react';
import { Upload, Filter, RefreshCw } from 'lucide-react';
import UploadQueue from '@/components/admin/UploadQueue';
import { useUploadQueue } from '@/hooks/useAdmin';

const UploadManager: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [chapterFilter, setChapterFilter] = useState<string>('');
  
  const { uploads, loading, error, approveUpload, refetch } = useUploadQueue(statusFilter, chapterFilter);

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'processing', label: 'Processing' }
  ];

  const handleApprove = async (uploadId: number, action: 'approve' | 'reject', reason?: string) => {
    try {
      const success = await approveUpload(uploadId, action, reason);
      if (success) {
        // Success notification could be added here
        console.log(`Upload ${uploadId} ${action}ed successfully`);
      }
      return success;
    } catch (error) {
      console.error('Failed to process upload:', error);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Manager</h1>
            <p className="text-gray-600">Review and manage content uploads from users</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="Filter by chapter..."
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {uploads.filter(u => u.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending Review</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">
              {uploads.filter(u => u.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-red-600">
              {uploads.filter(u => u.status === 'rejected').length}
            </div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {uploads.filter(u => u.status === 'processing').length}
            </div>
            <div className="text-sm text-gray-600">Processing</div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">Error</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Upload Queue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Upload className="h-5 w-5 text-gray-400 mr-2" />
              Content Upload Queue
            </h2>
          </div>
          
          <div className="p-6">
            <UploadQueue
              uploads={uploads}
              onApprove={handleApprove}
              loading={loading}
            />
          </div>
        </div>

        {/* Empty State */}
        {!loading && uploads.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 mt-6">
            <Upload className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No uploads found</h3>
            <p className="text-gray-600">
              {statusFilter ? `No uploads with status "${statusFilter}"` : 'No uploads in the system'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadManager;