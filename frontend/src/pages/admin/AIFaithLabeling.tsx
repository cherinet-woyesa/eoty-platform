import React, { useEffect, useState } from 'react';
import { adminApi } from '@/services/api/admin';
import LabelingItemCard from './components/LabelingItemCard';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AIFaithLabeling() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'pending' | 'assistant'>('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    fetchItems(1);
  }, [source]);

  useEffect(() => {
    fetchItems(page);
  }, [page]);

  async function fetchItems(pageNum = 1) {
    setLoading(true);
    try {
      let res;
      if (source === 'pending') {
        res = await adminApi.getPendingAIModeration(pageNum, 20);
      } else {
        res = await adminApi.getAILabelingCandidates(pageNum, 20, 14);
      }
      
      // Handle response structure: { success: true, data: { items: [], pagination: {} } }
      const data = res.data || {};
      setItems(data.items || []);
      
      if (data.pagination) {
         const total = data.pagination.total || 0;
         const limit = data.pagination.limit || 20;
         setTotalPages(Math.ceil(total / limit) || 1);
      } else if (data.totalPages) {
         setTotalPages(data.totalPages);
      } else {
         // Fallback if API doesn't return pagination info
         setTotalPages(data.items?.length === 20 ? pageNum + 1 : pageNum);
      }
    } catch (err) {
      console.error('Failed to fetch items', err);
      showToast('error', 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
  }

  function handleUpdateItem(id: number, updates: any) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }

  function handleRemoveItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    // If list becomes empty, try to fetch next page or refresh
    if (items.length <= 1 && page < totalPages) {
       fetchItems(page);
    } else if (items.length <= 1 && page > 1) {
       setPage(p => p - 1);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow-lg flex items-center space-x-2 animate-fade-in-down ${
          toast.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Faith Alignment Labeling</h2>
          <p className="text-sm text-gray-500 mt-1">Review and label content to train the AI alignment model.</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <div className="flex items-center bg-white border rounded-md px-3 py-2 shadow-sm">
            <span className="text-sm text-gray-500 mr-2">Source:</span>
            <select 
              value={source} 
              onChange={e => {
                setSource(e.target.value as any);
                setPage(1);
              }} 
              className="text-sm font-medium bg-transparent border-none focus:ring-0 cursor-pointer outline-none"
            >
              <option value="pending">Pending Moderation</option>
              <option value="assistant">Recent AI Responses</option>
            </select>
          </div>

          <button
            className="p-2 bg-white border rounded-md text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
            onClick={() => fetchItems(page)}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500">Loading items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
          <p className="text-gray-500 mt-2">No items found requiring labeling in this category.</p>
          <button 
            onClick={() => fetchItems(page)}
            className="mt-6 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Check Again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {items.map(item => (
              <LabelingItemCard
                key={item.id}
                item={item}
                onUpdateItem={handleUpdateItem}
                onRemoveItem={handleRemoveItem}
                onError={(msg) => showToast('error', msg)}
                onSuccess={(msg) => showToast('success', msg)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t pt-6">
            <div className="text-sm text-gray-500">
              Page {page} {totalPages > 1 ? `of ${totalPages}` : ''}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
