import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/services/api/admin';
import LabelingItemCard from './components/LabelingItemCard';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Brain, MessageSquare, Filter } from 'lucide-react';
import { brandColors } from '@/theme/brand';

export default function AIFaithLabeling() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'pending' | 'assistant'>('pending');
  const [language, setLanguage] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [days, setDays] = useState(14);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const LANGUAGE_OPTIONS = useMemo(() => ([
    { value: '', label: t('ai_labeling.language_all') },
    { value: 'en-US', label: 'English (US)' },
    { value: 'am-ET', label: 'Amharic' },
    { value: 'ti-ET', label: 'Tigrinya' },
    { value: 'om-ET', label: 'Oromo' },
    { value: 'so-SO', label: 'Somali' }
  ]), [t]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    // Single effect to avoid duplicate fetches on mount
    fetchItems(page);
  }, [source, language, page, pageSize, days]);

  async function fetchItems(pageNum = 1) {
    setLoading(true);
    setFetchError(null);
    try {
      let res;
      if (source === 'pending') {
        res = await adminApi.getPendingAIModeration(pageNum, pageSize);
      } else {
        res = await adminApi.getAILabelingCandidates(pageNum, pageSize, days, language);
      }

      const payload = res?.data ?? res ?? {};
      if (payload.success === false) {
        throw new Error(payload.message || 'Request failed');
      }
      const data = payload.data ?? payload;
      const incomingItems = data.items ?? [];
      setItems(incomingItems);

      const pagination = data.pagination ?? null;
      if (pagination) {
        const total = pagination.total ?? incomingItems.length ?? 0;
        const limit = pagination.limit ?? pageSize;
        setTotalPages(Math.max(1, Math.ceil(total / limit)));
      } else if (data.totalPages) {
        setTotalPages(data.totalPages);
      } else {
        setTotalPages(incomingItems.length === pageSize ? pageNum + 1 : pageNum);
      }
    } catch (err: any) {
      // console.error('Failed to fetch items', err);
      const message = err?.message || 'Failed to load items';
      setFetchError(message);
      showToast('error', message);
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
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      if (next.length === 0) {
        if (page < totalPages) {
          fetchItems(page);
        } else if (page > 1) {
          setPage(p => Math.max(1, p - 1));
        }
      }
      return next;
    });
  }

  async function handleModerationAction(itemId: number, action: 'approve' | 'reject' | 'escalate', notes?: string) {
    try {
      const res = await adminApi.reviewAIModeration(itemId, { action, notes });
      if (res?.success === false) {
        throw new Error(res.message || 'Failed to update item');
      }
      showToast('success', t('ai_labeling.toast_item_action', { action }));
      handleRemoveItem(itemId);
    } catch (err: any) {
      // console.error('Moderation action failed', err);
      showToast('error', err?.message || 'Failed to update item');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-in slide-in-from-top-2 duration-200 ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
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
                <h2 className="text-2xl font-bold text-gray-900">{t('ai_labeling.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('ai_labeling.subtitle')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchItems(page)}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('ai_labeling.refresh')}
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
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${source === 'pending'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Filter size={16} />
                {t('ai_labeling.tab_pending')}
              </button>
              <button
                onClick={() => { setSource('assistant'); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${source === 'assistant'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <MessageSquare size={16} />
                {t('ai_labeling.tab_recent')}
              </button>
            </div>

            {source === 'assistant' && (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={language}
                  onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {LANGUAGE_OPTIONS.map(opt => (
                    <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={days}
                  onChange={(e) => { setDays(parseInt(e.target.value, 10)); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  title="Look-back window"
                >
                  <option value={7}>{t('ai_labeling.days_7')}</option>
                  <option value={14}>{t('ai_labeling.days_14')}</option>
                  <option value={30}>{t('ai_labeling.days_30')}</option>
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('ai_labeling.page_size')}</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error state */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">{fetchError || t('ai_labeling.error_load')}</span>
            </div>
            <button
              onClick={() => fetchItems(page)}
              className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
            >
              {t('ai_labeling.retry')}
            </button>
          </div>
        )}

        {/* Content Area */}
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
            <Loader2 size={40} className="text-indigo-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">{t('ai_labeling.loading')}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center shadow-sm">
            <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('ai_labeling.empty_title')}</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              {t('ai_labeling.empty_body')}
            </p>
            <button
              onClick={() => fetchItems(page)}
              className="px-6 py-2.5 text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              {t('ai_labeling.check_again')}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {items.map(item => (
                <LabelingItemCard
                  key={item.id}
                  item={item}
                  mode={source === 'pending' ? 'moderation' : 'labeling'}
                  onUpdateItem={handleUpdateItem}
                  onRemoveItem={handleRemoveItem}
                  onError={(msg) => showToast('error', msg)}
                  onSuccess={(msg) => showToast('success', msg)}
                  onModerate={(action, notes) => handleModerationAction(item.id, action, notes)}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div className="text-sm text-gray-500 font-medium">
                {t('ai_labeling.page_of', { page, total: totalPages })}
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
