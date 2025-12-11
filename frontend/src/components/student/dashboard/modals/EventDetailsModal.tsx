import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Link as LinkIcon, Clock, CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { chaptersApi } from '@/services/api/chapters';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ isOpen, onClose, event }) => {
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      fetchRsvpStatus();
    }
  }, [isOpen, event]);

  const fetchRsvpStatus = async () => {
    if (!event) return;
    setIsLoading(true);
    try {
      if (event.source === 'global') {
        const res = await apiClient.get(`/interactive/events/${event.id}/rsvp`);
        setRsvpStatus(res.data.data.status);
      } else {
        // Chapter event
        // The chapter API for attendance is a bit different, usually for leaders to mark.
        // But let's assume we can check our own attendance or use a similar endpoint if available.
        // If not available, we might skip RSVP for chapter events for now or implement it later.
        // For now, let's try to fetch it if the endpoint supports "my attendance".
        // Based on previous analysis, chapter attendance is "marked by leader". 
        // So we might not be able to RSVP to chapter events yet.
        setRsvpStatus(null); 
      }
    } catch (err) {
      console.error('Failed to fetch RSVP status', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRsvp = async (status: string) => {
    if (!event) return;
    setIsUpdating(true);
    try {
      if (event.source === 'global') {
        await apiClient.post(`/interactive/events/${event.id}/rsvp`, { status });
        setRsvpStatus(status);
      } else {
        // For chapter events, we might need a new endpoint or use the existing one if adapted.
        // Currently skipping RSVP for chapter events as per analysis.
        alert("RSVP for chapter events is handled by your chapter leader.");
      }
    } catch (err) {
      console.error('Failed to update RSVP', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen || !event) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-indigo-900 px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">Event Details</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
            <div className="flex items-center text-gray-500 text-sm mt-1 gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${event.source === 'global' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                {event.source === 'global' ? 'Global Event' : 'Chapter Event'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 text-gray-700">
              <Calendar className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div>
                <p className="font-medium">Date & Time</p>
                <p className="text-sm text-gray-600">{formatDate(event.start_time || event.event_date || event.date)}</p>
              </div>
            </div>

            {(event.location || event.is_online) && (
              <div className="flex items-start gap-3 text-gray-700">
                <MapPin className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-gray-600">
                    {event.is_online ? 'Online Event' : event.location}
                  </p>
                  {event.is_online && event.meeting_link && (
                    <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm flex items-center gap-1 mt-1">
                      <LinkIcon className="h-3 w-3" /> Join Meeting
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
            {event.description || 'No description provided.'}
          </div>

          {event.source === 'global' && (
            <div className="border-t pt-4">
              <p className="font-medium text-gray-900 mb-3">Your RSVP</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRsvp('going')}
                  disabled={isUpdating}
                  className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                    rsvpStatus === 'going' 
                      ? 'bg-green-100 text-green-800 border-2 border-green-500' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" /> Going
                </button>
                <button
                  onClick={() => handleRsvp('maybe')}
                  disabled={isUpdating}
                  className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                    rsvpStatus === 'maybe' 
                      ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <HelpCircle className="h-4 w-4" /> Maybe
                </button>
                <button
                  onClick={() => handleRsvp('not_going')}
                  disabled={isUpdating}
                  className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                    rsvpStatus === 'not_going' 
                      ? 'bg-red-100 text-red-800 border-2 border-red-500' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <XCircle className="h-4 w-4" /> Can't Go
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;
