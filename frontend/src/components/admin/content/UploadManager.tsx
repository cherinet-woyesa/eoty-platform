import React, { useState, useEffect } from 'react';
import { Upload, Filter, RefreshCw, Plus } from 'lucide-react';
import UploadQueue from './UploadQueue';
import UnifiedUploadForm from './UnifiedUploadForm';
import { useUploadQueue } from '@/hooks/useAdmin';
import { chaptersApi } from '@/services/api/chapters';
import { adminApi } from '@/services/api';

const UploadManager: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [chapterFilter, setChapterFilter] = useState<string>('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  
  const { uploads, loading, error, approveUpload, refetch } = useUploadQueue(statusFilter, chapterFilter);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const response = await chaptersApi.getChapters();
        if (response.success) {
          setChapters(response.data.chapters);
          if (response.data.chapters.length > 0) {
            setSelectedChapter(response.data.chapters[0].id.toString());
          }
        }
      } catch (err) {
        console.error('Failed to fetch chapters:', err);
      }
    };
    fetchChapters();
  }, []);

  const handleUploadSubmit = async (files: File[], metadata: any) => {
    try {
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileMetadata = metadata.individual[file.name] || metadata.template;
        
        // Replace template variables if needed
        let title = fileMetadata.title;
        let description = fileMetadata.description;
        
        if (title.includes('{filename}')) title = title.replace('{filename}', file.name.split('.')[0]);
        if (description.includes('{filename}')) description = description.replace('{filename}', file.name.split('.')[0]);
        
        await adminApi.uploadContent({
          file,
          title,
          description,
          category: fileMetadata.category,
          tags: fileMetadata.tags,
          chapterId: selectedChapter
        });
      }
      
      setShowUploadForm(false);
      refetch();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload content. Please try again.');
    }
  };

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
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#27AE60]/25 rounded-lg blur-md"></div>
                  <div className="relative p-2 bg-gradient-to-br from-[#27AE60]/20 to-[#16A085]/20 rounded-lg border border-[#27AE60]/25">
                    <Upload className="h-6 w-6 text-[#27AE60]" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-stone-800">Upload Manager</h1>
              </div>
              <p className="text-stone-700 text-sm mt-2">Review and manage content uploads from users</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowUploadForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#219150] transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span>Upload Content</span>
              </button>
              <button
                onClick={refetch}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white text-stone-800 rounded-lg border border-[#27AE60]/25 transition-all shadow-sm hover:shadow-md hover:border-[#27AE60]/50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 text-[#27AE60] ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-stone-500" />
              <span className="text-sm font-semibold text-stone-700">Filters:</span>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 bg-white/90 backdrop-blur-sm"
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
              className="border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 bg-white/90 backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Upload Form Modal */}
        {showUploadForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <UnifiedUploadForm
                chapters={chapters}
                chapterId={selectedChapter}
                onChapterChange={setSelectedChapter}
                onSubmit={handleUploadSubmit}
                onCancel={() => setShowUploadForm(false)}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Pending Review', value: uploads.filter(u => u.status === 'pending').length, color: 'text-[#2980B9]', bg: 'bg-[#2980B9]/10', border: 'border-[#2980B9]/25' },
            { label: 'Approved', value: uploads.filter(u => u.status === 'approved').length, color: 'text-[#27AE60]', bg: 'bg-[#27AE60]/10', border: 'border-[#27AE60]/25' },
            { label: 'Rejected', value: uploads.filter(u => u.status === 'rejected').length, color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/25' },
            { label: 'Processing', value: uploads.filter(u => u.status === 'processing').length, color: 'text-[#F39C12]', bg: 'bg-[#F39C12]/10', border: 'border-[#F39C12]/25' },
          ].map((stat, index) => (
            <div key={index} className={`bg-white/90 backdrop-blur-md rounded-xl p-4 border ${stat.border} text-center shadow-sm`}>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-sm text-stone-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold mb-2">Error</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Upload Queue */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 shadow-sm">
          <div className="p-6 border-b border-stone-200">
            <h2 className="text-lg font-semibold text-stone-800 flex items-center">
              <Upload className="h-5 w-5 text-[#27AE60] mr-2" />
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
          <div className="text-center py-12 bg-white/90 backdrop-blur-md rounded-xl border border-stone-200">
            <Upload className="h-12 w-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-stone-800 mb-2">No uploads found</h3>
            <p className="text-stone-600">
              {statusFilter ? `No uploads with status "${statusFilter}"` : 'No uploads in the system'}
            </p>
          </div>
        )}
      </div>
    
    
  );
};

export default UploadManager;