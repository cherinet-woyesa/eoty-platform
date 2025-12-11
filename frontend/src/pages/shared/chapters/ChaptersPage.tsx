/**
 * FR7: Chapters Page
 * REQUIREMENT: Multi-city/chapter membership
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Search, Plus, Globe, Home, Settings, Award, Check, X, Calendar, Clock, Video, FileText, Megaphone, ClipboardList, Link as LinkIcon, Loader2, ArrowLeft } from 'lucide-react';
import ChapterSelection from '@/components/shared/chapters/ChapterSelection';
import { chaptersApi, type UserChapter } from '@/services/api/chapters';
import { achievementsApi, type Badge } from '@/services/api/achievements';
import { useNotification } from '@/context/NotificationContext';
import { useTranslation } from 'react-i18next';
import { brandColors } from '@/theme/brand';

const ChaptersPage: React.FC = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'browse' | 'my-chapters' | 'manage'>('browse');
  const [members, setMembers] = useState<any[]>([]);
  const [userChapters, setUserChapters] = useState<UserChapter[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<number | null>(null);

  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<number | null>(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [managedChapter, setManagedChapter] = useState<UserChapter | null>(null);
  
  // Modal states
  const [showStartChapterModal, setShowStartChapterModal] = useState(false);
  const [showApplyLeadershipModal, setShowApplyLeadershipModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showCreateResourceModal, setShowCreateResourceModal] = useState(false);
  const [showCreateAnnouncementModal, setShowCreateAnnouncementModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  
  // Student View State
  const [viewingChapter, setViewingChapter] = useState<any | null>(null);

  // Form states
  const [newResource, setNewResource] = useState({ title: '', type: 'link', url: '', description: '' });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', is_pinned: false });
  const [newChapterData, setNewChapterData] = useState({
    name: '',
    location: '',
    description: '',
    country: '',
    city: '',
    region: '',
    topics: ''
  });
  const [leadershipData, setLeadershipData] = useState({
    reason: '',
    experience: ''
  });
  const [newEventData, setNewEventData] = useState({
    title: '',
    description: '',
    event_date: '',
    duration_minutes: 60,
    location: '',
    is_online: false,
    meeting_link: ''
  });

  useEffect(() => {
    if (activeTab === 'manage') {
      loadManageData();
    }
  }, [activeTab]);

  const loadChapterDetails = async (chapterId: number) => {
    try {
      const [eventsRes, resourcesRes, announcementsRes, membersRes] = await Promise.all([
        chaptersApi.getEvents(chapterId),
        chaptersApi.getResources(chapterId),
        chaptersApi.getAnnouncements(chapterId),
        chaptersApi.getMembers(chapterId)
      ]);
      
      setEvents(eventsRes.data.events);
      setResources(resourcesRes.data.resources);
      setAnnouncements(announcementsRes.data.announcements);
      setMembers(membersRes.data.members || []);
    } catch (err) {
      console.error('Failed to load chapter details', err);
    }
  };

  const handleViewChapter = async (chapter: any) => {
    setViewingChapter(chapter);
    await loadChapterDetails(chapter.id || chapter.chapter_id);
  };

  const loadManageData = async () => {
    setManageLoading(true);
    try {
      const userChaptersRes = await chaptersApi.getUserChapters();
      // Find a chapter where user is leader/admin
      const chapter = userChaptersRes.data.chapters.find(
        (c: UserChapter) => ['admin', 'moderator', 'chapter_leader', 'teacher', 'chapter_admin'].includes(c.role)
      );
      setUserChapters(userChaptersRes.data.chapters || []);

      if (chapter) {
        setManagedChapter(chapter);
        const membersRes = await chaptersApi.getMembers(chapter.chapter_id);
        setMembers(membersRes.data.members || []);
        
        const badgesRes = await achievementsApi.getAvailableBadges();
        setBadges(badgesRes.data.badges.filter((b: Badge) => b.is_manual));

        const eventsRes = await chaptersApi.getEvents(chapter.chapter_id);
        setEvents(eventsRes.data.events);

        const resourcesRes = await chaptersApi.getResources(chapter.chapter_id);
        setResources(resourcesRes.data.resources);

        const announcementsRes = await chaptersApi.getAnnouncements(chapter.chapter_id);
        setAnnouncements(announcementsRes.data.announcements);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setManageLoading(false);
    }
  };

  const handleAwardBadge = async () => {
    if (!selectedMember || !selectedBadge) return;
    try {
      await achievementsApi.awardBadge(selectedMember, selectedBadge);
      showNotification({
        type: 'success',
        title: 'Badge Awarded',
        message: 'Badge awarded successfully!'
      });
      setSelectedMember(null);
      setSelectedBadge(null);
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to award badge'
      });
    }
  };

  const handleUpdateMemberStatus = async (userId: number, status: 'approved' | 'rejected') => {
    if (!managedChapter) return;
    try {
      await chaptersApi.updateMemberStatus(managedChapter.chapter_id, userId, status);
      showNotification({
        type: 'success',
        title: 'Success',
        message: `Member ${status} successfully`
      });
      // Refresh members
      const membersRes = await chaptersApi.getMembers(managedChapter.chapter_id);
      setMembers(membersRes.data.members);
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update member status'
      });
    }
  };

  const handleStartChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await chaptersApi.createChapter({
        ...newChapterData,
        topics: newChapterData.topics.split(',').map(t => t.trim())
      });
      showNotification({
        type: 'success',
        title: 'Application Submitted',
        message: 'Chapter application submitted successfully!'
      });
      setShowStartChapterModal(false);
      setNewChapterData({ name: '', location: '', description: '', country: '', city: '', region: '', topics: '' });
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to submit application'
      });
    }
  };

  const handleApplyLeadership = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await chaptersApi.applyLeadership(leadershipData);
      showNotification({
        type: 'success',
        title: 'Application Submitted',
        message: 'Leadership application submitted successfully!'
      });
      setShowApplyLeadershipModal(false);
      setLeadershipData({ reason: '', experience: '' });
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to submit application'
      });
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedChapter) return;
    
    setIsSubmitting(true);
    try {
      const eventDate = new Date(newEventData.event_date);
      await chaptersApi.createEvent(managedChapter.chapter_id, {
        ...newEventData,
        event_date: eventDate.toISOString()
      });
      showNotification({
        type: 'success',
        title: 'Event Created',
        message: 'Event created successfully!'
      });
      setShowCreateEventModal(false);
      setNewEventData({
        title: '',
        description: '',
        event_date: '',
        duration_minutes: 60,
        location: '',
        is_online: false,
        meeting_link: ''
      });
      loadManageData(); // Refresh events
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create event'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedChapter) return;
    try {
      await chaptersApi.createResource(managedChapter.chapter_id, newResource);
      const res = await chaptersApi.getResources(managedChapter.chapter_id);
      setResources(res.data.resources);
      setShowCreateResourceModal(false);
      setNewResource({ title: '', type: 'link', url: '', description: '' });
      showNotification({
        type: 'success',
        title: 'Resource Added',
        message: 'Resource added successfully!'
      });
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create resource'
      });
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedChapter) return;
    try {
      await chaptersApi.createAnnouncement(managedChapter.chapter_id, newAnnouncement);
      const res = await chaptersApi.getAnnouncements(managedChapter.chapter_id);
      setAnnouncements(res.data.announcements);
      setShowCreateAnnouncementModal(false);
      setNewAnnouncement({ title: '', content: '', is_pinned: false });
      showNotification({
        type: 'success',
        title: 'Announcement Posted',
        message: 'Announcement posted successfully!'
      });
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create announcement'
      });
    }
  };

  const handleViewAttendance = async (eventId: number) => {
    setSelectedEventForAttendance(eventId);
    try {
      const res = await chaptersApi.getEventAttendance(eventId);
      setAttendance(res.data.attendance);
      setShowAttendanceModal(true);
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load attendance'
      });
    }
  };

  const handleMarkAttendance = async (userId: number, status: string) => {
    if (!selectedEventForAttendance) return;
    try {
      await chaptersApi.markAttendance(selectedEventForAttendance, userId, status);
      // Refresh attendance list
      const res = await chaptersApi.getEventAttendance(selectedEventForAttendance);
      setAttendance(res.data.attendance);
      showNotification({
        type: 'success',
        title: 'Attendance Marked',
        message: 'Attendance updated successfully'
      });
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to mark attendance'
      });
    }
  };


  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${brandColors.primaryHex}1A` }}>
                <Globe className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{t('chapters.header.title')}</h1>
                <p className="text-xs text-slate-500">{t('chapters.header.subtitle')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowStartChapterModal(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                style={{ backgroundColor: brandColors.primaryHex }}
              >
                <Plus className="h-4 w-4" />
                {t('chapters.actions.start')}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 mt-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('browse')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'browse'
                  ? 'border-indigo-900 text-indigo-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Search className="h-4 w-4" />
              {t('chapters.tabs.browse')}
            </button>
            <button
              onClick={() => setActiveTab('my-chapters')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'my-chapters'
                  ? 'border-indigo-900 text-indigo-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Home className="h-4 w-4" />
              {t('chapters.tabs.my')}
            </button>
            <button
              onClick={() => setActiveTab('manage')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'manage'
                  ? 'border-indigo-900 text-indigo-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Settings className="h-4 w-4" />
              {t('chapters.tabs.manage')}
            </button>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        {activeTab === 'browse' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">{t('chapters.browse.title')}</h2>
                <p className="text-slate-500 text-sm">{t('chapters.browse.subtitle')}</p>
              </div>
              <ChapterSelection
                onChapterSelected={(chapter) => {
                  console.log('Chapter selected:', chapter);
                }}
                showOnlyJoinable={true}
              />
            </div>
          </div>
          
        )}

        {activeTab === 'my-chapters' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {viewingChapter ? (
              <div className="space-y-6">
                <button 
                  onClick={() => setViewingChapter(null)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('chapters.my.back')}
                </button>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{viewingChapter.name || viewingChapter.chapter_name}</h2>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                    <MapPin className="h-4 w-4" />
                    <span>{viewingChapter.city}, {viewingChapter.country}</span>
                  </div>
                  <p className="text-slate-600">{viewingChapter.description}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Announcements Column */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Megaphone className="h-6 w-6 text-orange-600" />
                        </div>
                      <h3 className="text-lg font-semibold text-slate-900">{t('chapters.my.announcements')}</h3>
                    </div>
                      <div className="space-y-4">
                        {announcements.length === 0 ? (
                          <p className="text-slate-500 italic text-center py-4">{t('chapters.my.announcements_empty')}</p>
                        ) : (
                          announcements.map(announcement => (
                            <div key={announcement.id} className={`p-4 rounded-lg border ${announcement.is_pinned ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-slate-900">{announcement.title}</h4>
                                <span className="text-xs text-slate-500">
                                  {new Date(announcement.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 whitespace-pre-wrap">{announcement.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                 
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColors.primaryHex}1A` }}>
                          <Calendar className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">{t('chapters.my.events')}</h3>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {events.length === 0 ? (
                          <p className="text-slate-500 italic text-center py-4 col-span-full">{t('chapters.my.events_empty')}</p>
                        ) : (
                          events.map(event => (
                            <div key={event.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-slate-900">{event.title}</h4>
                                <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600">
                                  {new Date(event.event_date).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mb-3 line-clamp-2">{event.description}</p>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="flex items-center gap-1">
                                  {event.is_online ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                  {event.is_online ? 'Online' : event.location}
                                </div>
                              </div>
                              {event.is_online && event.meeting_link && (
                                <a 
                                  href={event.meeting_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="mt-3 block w-full text-center py-2 rounded-lg text-sm font-medium transition-colors"
                                  style={{ color: brandColors.primaryHex, backgroundColor: `${brandColors.primaryHex}14` }}
                                >
                                  Join Meeting
                                </a>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                  {/* Sidebar Column */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColors.primaryHex}1A` }}>
                          <FileText className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">Resources</h3>
                      </div>
                      <div className="space-y-3">
                        {resources.length === 0 ? (
                          <p className="text-sm text-slate-500 italic text-center py-4">No resources shared yet.</p>
                        ) : (
                          resources.map(resource => (
                            <div key={resource.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                              {resource.type === 'link' ? (
                                <LinkIcon className="h-5 w-5 text-slate-400 mt-0.5" />
                              ) : (
                                <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-900 hover:text-[#1e1b4b] truncate block">
                                  {resource.title}
                                </a>
                                {resource.description && (
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{resource.description}</p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              
            ) : (
              <>
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{t('chapters.my.title')}</h2>
                      <p className="text-slate-500 text-sm">{t('chapters.my.subtitle')}</p>
                    </div>
                  </div>
                  <ChapterSelection
                    showOnlyJoinable={false}
                    showOnlyMembership={true}
                    onChapterSelected={handleViewChapter}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="rounded-xl p-6 text-white shadow-lg" style={{ backgroundColor: brandColors.primaryHex }}>
                    <Award className="h-8 w-8 mb-4 opacity-80" />
                    <h3 className="text-lg font-bold mb-2">Chapter Leaderboard</h3>
                    <p className="text-green-50 text-sm mb-4">See how your chapter compares to others in engagement and learning.</p>
                    <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm">
                      View Rankings
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" style={{ color: brandColors.primaryHex }} />
                      About Membership
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brandColors.primaryHex }} />
                        <span>Join multiple chapters to connect across regions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brandColors.primaryHex }} />
                        <span>Set a <strong>Primary Chapter</strong> for personalized content</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brandColors.primaryHex }} />
                        <span>Participate in local events and discussions</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {manageLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: brandColors.primaryHex }}></div>
                <p className="mt-4 text-slate-500">{t('chapters.loading_manage', 'Loading chapter details...')}</p>
              </div>
            ) : !managedChapter ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-8 w-8 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{t('chapters.manage.title')}</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-8">
                  {t('chapters.manage.no_access')}
                </p>
                <button 
                  onClick={() => setShowApplyLeadershipModal(true)}
                  className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                  style={{ backgroundColor: brandColors.primaryHex }}
                >
                  {t('chapters.manage.apply')}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">{t('chapters.manage.leadership_title')}</h2>
                    <span className="text-xs text-slate-500">{t('chapters.manage.leadership_subtitle')}</span>
                  </div>
                  <div className="space-y-3">
                    {userChapters.length === 0 && (
                      <p className="text-sm text-slate-500">{t('chapters.manage.leadership_empty')}</p>
                    )}
                    {userChapters.map((uc) => (
                      <div key={uc.id} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">{uc.chapter_name || uc.name}</span>
                          <span className="text-xs text-slate-500">{uc.city ? `${uc.city}${uc.country ? ', ' + uc.country : ''}` : uc.country || ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                            {String(t(`chapters.role.${uc.role}`, uc.role))}
                          </span>
                          <span className={`px-2 py-1 rounded-full border font-medium ${
                            uc.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            uc.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {String(t(`chapters.status.${uc.status}`, uc.status))}
                          </span>
                          {uc.is_primary && (
                            <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              {t('chapters.primary')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Award Badge Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Award className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Award Achievement</h2>
                      <p className="text-sm text-slate-500">Recognize student accomplishments</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Select Student</label>
                      <select
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60]"
                        value={selectedMember || ''}
                        onChange={(e) => setSelectedMember(Number(e.target.value))}
                      >
                        <option value="">Choose a student...</option>
                        {members.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.first_name} {member.last_name} ({member.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Select Badge</label>
                      {badges.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No manual badges available.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {badges.map(badge => (
                            <button
                              key={badge.id}
                              onClick={() => setSelectedBadge(badge.id)}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                selectedBadge === badge.id
                                  ? 'border-[#27AE60] bg-[#27AE60]/5 ring-1 ring-[#27AE60]'
                                  : 'border-slate-200 hover:border-[#27AE60]/50'
                              }`}
                            >
                              <div className="font-medium text-slate-900 text-sm">{badge.name}</div>
                              <div className="text-xs text-slate-500">{badge.points} pts</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleAwardBadge}
                      disabled={!selectedMember || !selectedBadge}
                      className="w-full py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Award Badge
                    </button>
                  </div>
                </div>

                {/* Chapter Info Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Chapter Overview</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Total Members</span>
                      <span className="font-bold text-slate-900">{members.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Chapter Name</span>
                      <span className="font-bold text-slate-900">{managedChapter?.chapter_name || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Your Role</span>
                      <span className="font-bold text-[#27AE60] capitalize">{managedChapter?.role}</span>
                    </div>
                  </div>
                </div>

                {/* Member Management Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Member Management</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                          <th className="p-3">Member</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Joined</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {members.map(member => (
                          <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                                  {member.first_name?.[0]}{member.last_name?.[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{member.first_name} {member.last_name}</p>
                                  <p className="text-xs text-slate-500">{member.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="capitalize px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                                {member.role}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                member.status === 'pending' 
                                  ? 'bg-yellow-100 text-yellow-700' 
                                  : member.status === 'approved'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {member.status || 'approved'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">
                              {new Date(member.joined_at).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right">
                              {member.status === 'pending' && (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleUpdateMemberStatus(member.id, 'approved')}
                                    className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                    title="Approve"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateMemberStatus(member.id, 'rejected')}
                                    className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                    title="Reject"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {members.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">
                              No members found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Events Management Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#27AE60]/10 rounded-lg">
                        <Calendar className="h-6 w-6 text-[#27AE60]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{t('chapters.manage.events_title')}</h2>
                        <p className="text-sm text-slate-500">{t('chapters.manage.events_subtitle')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCreateEventModal(true)}
                      className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:shadow-sm transition-colors text-sm font-medium"
                      style={{ backgroundColor: brandColors.primaryHex }}
                    >
                      <Plus className="h-4 w-4" />
                      {t('chapters.manage.create_event')}
                    </button>
                  </div>

                  {events.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <Calendar className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-500">{t('chapters.manage.events_empty')}</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {events.map(event => (
                        <div key={event.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-slate-900">{event.title}</h3>
                            <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600">
                              {new Date(event.event_date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{event.description}</p>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="flex items-center gap-1">
                                {event.is_online ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                {event.is_online ? 'Online' : event.location}
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewAttendance(event.id)}
                              className="text-xs text-[#27AE60] hover:text-[#1e8449] font-medium flex items-center gap-1"
                            >
                              <ClipboardList className="h-3 w-3" />
                              {t('chapters.manage.attendance')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resources Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColors.primaryHex}1A` }}>
                        <FileText className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{t('chapters.my.resources')}</h2>
                        <p className="text-sm text-slate-500">{t('chapters.my.resources_subtitle')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCreateResourceModal(true)}
                      className="p-2"
                      style={{ color: brandColors.primaryHex }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${brandColors.primaryHex}1A`)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {resources.length === 0 ? (
                      <p className="text-sm text-slate-500 italic text-center py-4">{t('chapters.my.resources_empty')}</p>
                    ) : (
                      resources.map(resource => (
                        <div key={resource.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          {resource.type === 'link' ? (
                            <LinkIcon className="h-5 w-5 text-slate-400 mt-0.5" />
                          ) : (
                            <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-900 hover:text-[color:#1e1b4b] truncate block">
                              {resource.title}
                            </a>
                            {resource.description && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{resource.description}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Announcements Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Megaphone className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Announcements</h2>
                        <p className="text-sm text-slate-500">Updates & news</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCreateAnnouncementModal(true)}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {announcements.length === 0 ? (
                      <p className="text-sm text-slate-500 italic text-center py-4">No announcements yet.</p>
                    ) : (
                      announcements.map(announcement => (
                        <div key={announcement.id} className={`p-4 rounded-lg border ${announcement.is_pinned ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-slate-900">{announcement.title}</h3>
                            <span className="text-xs text-slate-500">
                              {new Date(announcement.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">{announcement.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
        {/* Start Chapter Modal */}
      {showStartChapterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {t('chapters.start.title', 'Start a New Chapter')}
              </h2>
              <button
                onClick={() => setShowStartChapterModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleStartChapter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('chapters.start.name_label', 'Chapter Name')}
                </label>
                <input type="text" required className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-900" value={newChapterData.name} onChange={(e) => setNewChapterData({ ...newChapterData, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('chapters.start.country_label', 'Country')}
                  </label>
                  <input type="text" required className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-900" value={newChapterData.country} onChange={(e) => setNewChapterData({ ...newChapterData, country: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('chapters.start.city_label', 'City')}
                  </label>
                  <input type="text" required className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-900" value={newChapterData.city} onChange={(e) => setNewChapterData({ ...newChapterData, city: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('chapters.start.description_label', 'Description')}
                </label>
                <textarea required className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-900 h-24" value={newChapterData.description} onChange={(e) => setNewChapterData({ ...newChapterData, description: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('chapters.start.topics_label', 'Topics (comma separated)')}
                </label>
                <input type="text" placeholder={t('chapters.start.topics_placeholder', 'e.g. Technology, Arts, Science')} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-900" value={newChapterData.topics} onChange={(e) => setNewChapterData({ ...newChapterData, topics: e.target.value })} />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowStartChapterModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all"
                  style={{ backgroundColor: brandColors.primaryHex }}
                >
                  {t('chapters.start.submit', 'Submit Application')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Leadership Modal */}
      {showApplyLeadershipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Apply for Leadership</h2>
              <button onClick={() => setShowApplyLeadershipModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleApplyLeadership} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Why do you want to be a leader?</label>
                <textarea
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] h-32"
                  value={leadershipData.reason}
                  onChange={e => setLeadershipData({...leadershipData, reason: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Relevant Experience</label>
                <textarea
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] h-32"
                  value={leadershipData.experience}
                  onChange={e => setLeadershipData({...leadershipData, experience: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowApplyLeadershipModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Create New Event</h2>
              <button 
                onClick={() => setShowCreateEventModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                  placeholder="e.g., Monthly Meetup"
                  value={newEventData.title}
                  onChange={e => setNewEventData({...newEventData, title: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                  placeholder="What will happen at this event?"
                  value={newEventData.description}
                  onChange={e => setNewEventData({...newEventData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                  value={newEventData.event_date}
                  onChange={e => setNewEventData({...newEventData, event_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                  value={newEventData.duration_minutes}
                  onChange={e => setNewEventData({...newEventData, duration_minutes: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="is_online"
                  className="rounded border-slate-300 text-[#27AE60] focus:ring-[#27AE60]"
                  checked={newEventData.is_online}
                  onChange={e => setNewEventData({...newEventData, is_online: e.target.checked})}
                />
                <label htmlFor="is_online" className="text-sm font-medium text-slate-700">This is an online event</label>
              </div>

              {newEventData.is_online ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Link</label>
                  <div className="relative">
                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="url"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                      placeholder="https://meet.google.com/..."
                      value={newEventData.meeting_link}
                      onChange={e => setNewEventData({...newEventData, meeting_link: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                      placeholder="Venue address"
                      value={newEventData.location}
                      onChange={e => setNewEventData({...newEventData, location: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#219150] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Event'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Resource Modal */}
      {showCreateResourceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Add Resource</h2>
              <button onClick={() => setShowCreateResourceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateResource} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                  value={newResource.title}
                  onChange={e => setNewResource({...newResource, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                  value={newResource.type}
                  onChange={e => setNewResource({...newResource, type: e.target.value})}
                >
                  <option value="link">Link / URL</option>
                  <option value="file">File (External URL)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL</label>
                <input
                  type="url"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                  placeholder="https://..."
                  value={newResource.url}
                  onChange={e => setNewResource({...newResource, url: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                  value={newResource.description}
                  onChange={e => setNewResource({...newResource, description: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateResourceModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#219150] transition-colors"
                >
                  Add Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Announcement Modal */}
      {showCreateAnnouncementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Post Announcement</h2>
              <button onClick={() => setShowCreateAnnouncementModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={newAnnouncement.title}
                  onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                <textarea
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={newAnnouncement.content}
                  onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_pinned"
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  checked={newAnnouncement.is_pinned}
                  onChange={e => setNewAnnouncement({...newAnnouncement, is_pinned: e.target.checked})}
                />
                <label htmlFor="is_pinned" className="text-sm font-medium text-slate-700">Pin to top</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateAnnouncementModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Post Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Event Attendance</h2>
              <button onClick={() => setShowAttendanceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: `${brandColors.primaryHex}1A` }}>
                <p className="text-sm" style={{ color: brandColors.primaryHex }}>
                  Mark attendance for members who joined this event.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {members.map(member => {
                  const record = attendance.find(a => a.user_id === member.id);
                  const status = record ? record.status : 'absent'; // Default to absent if not marked? Or null?
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                          {member.first_name[0]}{member.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{member.first_name} {member.last_name}</p>
                          <p className="text-xs text-slate-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkAttendance(member.id, 'present')}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            status === 'present' 
                              ? 'bg-green-100 text-green-700 ring-1 ring-green-600' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(member.id, 'absent')}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            status === 'absent' 
                              ? 'bg-red-100 text-red-700 ring-1 ring-red-600' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(member.id, 'excused')}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            status === 'excused' 
                              ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-600' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Excused
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChaptersPage;
