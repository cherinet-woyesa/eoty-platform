import React, { useEffect, useState } from 'react';
import { adminApi } from '@/services/api/admin';
import { aiApi } from '@/services/api/ai';

const LABELS = [
  { value: 1, label: 'Aligned' },
  { value: 0.5, label: 'Ambiguous / Unsure' },
  { value: 0, label: 'Not Aligned' }
];

export default function AIFaithLabeling() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'pending' | 'assistant'>('pending');
  const [classifyingId, setClassifyingId] = useState<number | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [labelById, setLabelById] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    // refetch when source changes
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  async function fetchItems(page = 1) {
    setLoading(true);
    try {
      if (source === 'pending') {
        const res = await adminApi.getPendingAIModeration(page, 50);
        setItems(res.data.items || []);
      } else {
        const res = await adminApi.getAILabelingCandidates(page, 50, 14);
        setItems(res.data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch items', err);
    } finally {
      setLoading(false);
    }
  }

  async function classifyItem(item: any) {
    try {
      setClassifyingId(item.id);
      const text = item.content || item.question || item.original_query || '';
      const res = await aiApi.faithClassify(text, { source: 'admin_labeling', itemId: item.id });
      // attach classifier result to item locally
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, classifier: res.data } : i));
    } catch (err) {
      console.error('Classification failed', err);
    } finally {
      setClassifyingId(null);
    }
  }

  async function submitLabel(item: any) {
    try {
      const text = item.content || item.question || item.original_query || '';
      const label = labelById[item.id] ?? 1;
      const notes = notesById[item.id] || '';
      setSubmittingId(item.id);
      await aiApi.submitFaithLabel({ sessionId: item.session_id || 'admin', text, label, notes });
      // simple optimistic UI: mark item as labeled or remove from list
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
      console.error('Submit label failed', err);
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">AI Faith Alignment Labeling</h2>
      <p className="text-sm text-gray-600 mb-4">Review pending AI moderation items and provide a faith-alignment label to help train the classifier.</p>

      <div className="mb-4 flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Source:</label>
          <select value={source} onChange={e => setSource(e.target.value as any)} className="border rounded px-2 py-1">
            <option value="pending">Pending Moderation Items</option>
            <option value="assistant">Recent AI Responses</option>
          </select>
        </div>

        <div>
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded"
            onClick={() => fetchItems()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && <div>Loading...</div>}

      {!loading && items.length === 0 && (
        <div className="text-gray-600">No pending items to label.</div>
      )}

      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="border rounded p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-gray-500">ID: {item.id} {item.priority ? `• Priority: ${item.priority}` : ''}</div>
                <pre className="whitespace-pre-wrap mt-2 text-base">{item.text || item.content || item.question || item.original_query}</pre>
              </div>
              <div className="text-right text-sm text-gray-500">
                <div>From: {item.user?.email || item.user?.username || item.user_id || 'unknown'}</div>
                <div className="mt-2">{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</div>
              </div>
            </div>

            <div className="mt-3">
              <button
                className="px-2 py-1 mr-2 bg-gray-100 rounded"
                onClick={() => classifyItem(item)}
                disabled={classifyingId === item.id}
              >
                {classifyingId === item.id ? 'Classifying...' : 'Run Classifier'}
              </button>

              {item.classifier && (
                <div className="mt-2 text-sm">
                  <strong>Classifier:</strong> score={item.classifier.score ?? item.classifier.data?.score ?? 'n/a'} • aligned={String(item.classifier.isAligned ?? item.classifier.data?.isAligned ?? '')}
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-center space-x-4">
                {LABELS.map(l => (
                  <label key={l.value} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name={`label_${item.id}`}
                      checked={(labelById[item.id] ?? 1) === l.value}
                      onChange={() => setLabelById(prev => ({ ...prev, [item.id]: l.value }))}
                    />
                    <span className="text-sm">{l.label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-2">
                <textarea
                  placeholder="Notes (optional)"
                  value={notesById[item.id] || ''}
                  onChange={e => setNotesById(prev => ({ ...prev, [item.id]: e.target.value }))}
                  className="w-full border rounded p-2"
                />
              </div>

              <div className="mt-3 flex items-center space-x-2">
                <button
                  className="px-3 py-2 bg-green-600 text-white rounded"
                  onClick={() => submitLabel(item)}
                  disabled={submittingId === item.id}
                >
                  {submittingId === item.id ? 'Submitting...' : 'Submit Label'}
                </button>

                <button
                  className="px-3 py-2 bg-red-100 text-red-700 rounded"
                  onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
