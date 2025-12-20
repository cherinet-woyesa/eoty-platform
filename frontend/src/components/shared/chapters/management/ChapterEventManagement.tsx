import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Plus, MapPin, Video, Users } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Event {
  id: number;
  title: string;
  description: string;
  event_date: string;
  is_online: boolean;
  location?: string;
  meeting_link?: string;
}

interface ChapterEventManagementProps {
  events: Event[];
  onCreateEvent: () => void;
  onViewAttendance: (eventId: number) => void;
  isLoading: boolean;
}

const ChapterEventManagement: React.FC<ChapterEventManagementProps> = ({
  events,
  onCreateEvent,
  onViewAttendance,
  isLoading
}) => {
  const { t } = useTranslation();

  if (isLoading) return <LoadingSpinner size="lg" text={t('common.loading')} variant="logo" />;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">{t('chapters.manage.events.title', 'Events')}</h3>
        <button
          onClick={onCreateEvent}
          className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary/20 transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>{t('chapters.manage.events.no_events', 'No upcoming events')}</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="p-4 rounded-xl border border-slate-100 hover:border-brand-primary/30 hover:shadow-sm transition-all group">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-900 line-clamp-1">{event.title}</h4>
                <span className="text-xs font-bold text-brand-primary bg-brand-primary/5 px-2 py-1 rounded-md">
                  {new Date(event.event_date).toLocaleDateString()}
                </span>
              </div>

              <p className="text-sm text-slate-500 line-clamp-2 mb-3">{event.description}</p>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  {event.is_online ? (
                    <span className="flex items-center gap-1"><Video className="h-3 w-3" /> {t('chapters.manage.events.online', 'Online')}</span>
                  ) : (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location || t('chapters.manage.events.in_person', 'In-person')}</span>
                  )}
                </div>

                <button
                  onClick={() => onViewAttendance(event.id)}
                  className="flex items-center gap-1 text-slate-400 hover:text-brand-primary transition-colors"
                >
                  <Users className="h-3 w-3" />
                  {t('chapters.manage.events.attendance', 'Attendance')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChapterEventManagement;
