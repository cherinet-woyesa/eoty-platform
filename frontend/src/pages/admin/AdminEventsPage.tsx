import React, { useState, useEffect } from 'react';
import { Calendar, Plus, MapPin, Video, Trash2, Clock, Globe, Users } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import CreateEventModal from '@/components/admin/dashboard/modals/CreateEventModal';
import { format } from 'date-fns';

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

const AdminEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/admin/events', {
        params: { upcoming: filter === 'upcoming' }
      });
      if (response.data?.success) {
        setEvents(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this event?')) return;
    
    try {
      await apiClient.delete(`/admin/events/${id}`);
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  return (
    <div className="w-full h-full p-6 space-y-6 bg-gray-50/50 overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">Event Management</h1>
          <p className="text-gray-500">Schedule and manage platform-wide and chapter events</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          <span>Create Event</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 bg-white p-1 rounded-lg border border-gray-200 w-fit">
        {(['upcoming', 'past', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              filter === f
                ? 'bg-indigo-50 text-indigo-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-t-2 border-indigo-900 rounded-full animate-spin"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No events found</h3>
          <p className="text-gray-500">Create your first event to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <div key={event.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    event.type === 'global' 
                      ? 'bg-purple-50 text-purple-700 border-purple-100' 
                      : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {event.type === 'global' ? 'Platform Wide' : 'Chapter Event'}
                  </span>
                  <h3 className="font-semibold text-lg text-gray-900">{event.title}</h3>
                </div>
                
                <p className="text-gray-600 text-sm line-clamp-2 max-w-2xl">{event.description}</p>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 pt-2">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>
                      {format(new Date(event.start_time), 'MMM d, yyyy h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
                    </span>
                  </div>
                  
                  {event.is_online ? (
                    <div className="flex items-center space-x-1.5 text-blue-600">
                      <Video className="h-4 w-4" />
                      <a href={event.meeting_link || '#'} target="_blank" rel="noreferrer" className="hover:underline">
                        Online Meeting
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{event.location}</span>
                    </div>
                  )}

                  {event.type === 'chapter' && (
                    <div className="flex items-center space-x-1.5">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>Chapter ID: {event.target_id}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-end">
                <button
                  onClick={() => handleDelete(event.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Cancel Event"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchEvents();
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
};

export default AdminEventsPage;
