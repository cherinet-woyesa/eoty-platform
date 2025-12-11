import React, { useState, useEffect } from 'react';
import { Calendar, Plus, MapPin, Video, Trash2, Clock, Globe, Users, Megaphone, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import CreateEventModal from '@/components/admin/dashboard/modals/CreateEventModal';
import CreateAnnouncementModal from '@/components/admin/dashboard/modals/CreateAnnouncementModal';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface Event {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string | null;
  is_online: boolean;
  meeting_link: string | null;
  type: 'global' | 'chapter';
  target_id: number | null;
  created_by: number;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'global' | 'chapter';
  target_id: number | null;
  priority: 'normal' | 'high' | 'urgent';
  expires_at: string | null;
  created_at: string;
  created_by: number;
}

const AdminCommunicationsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'events' | 'announcements'>('events');
  
  // Events State
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  // Announcements State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState(true);
  const [isCreateAnnouncementModalOpen, setIsCreateAnnouncementModalOpen] = useState(false);

  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
    } else {
      fetchAnnouncements();
    }
  }, [activeTab, eventFilter]);

  const fetchEvents = async () => {
    try {
      setIsEventsLoading(true);
      const response = await apiClient.get('/admin/events', {
        params: { upcoming: eventFilter === 'upcoming' }
      });
      if (response.data?.success) {
        setEvents(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsEventsLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setIsAnnouncementsLoading(true);
      const response = await apiClient.get('/admin/announcements');
      if (response.data?.success) {
        setAnnouncements(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setIsAnnouncementsLoading(false);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!window.confirm(t('communications.events.delete_confirm'))) return;
    
    try {
      await apiClient.delete(`/admin/events/${id}`);
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!window.confirm(t('communications.announcements.delete_confirm'))) return;
    
    try {
      await apiClient.delete(`/admin/announcements/${id}`);
      fetchAnnouncements();
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-50 text-blue-800 border-blue-100';
    }
  };

  return (
    <div className="w-full h-full p-6 space-y-6 bg-gray-50/50 overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">{t('communications.title')}</h1>
          <p className="text-gray-500">{t('nav.communications_desc')}</p>
        </div>
        <button
          onClick={() => activeTab === 'events' ? setIsCreateEventModalOpen(true) : setIsCreateAnnouncementModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          <span>{activeTab === 'events' ? t('communications.events.create_new') : t('communications.announcements.create_new')}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('events')}
            className={`${
              activeTab === 'events'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
          >
            <Calendar className="h-4 w-4" />
            <span>{t('communications.tabs.events')}</span>
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`${
              activeTab === 'announcements'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
          >
            <Megaphone className="h-4 w-4" />
            <span>{t('communications.tabs.announcements')}</span>
          </button>
        </nav>
      </div>

      {/* Events Content */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex space-x-2 bg-white p-1 rounded-lg border border-gray-200 w-fit">
            {(['upcoming', 'past', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setEventFilter(f)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  eventFilter === f
                    ? 'bg-indigo-50 text-indigo-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {isEventsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-t-2 border-indigo-900 rounded-full animate-spin"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">{t('communications.events.no_events_found')}</h3>
              <p className="text-gray-500">{t('communications.events.create_first_event')}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {events.map((event) => (
                <div key={event.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        event.type === 'global' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}>
                        {event.type === 'global' ? t('communications.events.global_event') : t('communications.events.chapter_event')}
                      </span>
                      {event.is_online && (
                        <span className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                          <Video className="h-3 w-3" />
                          <span>{t('communications.events.online')}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{event.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 pt-2">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{format(new Date(event.start_time), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <button 
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('communications.events.delete_event')}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Announcements Content */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          {isAnnouncementsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-t-2 border-indigo-900 rounded-full animate-spin"></div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
              <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">{t('communications.announcements.no_announcements_found')}</h3>
              <p className="text-gray-500">{t('communications.announcements.post_first_announcement')}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wide ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        announcement.type === 'global' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}>
                        {announcement.type === 'global' ? 'Global' : 'Chapter'}
                      </span>
                      <span className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{t('communications.announcements.posted')} {format(new Date(announcement.created_at), 'MMM d, yyyy')}</span>
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">{announcement.content}</p>
                    
                    {announcement.expires_at && (
                      <div className="flex items-center space-x-1.5 text-xs text-amber-600 bg-amber-50 w-fit px-2 py-1 rounded border border-amber-100 mt-2">
                        <AlertCircle className="h-3 w-3" />
                        <span>{t('communications.announcements.expires')} {format(new Date(announcement.expires_at), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start space-x-2">
                    <button 
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('communications.announcements.delete_announcement')}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <CreateEventModal 
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        onSuccess={() => {
          setIsCreateEventModalOpen(false);
          fetchEvents();
        }}
      />

      <CreateAnnouncementModal
        isOpen={isCreateAnnouncementModalOpen}
        onClose={() => setIsCreateAnnouncementModalOpen(false)}
        onSuccess={() => {
          setIsCreateAnnouncementModalOpen(false);
          fetchAnnouncements();
        }}
      />
    </div>
  );
};

export default AdminCommunicationsPage;
