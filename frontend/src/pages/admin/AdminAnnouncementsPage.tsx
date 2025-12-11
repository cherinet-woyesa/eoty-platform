import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Clock, Users, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import CreateAnnouncementModal from '@/components/admin/dashboard/modals/CreateAnnouncementModal';
import { format } from 'date-fns';

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

const AdminAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/admin/announcements');
      if (response.data?.success) {
        setAnnouncements(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    
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
          <h1 className="text-2xl font-bold text-indigo-900">Announcements</h1>
          <p className="text-gray-500">Manage platform-wide and chapter announcements</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          <span>Post Announcement</span>
        </button>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-t-2 border-indigo-900 rounded-full animate-spin"></div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
          <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No announcements found</h3>
          <p className="text-gray-500">Post your first announcement to get started</p>
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
                    {announcement.type === 'global' ? 'Platform Wide' : 'Chapter Announcement'}
                  </span>
                  <h3 className="font-semibold text-lg text-gray-900">{announcement.title}</h3>
                </div>
                
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{announcement.content}</p>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 pt-2">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>Posted: {format(new Date(announcement.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  
                  {announcement.expires_at && (
                    <div className="flex items-center space-x-1.5 text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Expires: {format(new Date(announcement.expires_at), 'MMM d, yyyy')}</span>
                    </div>
                  )}

                  {announcement.type === 'chapter' && (
                    <div className="flex items-center space-x-1.5">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>Chapter ID: {announcement.target_id}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-end">
                <button
                  onClick={() => handleDelete(announcement.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Announcement"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateAnnouncementModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchAnnouncements();
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
};

export default AdminAnnouncementsPage;
