import React, { useState, useEffect } from 'react';
import { X, Calendar, Loader, MapPin, Link as LinkIcon, Globe } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useTranslation } from 'react-i18next';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type?: string;
}

interface Chapter {
  id: number;
  name: string;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onSuccess, type: initialType = 'global' }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
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
      await apiClient.post('/admin/events', {
        title,
        description,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        isOnline,
        location: isOnline ? null : location,
        meetingLink: isOnline ? meetingLink : null,
        type: targetType === 'global' ? initialType : 'chapter',
        targetId: targetType === 'chapter' ? selectedChapter : null
      });
      onSuccess();
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      setLocation('');
      setMeetingLink('');
      setTargetType('global');
      setSelectedChapter('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-indigo-100 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-indigo-900 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-2 text-white">
            <Calendar className="h-5 w-5" />
            <h3 className="font-semibold text-lg">{t('communications.events.create_new')}</h3>
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

          {/* Target Selection */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-indigo-50 rounded-lg">
            <button
              type="button"
              onClick={() => setTargetType('global')}
              className={`flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-all ${
                targetType === 'global'
                  ? 'bg-white text-indigo-900 shadow-sm ring-1 ring-black/5'
                  : 'text-indigo-600 hover:bg-indigo-100/50'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>{t('communications.events.form.platform_wide')}</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetType('chapter')}
              className={`flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-all ${
                targetType === 'chapter'
                  ? 'bg-white text-indigo-900 shadow-sm ring-1 ring-black/5'
                  : 'text-indigo-600 hover:bg-indigo-100/50'
              }`}
            >
              <MapPin className="h-4 w-4" />
              <span>{t('communications.events.form.specific_chapter')}</span>
            </button>
          </div>

          {targetType === 'chapter' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-medium text-indigo-900 mb-1">{t('communications.events.form.select_chapter')}</label>
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

          <div>
            <label className="block text-sm font-medium text-indigo-900 mb-1">{t('communications.events.form.title')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder={t('communications.events.form.title')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-900 mb-1">{t('communications.events.form.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all min-h-[100px]"
              placeholder={t('communications.events.form.description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">{t('communications.events.form.start_time')}</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">{t('communications.events.form.end_time')}</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 py-2">
            <input
              type="checkbox"
              id="isOnline"
              checked={isOnline}
              onChange={(e) => setIsOnline(e.target.checked)}
              className="h-4 w-4 text-indigo-900 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isOnline" className="text-sm font-medium text-indigo-900">{t('communications.events.form.is_online_label')}</label>
          </div>

          {isOnline ? (
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">{t('communications.events.form.meeting_url')}</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-indigo-400" />
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder={t('communications.events.form.meeting_url_placeholder')}
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">{t('communications.events.form.location')}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-indigo-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder={t('communications.events.form.location_placeholder')}
                  required
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-indigo-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-indigo-900 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
            >
              {t('communications.events.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition-colors font-medium flex items-center shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  {t('communications.events.form.submitting')}
                </>
              ) : (
                t('communications.events.form.submit')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;
