import React, { useEffect, useState } from 'react';
import { adminApi } from '@/services/api/admin';
import LabelingItemCard from './components/LabelingItemCard';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Brain, MessageSquare, Filter } from 'lucide-react';

export default function AIFaithLabeling() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'pending' | 'assistant'>('pending');
  const [language, setLanguage] = useState<string>('');
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
  }, [source, language]);

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
        res = await adminApi.getAILabelingCandidates(pageNum, 20, 14, language);
      }
      
      const data = res.data || {};
      setItems(data.items || []);
      
      if (data.pagination) {
         const total = data.pagination.total || 0;
         const limit = data.pagination.limit || 20;
         setTotalPages(Math.ceil(total / limit) || 1);
      } else if (data.totalPages) {
         setTotalPages(data.totalPages);
      } else {
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
    if (items.length <= 1 && page < totalPages) {
       fetchItems(page);
    } else if (items.length <= 1 && page > 1) {
       setPage(p => p - 1);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        )}

        {/* Header Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <Brain className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AI Faith Alignment</h2>
                <p className="text-sm text-gray-500 mt-1">Review and label content to improve the AI's understanding of Orthodox theology.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchItems(page)}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Filters / Tabs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 pt-6">
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => { setSource('pending'); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  source === 'pending'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Filter size={16} />
                Pending Moderation
              </button>
              <button
                onClick={() => { setSource('assistant'); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  source === 'assistant'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <MessageSquare size={16} />
                Recent AI Responses
              </button>
            </div>

            {source === 'assistant' && (
              <select
                value={language}
                onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Languages</option>
                <option value="en">English</option>
                <option value="am">Amharic</option>
                <option value="ti">Tigrinya</option>
                <option value="om">Oromo</option>
                <option value="so">Somali</option>
              </select>
            )}
          </div>
        </div>

        {/* Content Area */}
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
            <Loader2 size={40} className="text-indigo-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center shadow-sm">
            <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              There are no items requiring labeling in this category at the moment. Great job!
            </p>
            <button 
              onClick={() => fetchItems(page)}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm hover:shadow"
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
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div className="text-sm text-gray-500 font-medium">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages || loading}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
