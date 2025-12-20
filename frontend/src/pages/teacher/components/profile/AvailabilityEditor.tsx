import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { brandColors } from '@/theme/brand';

interface AvailabilityEditorProps {
  initial: Record<string, string[]>;
  onSave: (availability: Record<string, string[]>) => void;
}

const AvailabilityEditor: React.FC<AvailabilityEditorProps> = ({ initial, onSave }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [slots, setSlots] = useState<Record<string, string[]>>(initial || {});
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [newTimeStart, setNewTimeStart] = useState('');
  const [newTimeEnd, setNewTimeEnd] = useState('');

  const { t } = useTranslation();
  const { showNotification } = useNotification();

  useEffect(() => setSlots(initial || {}), [initial]);

  const handleAddSlot = (day: string) => {
    if (!newTimeStart || !newTimeEnd) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.time_required', 'Please select both start and end times'), type: 'warning' });
      return;
    }

    const time = `${newTimeStart}-${newTimeEnd}`;

    // Validate time
    if (newTimeStart >= newTimeEnd) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.invalid_time_range', 'End time must be after start time'), type: 'warning' });
      return;
    }

    // Check for duplicates
    if ((slots[day] || []).includes(time)) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.time_slot_exists', 'This time slot already exists'), type: 'warning' });
      return;
    }

    const updated = { ...slots, [day]: [...(slots[day] || []), time] };
    setSlots(updated);
    onSave(updated);

    // Reset form
    setNewTimeStart('');
    setNewTimeEnd('');
    setActiveDay(null);
  };

  const removeSlot = (day: string, idx: number) => {
    const updated = { ...slots, [day]: (slots[day] || []).filter((_, i) => i !== idx) };
    setSlots(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      {days.map(day => (
        <div key={day} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-800">{t(`teacher_profile.availability.days.${day}`, day)}</span>
            {activeDay !== day && (
              <button
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
                style={{ color: brandColors.primaryHex }}
                onClick={() => {
                  setActiveDay(day);
                  setNewTimeStart('');
                  setNewTimeEnd('');
                }}
              >
                {t('teacher_profile.availability.add_slot', 'Add Slot')}
              </button>
            )}
          </div>

          {activeDay === day && (
            <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="time"
                  className="px-2 py-1 border rounded text-sm"
                  value={newTimeStart}
                  onChange={e => setNewTimeStart(e.target.value)}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="time"
                  className="px-2 py-1 border rounded text-sm"
                  value={newTimeEnd}
                  onChange={e => setNewTimeEnd(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddSlot(day)}
                  className="px-3 py-1 text-xs text-white rounded hover:opacity-90"
                  style={{ backgroundColor: brandColors.primaryHex }}
                >
                  {t('teacher_profile.availability.save', 'Save')}
                </button>
                <button
                  onClick={() => setActiveDay(null)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  {t('teacher_profile.availability.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          )}

          <ul className="space-y-2">
            {(slots[day] || []).length === 0 && activeDay !== day && (
              <li className="text-xs text-gray-400 italic">{t('teacher_profile.availability.no_availability', 'No availability set')}</li>
            )}
            {(slots[day] || []).map((s, idx) => (
              <li key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-100">
                <span className="text-sm text-gray-700 font-medium">{s}</span>
                <button
                  className="text-xs text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                  onClick={() => removeSlot(day, idx)}
                  aria-label="Remove slot"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default AvailabilityEditor;