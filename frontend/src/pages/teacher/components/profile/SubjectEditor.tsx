import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { brandColors } from '@/theme/brand';

interface SubjectEditorProps {
  initial: string[];
  onSave: (subjects: string[]) => void;
}

const SubjectEditor: React.FC<SubjectEditorProps> = ({ initial, onSave }) => {
  const [items, setItems] = useState<string[]>(initial);
  const [newItem, setNewItem] = useState('');
  useEffect(() => setItems(initial), [initial]);
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"
          style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder={t('teacher_profile.subjects.placeholder', 'Add a subject (e.g. Liturgy, Bible Study, Church History)')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newItem.trim() && items.length < 5 && newItem.trim().length <= 50) {
              const updated = [...items, newItem.trim()].filter(Boolean); setItems(updated); onSave(updated);
            }
          }}
        />
        <button
          className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-colors font-medium"
          style={{ backgroundColor: brandColors.primaryHex }}
          disabled={!newItem.trim() || items.length >= 5 || newItem.trim().length > 50}
          onClick={() => { const updated = [...items, newItem.trim()].filter(Boolean); setItems(updated); setNewItem(''); onSave(updated); }}
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((s, idx) => (
          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border group transition-colors bg-gray-50"
               style={{ borderColor: brandColors.primaryHex }}>
            <span className="text-sm font-medium" style={{ color: brandColors.primaryHex }}>{s}</span>
            <button
              className="text-gray-400 hover:text-red-600 transition-colors p-0.5 rounded-full hover:bg-red-50"
              onClick={() => { const updated = items.filter((_, i) => i !== idx); setItems(updated); onSave(updated); }}
              aria-label={`Remove ${s}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-500 italic w-full">{t('teacher_profile.subjects.no_subjects', 'No subjects added yet.')}</p>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">{t('teacher_profile.subjects.max_subjects', 'Maximum 5 subjects.')}</p>
    </div>
  );
};

export default SubjectEditor;