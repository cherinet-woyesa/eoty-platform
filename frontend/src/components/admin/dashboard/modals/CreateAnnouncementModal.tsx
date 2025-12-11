import React, { useState, useEffect } from 'react';
import { X, Megaphone, Loader, Globe, MapPin } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useTranslation } from 'react-i18next';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type?: string; // 'global' or 'teacher' passed from parent
}

interface Chapter {
  id: number;
  name: string;
}

const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({ isOpen, onClose, onSuccess, type: initialType = 'global' }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [targetType, setTargetType] = useState<'global' | 'chapter'>('global');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialType === 'global') {
      fetchChapters();
    }
  }, [isOpen, initialType]);

  const fetchChapters = async () => {
    try {
      setIsLoadingChapters(true);
      const response = await apiClient.get('/chapters');
      if (response.data?.success) {
        // Handle nested data structure from controller { data: { chapters: [] } }
        const chaptersData = response.data.data?.chapters || response.data.data || [];
        setChapters(Array.isArray(chaptersData) ? chaptersData : []);
      }
    } catch (err) {
      console.error('Failed to fetch chapters', err);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (targetType === 'chapter' && !selectedChapter) {
      setError('Please select a chapter');
      setIsSubmitting(false);
      return;
    }

    try {
      await apiClient.post('/admin/announcements', {
        title,
        content,
        priority,
        type: targetType === 'global' ? initialType : 'chapter',
        targetId: targetType === 'chapter' ? selectedChapter : null
      });
      onSuccess();
      onClose();
      setTitle('');
      setContent('');
      setPriority('normal');
      setTargetType('global');
      setSelectedChapter('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-indigo-100 overflow-hidden">
        <div className="bg-indigo-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white">
            <Megaphone className="h-5 w-5" />
            <h3 className="font-semibold text-lg">{t('communications.announcements.create_new')}</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-indigo-200 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-indigo-900 mb-1">{t('communications.announcements.form.title')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder={t('communications.announcements.form.title_placeholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-900 mb-1">{t('communications.announcements.form.content')}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all min-h-[120px]"
              placeholder={t('communications.announcements.form.content_placeholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-900 mb-1">{t('communications.announcements.form.target_audience')}</label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => setTargetType('global')}
                className={`flex items-center justify-center px-4 py-2 rounded-lg border transition-all ${
                  targetType === 'global' 
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' 
                    : 'bg-white border-indigo-200 text-stone-600 hover:bg-indigo-50'
                }`}
              >
                <Globe className="h-4 w-4 mr-2" />
                {t('communications.events.form.platform_wide')}
              </button>
              <button
                type="button"
                onClick={() => setTargetType('chapter')}
                className={`flex items-center justify-center px-4 py-2 rounded-lg border transition-all ${
                  targetType === 'chapter' 
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' 
                    : 'bg-white border-indigo-200 text-stone-600 hover:bg-indigo-50'
                }`}
              >
                <MapPin className="h-4 w-4 mr-2" />
                {t('communications.events.form.specific_chapter')}
              </button>
            </div>

            {targetType === 'chapter' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                  required={targetType === 'chapter'}
                  disabled={isLoadingChapters}
                >
                  <option value="">{t('communications.events.form.select_chapter')}...</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </option>
                  ))}
                </select>
                {isLoadingChapters && <p className="text-xs text-indigo-500 mt-1">Loading chapters...</p>}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-900 mb-1">{t('communications.announcements.form.priority')}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
            >
              <option value="low">{t('communications.announcements.form.priority_low')}</option>
              <option value="normal">{t('communications.announcements.form.priority_normal')}</option>
              <option value="high">{t('communications.announcements.form.priority_high')}</option>
              <option value="urgent">{t('communications.announcements.form.priority_urgent')}</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-indigo-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-indigo-900 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
            >
              {t('communications.announcements.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition-colors font-medium flex items-center shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  {t('communications.announcements.form.submitting')}
                </>
              ) : (
                t('communications.announcements.form.submit')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAnnouncementModal;
