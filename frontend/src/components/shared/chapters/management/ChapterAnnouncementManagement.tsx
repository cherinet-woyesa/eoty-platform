import React from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, Plus, Pin } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface Announcement {
  id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

interface ChapterAnnouncementManagementProps {
  announcements: Announcement[];
  onCreateAnnouncement: () => void;
  isLoading: boolean;
}

const ChapterAnnouncementManagement: React.FC<ChapterAnnouncementManagementProps> = ({
  announcements,
  onCreateAnnouncement,
  isLoading
}) => {
  const { t } = useTranslation();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">{t('chapters.manage.announcements.title', 'Announcements')}</h3>
        <button
          onClick={onCreateAnnouncement}
          className="flex items-center gap-2 px-4 py-2 bg-brand-warning/10 text-brand-warning rounded-lg hover:bg-brand-warning/20 transition-colors text-sm font-bold"
        >
          <Plus className="h-4 w-4" />
          {t('chapters.manage.announcements.create', 'Post New')}
        </button>
      </div>

      <div className="p-6 space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-100 rounded-xl">
            <Megaphone className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>{t('chapters.manage.announcements.no_announcements', 'No announcements posted')}</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div 
              key={announcement.id} 
              className={`p-5 rounded-xl border ${announcement.is_pinned ? 'border-brand-warning/30 bg-brand-warning/5' : 'border-slate-100 bg-white'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {announcement.is_pinned && <Pin className="h-4 w-4 text-brand-warning fill-brand-warning" />}
                  <h4 className="font-bold text-slate-900">{announcement.title}</h4>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(announcement.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{announcement.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChapterAnnouncementManagement;
