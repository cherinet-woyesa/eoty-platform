import React, { useState } from 'react';
import { aiApi } from '@/services/api/ai';
import { CheckCircle, XCircle, HelpCircle, Play, SkipForward, Save, AlertTriangle } from 'lucide-react';

interface LabelingItem {
  id: number;
  text?: string;
  content?: string;
  question?: string;
  original_query?: string;
  priority?: number;
  user?: {
    email?: string;
    username?: string;
  };
  user_id?: number;
  created_at?: string;
  session_id?: string;
  classifier?: {
    score?: number;
    isAligned?: boolean;
    data?: {
      score?: number;
      isAligned?: boolean;
    };
  };
}

interface LabelingItemCardProps {
  item: LabelingItem;
  onUpdateItem: (id: number, updates: Partial<LabelingItem>) => void;
  onRemoveItem: (id: number) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

const LABELS = [
  { value: 1, label: 'Aligned', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 0.5, label: 'Ambiguous', icon: HelpCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { value: 0, label: 'Not Aligned', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' }
];

export default function LabelingItemCard({ item, onUpdateItem, onRemoveItem, onError, onSuccess }: LabelingItemCardProps) {
  const [classifying, setClassifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<number>(1);
  const [notes, setNotes] = useState('');

  const displayText = item.text || item.content || item.question || item.original_query || '';

  async function handleClassify() {
    setClassifying(true);
    try {
      const res = await aiApi.faithClassify(displayText, { source: 'admin_labeling', itemId: item.id });
      onUpdateItem(item.id, { classifier: res.data });
      onSuccess('Classification complete');
    } catch (err) {
      console.error('Classification failed', err);
      onError('Classification failed');
    } finally {
      setClassifying(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await aiApi.submitFaithLabel({ 
        sessionId: item.session_id || 'admin', 
        text: displayText, 
        label: selectedLabel, 
        notes 
      });
      onSuccess('Label submitted successfully');
      onRemoveItem(item.id);
    } catch (err) {
      console.error('Submit label failed', err);
      onError('Failed to submit label');
    } finally {
      setSubmitting(false);
    }
  }

  const classifierScore = item.classifier?.score ?? item.classifier?.data?.score;
  const classifierAligned = item.classifier?.isAligned ?? item.classifier?.data?.isAligned;

  return (
    <div className="bg-white border rounded-lg shadow-sm p-5 transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-gray-100 text-xs font-medium text-gray-600 rounded">ID: {item.id}</span>
          {item.priority && (
            <span className="px-2 py-1 bg-orange-100 text-xs font-medium text-orange-700 rounded">
              Priority: {item.priority}
            </span>
          )}
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>{item.user?.email || item.user?.username || `User ${item.user_id}` || 'Unknown User'}</div>
          <div className="mt-1">{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50 rounded-md p-4 mb-4 border border-gray-100">
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">{displayText}</pre>
      </div>

      {/* Actions Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left: Classifier */}
        <div className="border-r md:border-r-0 md:border-r border-gray-100 pr-0 md:pr-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">AI Classifier</h4>
            <button
              onClick={handleClassify}
              disabled={classifying}
              className="flex items-center space-x-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
            >
              <Play size={12} />
              <span>{classifying ? 'Running...' : 'Run Check'}</span>
            </button>
          </div>
          
          {classifierScore !== undefined ? (
            <div className="bg-slate-50 rounded p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Score:</span>
                <span className="font-mono font-medium">{(classifierScore * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Verdict:</span>
                <span className={`font-medium ${classifierAligned ? 'text-green-600' : 'text-red-600'}`}>
                  {classifierAligned ? 'Aligned' : 'Not Aligned'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic py-2">
              No classification data available. Run check to analyze.
            </div>
          )}
        </div>

        {/* Right: Human Labeling */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Human Label</h4>
          
          <div className="flex space-x-2 mb-4">
            {LABELS.map((l) => {
              const Icon = l.icon;
              const isSelected = selectedLabel === l.value;
              return (
                <button
                  key={l.value}
                  onClick={() => setSelectedLabel(l.value)}
                  className={`flex-1 flex flex-col items-center justify-center p-2 rounded border transition-all ${
                    isSelected 
                      ? `${l.bg} ${l.color} border-current ring-1 ring-current` 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} className="mb-1" />
                  <span className="text-xs font-medium">{l.label}</span>
                </button>
              );
            })}
          </div>

          <textarea
            placeholder="Add notes (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded p-2 mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            rows={2}
          />

          <div className="flex space-x-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save size={16} />
              <span>{submitting ? 'Saving...' : 'Submit Label'}</span>
            </button>
            <button
              onClick={() => onRemoveItem(item.id)}
              className="px-3 py-2 border border-gray-200 text-gray-600 rounded hover:bg-gray-50"
              title="Skip this item"
            >
              <SkipForward size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
