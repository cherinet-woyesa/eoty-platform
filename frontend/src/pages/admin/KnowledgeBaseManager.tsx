import React, { useState, useEffect, useMemo } from 'react';
import { 
  Book, 
  Upload, 
  Trash2, 
  FileText, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Plus,
  RefreshCw,
  X
} from 'lucide-react';
import { adminApi } from '@/services/api/admin';
import { brandColors } from '@/theme/brand';

interface KnowledgeDocument {
  id: number;
  title: string;
  description: string;
  category: string;
  file_url: string;
  file_type: string;
  status: 'pending' | 'processing' | 'active' | 'error';
  created_at: string;
}

const KnowledgeBaseManager: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('general');

  useEffect(() => {
    fetchDocuments();
  }, [filterCategory, statusFilter]);

  const fetchDocuments = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await adminApi.getKnowledgeDocuments({ category: filterCategory || undefined, status: statusFilter === 'all' ? undefined : statusFilter });
      if (res.success) {
        setDocuments(res.data);
        setLastUpdated(new Date().toISOString());
      } else {
        throw new Error(res.message || 'Failed to load documents');
      }
    } catch (err) {
      console.error('Failed to fetch documents', err);
      setError((err as any)?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadTitle);
    formData.append('description', uploadDescription);
    formData.append('category', uploadCategory);

    try {
      const res = await adminApi.uploadKnowledgeDocument(formData);
      if (res.success) {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadDescription('');
        fetchDocuments({ silent: true });
      }
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await adminApi.deleteKnowledgeDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const filteredDocuments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const byStatus = statusFilter === 'all' ? documents : documents.filter(d => d.status === statusFilter);
    if (!term) return byStatus;
    return byStatus.filter(d => d.title.toLowerCase().includes(term) || d.description?.toLowerCase().includes(term));
  }, [documents, searchTerm, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: documents.length,
      active: documents.filter(d => d.status === 'active').length,
      processing: documents.filter(d => d.status === 'processing').length,
      error: documents.filter(d => d.status === 'error').length,
    };
  }, [documents]);

  const categories = [
    { id: 'scripture', label: 'Scripture (81 Books)' },
    { id: 'liturgy', label: 'Liturgy & Prayer' },
    { id: 'theology', label: 'Theology & Dogma' },
    { id: 'history', label: 'Church History' },
    { id: 'legal', label: 'Canon Law (Fetha Negest)' },
    { id: 'general', label: 'General Reference' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Book className="h-8 w-8" style={{ color: brandColors.primaryHex }} />
            Theological Knowledge Base
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage the authoritative texts used by the AI for faith-based responses.
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchDocuments({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
            style={{ borderColor: `${brandColors.primaryHex}40`, color: brandColors.primaryHex }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            style={{ backgroundColor: brandColors.primaryHex }}
          >
            <Plus className="h-5 w-5" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: counts.total, color: brandColors.primaryHex },
          { label: 'Active', value: counts.active, color: '#16a34a' },
          { label: 'Processing', value: counts.processing, color: '#f59e0b' },
          { label: 'Errors', value: counts.error, color: '#dc2626' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-2 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search title or description"
                className="pl-8 pr-3 py-2 text-sm border rounded-md focus:ring-2"
                style={{ borderColor: '#e5e7eb', outline: 'none' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'processing', label: 'Processing' },
              { id: 'error', label: 'Errors' },
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  statusFilter === pill.id
                    ? 'text-white'
                    : 'text-gray-600 bg-white'
                }`}
                style={statusFilter === pill.id ? { backgroundColor: brandColors.primaryHex, borderColor: brandColors.primaryHex } : { borderColor: '#e5e7eb' }}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchDocuments({ silent: true })}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-red-300 hover:bg-red-100"
            >
              Retry
            </button>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Document List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-gray-200 rounded" />
                  <div className="h-3 w-2/3 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Book className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No documents found</h3>
          <p className="text-gray-500">Upload authoritative texts to start building the knowledge base.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDocuments.map(doc => (
            <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${brandColors.primaryHex}0f` }}>
                  <FileText className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1">{doc.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {categories.find(c => c.id === doc.category)?.label || doc.category}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      doc.status === 'active' ? 'bg-green-100 text-green-800' :
                      doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      doc.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {doc.status === 'active' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {doc.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      {doc.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-indigo-600 hover:underline"
                >
                  View
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Document"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Document</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., The Book of Enoch"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="Brief description of the content..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF/Text)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    required
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFile(file);
                        if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="pointer-events-none">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {uploadFile ? uploadFile.name : 'Click to select or drag file here'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseManager;
