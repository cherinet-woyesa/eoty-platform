import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi } from '@/services/api/ai';
import { CheckCircle, XCircle, HelpCircle, Play, SkipForward, Save, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';

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
  mode?: 'labeling' | 'moderation';
  onModerate?: (action: 'approve' | 'reject' | 'escalate', notes?: string) => void | Promise<void>;
}

const LABELS = [
  { value: 1, labelKey: 'aligned', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 0.5, labelKey: 'ambiguous', icon: HelpCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { value: 0, labelKey: 'not_aligned', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' }
];

export default function LabelingItemCard({ item, onUpdateItem, onRemoveItem, onError, onSuccess, mode = 'labeling', onModerate }: LabelingItemCardProps) {
  const { t } = useTranslation();
  const [classifying, setClassifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<number>(() => deriveLabelFromClassifier(item));
  const [notes, setNotes] = useState('');
  const [moderationNotes, setModerationNotes] = useState('');
  const [moderatingAction, setModeratingAction] = useState<'approve' | 'reject' | 'escalate' | null>(null);

  const displayText = item.text || item.content || item.question || item.original_query || '';
  const isModeration = mode === 'moderation';

  useEffect(() => {
    setSelectedLabel(deriveLabelFromClassifier(item));
  }, [item.id, item.classifier]);

  async function handleClassify() {
    setClassifying(true);
    try {
      const res = await aiApi.faithClassify(displayText, { source: 'admin_labeling', itemId: item.id });
      onUpdateItem(item.id, { classifier: res.data });
      onSuccess(t('ai_labeling.classification_complete'));
    } catch (err) {
      console.error('Classification failed', err);
      onError(t('ai_labeling.classification_failed'));
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
      onSuccess(t('ai_labeling.label_submitted'));
      onRemoveItem(item.id);
    } catch (err) {
      console.error('Submit label failed', err);
      onError(t('ai_labeling.label_submit_failed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleModerate(action: 'approve' | 'reject' | 'escalate') {
    if (!onModerate) return;
    setModeratingAction(action);
    try {
      await onModerate(action, moderationNotes);
    } catch (err) {
      console.error('Moderation action failed', err);
      onError(t('ai_labeling.moderation_failed'));
    } finally {
      setModeratingAction(null);
    }
  }

  const classifierScore = item.classifier?.score ?? item.classifier?.data?.score;
  const classifierAligned = item.classifier?.isAligned ?? item.classifier?.data?.isAligned;

  return (
    <div className="bg-white border rounded-lg shadow-sm p-5 transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-gray-100 text-xs font-medium text-gray-600 rounded">{t('ai_labeling.id_label')}: {item.id}</span>
          {item.priority && (
            <span className="px-2 py-1 bg-orange-100 text-xs font-medium text-orange-700 rounded">
              {t('ai_labeling.priority')}: {item.priority}
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
      {(item as any)?.reason && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 mb-4">
          {t('ai_labeling.reason')}: {(item as any).reason}
        </div>
      )}

      {/* Actions Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left: Classifier */}
        <div className="border-r md:border-r-0 md:border-r border-gray-100 pr-0 md:pr-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">{t('ai_labeling.ai_classifier')}</h4>
            {!isModeration && (
              <button
                onClick={handleClassify}
                disabled={classifying}
                className="flex items-center space-x-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
              >
                <Play size={12} />
                <span>{classifying ? t('ai_labeling.running') : t('ai_labeling.run_check')}</span>
              </button>
            )}
          </div>
          
          {classifierScore !== undefined ? (
            <div className="bg-slate-50 rounded p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">{t('ai_labeling.score')}</span>
                <span className="font-mono font-medium">{(classifierScore * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('ai_labeling.verdict')}</span>
                <span className={`font-medium ${classifierAligned ? 'text-green-600' : 'text-red-600'}`}>
                  {classifierAligned ? t('ai_labeling.aligned') : t('ai_labeling.not_aligned')}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic py-2">
              {t('ai_labeling.no_classification', { note: isModeration ? t('ai_labeling.note_review') : t('ai_labeling.note_run_check') })}
            </div>
          )}
        </div>

        {/* Right: Mode-specific actions */}
        <div>
          {isModeration ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">{t('ai_labeling.moderation_actions')}</h4>
              <textarea
                placeholder={t('ai_labeling.notes_placeholder')}
                value={moderationNotes}
                onChange={(e) => setModerationNotes(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                rows={2}
                maxLength={500}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleModerate('approve')}
                  disabled={!onModerate || moderatingAction !== null}
                  className="flex-1 min-w-[120px] flex items-center justify-center space-x-2 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <ThumbsUp size={16} />
                  <span>{moderatingAction === 'approve' ? t('ai_labeling.saving') : t('ai_labeling.approve')}</span>
                </button>
                <button
                  onClick={() => handleModerate('reject')}
                  disabled={!onModerate || moderatingAction !== null}
                  className="flex-1 min-w-[120px] flex items-center justify-center space-x-2 bg-red-50 text-red-700 border border-red-200 py-2 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  <ThumbsDown size={16} />
                  <span>{moderatingAction === 'reject' ? t('ai_labeling.saving') : t('ai_labeling.reject')}</span>
                </button>
                <button
                  onClick={() => handleModerate('escalate')}
                  disabled={!onModerate || moderatingAction !== null}
                  className="flex-1 min-w-[120px] flex items-center justify-center space-x-2 bg-amber-50 text-amber-700 border border-amber-200 py-2 rounded hover:bg-amber-100 disabled:opacity-50 transition-colors"
                >
                  <AlertTriangle size={16} />
                  <span>{moderatingAction === 'escalate' ? t('ai_labeling.saving') : t('ai_labeling.escalate')}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('ai_labeling.human_label')}</h4>
              
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
                      <span className="text-xs font-medium">{t(`ai_labeling.${l.labelKey}`)}</span>
                    </button>
                  );
                })}
              </div>

              <textarea
                placeholder={t('ai_labeling.notes_placeholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded p-2 mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                rows={2}
                maxLength={1000}
              />

              <div className="flex space-x-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save size={16} />
                  <span>{submitting ? t('ai_labeling.saving_label') : t('ai_labeling.submit_label')}</span>
                </button>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="px-3 py-2 border border-gray-200 text-gray-600 rounded hover:bg-gray-50"
                  title={t('ai_labeling.skip')}
                >
                  <SkipForward size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function deriveLabelFromClassifier(item: LabelingItem): number {
  const aligned = item.classifier?.isAligned ?? item.classifier?.data?.isAligned;
  const score = item.classifier?.score ?? item.classifier?.data?.score;
  if (aligned === true) return 1;
  if (aligned === false) return 0;
  if (typeof score === 'number') {
    if (score >= 0.66) return 1;
    if (score >= 0.4) return 0.5;
    return 0;
  }
  return 1;
}
