/**
 * FR7: Chapters Page
 * REQUIREMENT: Multi-city/chapter membership
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapPin, Search, Plus, Globe, Home, Settings, Award, Check, X, Calendar, Clock, Video, FileText, Megaphone, ClipboardList, Link as LinkIcon, Loader2, ArrowLeft } from 'lucide-react';
import ChapterSelection from '@/components/shared/chapters/ChapterSelection';
import { chaptersApi, type UserChapter } from '@/services/api/chapters';
import { achievementsApi, type Badge } from '@/services/api/achievements';
import { useNotification } from '@/context/NotificationContext';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const ChaptersPage: React.FC = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'browse' | 'my-chapters' | 'manage'>('browse');
  const [members, setMembers] = useState<any[]>([]);
  const [hasLoadedMembers, setHasLoadedMembers] = useState(false);
  const [userChapters, setUserChapters] = useState<UserChapter[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [isApplyingLeadership, setIsApplyingLeadership] = useState(false);
  const [isCreatingResource, setIsCreatingResource] = useState(false);
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [isAwardingBadge, setIsAwardingBadge] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);
  const [resources, setResources] = useState<any[]>([]);
  const [hasLoadedResources, setHasLoadedResources] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [hasLoadedAnnouncements, setHasLoadedAnnouncements] = useState(false);
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

  const loadChapterDetails = useCallback(async (chapterId: number) => {
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
  }, []);

  const handleViewChapter = useCallback(async (chapter: any) => {
    setViewingChapter(chapter);
    await loadChapterDetails(chapter.id || chapter.chapter_id);
  }, [loadChapterDetails]);

  const loadManageData = useCallback(async () => {
    setManageLoading(true);
    try {
      const userChaptersRes = await chaptersApi.getUserChapters();
      // Find a chapter where user is leader/admin
      const chapter = useMemo(() => userChaptersRes.data.chapters.find(
        (c: UserChapter) => ['admin', 'moderator', 'chapter_leader', 'teacher', 'chapter_admin'].includes(c.role)
      ), [userChaptersRes.data.chapters]);
      setUserChapters(userChaptersRes.data.chapters || []);

      if (chapter) {
        setManagedChapter(chapter);
        // Set managed chapter and load only lightweight data by default.
        // Large lists (members/events/resources/announcements) are loaded on demand.
        setMembers([]);
        setEvents([]);
        setResources([]);
        setAnnouncements([]);
        setHasLoadedMembers(false);
        setHasLoadedEvents(false);
        setHasLoadedResources(false);
        setHasLoadedAnnouncements(false);

        const badgesRes = await achievementsApi.getAvailableBadges();
        setBadges(badgesRes.data.badges.filter((b: Badge) => b.is_manual));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setManageLoading(false);
    }
  }, [chaptersApi, achievementsApi, setUserChapters, setManagedChapter, setMembers, setEvents, setResources, setAnnouncements, setHasLoadedMembers, setHasLoadedEvents, setHasLoadedResources, setHasLoadedAnnouncements, setBadges, setManageLoading]);

  // Lazy-load helpers
  const loadMembers = useCallback(async () => {
    if (!managedChapter || hasLoadedMembers) return;
    try {
      const membersRes = await chaptersApi.getMembers(managedChapter.chapter_id);
      setMembers(membersRes.data.members || []);
      setHasLoadedMembers(true);
    } catch (err) {
      console.error('Failed to load members', err);
      showNotification({ type: 'error', title: t('common.error'), message: t('chapters.manage.member_management.failed_to_load_members') });
    }
  }, [managedChapter, hasLoadedMembers, showNotification, t]);

  const loadEvents = useCallback(async () => {
    if (!managedChapter || hasLoadedEvents) return;
    try {
      const eventsRes = await chaptersApi.getEvents(managedChapter.chapter_id);
      setEvents(eventsRes.data.events || []);
      setHasLoadedEvents(true);
    } catch (err) {
      console.error('Failed to load events', err);
      showNotification({ type: 'error', title: t('common.error'), message: t('chapters.manage.events_management.failed_to_load_events') });
    }
  }, [managedChapter, hasLoadedEvents, showNotification, t]);

  const loadResources = useCallback(async () => {
    if (!managedChapter || hasLoadedResources) return;
    try {
      const resourcesRes = await chaptersApi.getResources(managedChapter.chapter_id);
      setResources(resourcesRes.data.resources || []);
      setHasLoadedResources(true);
    } catch (err) {
      console.error('Failed to load resources', err);
      showNotification({ type: 'error', title: t('common.error'), message: t('chapters.manage.resources_management.failed_to_load_resources') });
    }
  }, [managedChapter, hasLoadedResources, showNotification, t]);

  const loadAnnouncements = useCallback(async () => {
    if (!managedChapter || hasLoadedAnnouncements) return;
    try {
      const announcementsRes = await chaptersApi.getAnnouncements(managedChapter.chapter_id);
      setAnnouncements(announcementsRes.data.announcements || []);
      setHasLoadedAnnouncements(true);
    } catch (err) {
      console.error('Failed to load announcements', err);
      showNotification({ type: 'error', title: t('common.error'), message: t('chapters.manage.announcements_management.failed_to_load_announcements') });
    }
  }, [managedChapter, hasLoadedAnnouncements, showNotification, t]);

  const handleAwardBadge = useCallback(async () => {
    if (!selectedMember || !selectedBadge) return;
    setIsAwardingBadge(true);
    try {
      await achievementsApi.awardBadge(selectedMember, selectedBadge);
      showNotification({
        type: 'success',
        title: t('chapters.manage.award_achievement.badge_awarded_success_title'),
        message: t('chapters.manage.award_achievement.badge_awarded_success_message')
      });
      setSelectedMember(null);
      setSelectedBadge(null);
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: t('chapters.manage.award_achievement.badge_award_error_title'),
        message: t('chapters.manage.award_achievement.badge_award_error_message')
      });
    } finally {
      setIsAwardingBadge(false);
    }
  }, [selectedMember, selectedBadge, showNotification, t]);

  const handleUpdateMemberStatus = useCallback(async (userId: number, status: 'approved' | 'rejected') => {
    if (!managedChapter) return;
    try {
      await chaptersApi.updateMemberStatus(managedChapter.chapter_id, userId, status);
      showNotification({
        type: 'success',
        title: t('common.success'),
        message: t('chapters.manage.member_management.member_status_success', { status })
      });
      // Refresh members
      await loadMembers();
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: t('common.error'),
        message: t('chapters.manage.member_management.failed_to_update_member_status')
      });
    }
  }, [managedChapter, showNotification, loadMembers, t]);

  const handleStartChapter = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingChapter(true);
    try {
      await chaptersApi.createChapter({
        ...newChapterData,
        topics: newChapterData.topics.split(',').map(t => t.trim())
      });
      showNotification({
        type: 'success',
        title: t('chapters.start.application_submitted_title'),
        message: t('chapters.start.application_submitted_message')
      });
      setShowStartChapterModal(false);
      setNewChapterData({ name: '', location: '', description: '', country: '', city: '', region: '', topics: '' });
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: t('common.error'),
        message: t('chapters.start.failed_to_submit_application')
      });
    } finally {
      setIsCreatingChapter(false);
    }
  }, [newChapterData, showNotification, t]);

  const handleApplyLeadership = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsApplyingLeadership(true);
    try {
      await chaptersApi.applyLeadership(leadershipData);
      showNotification({
        type: 'success',
        title: t('chapters.manage.apply_leadership.application_submitted_title'),
        message: t('chapters.manage.apply_leadership.application_submitted_message')
      });
      setShowApplyLeadershipModal(false);
      setLeadershipData({ reason: '', experience: '' });
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: t('common.error'),
        message: t('chapters.manage.apply_leadership.failed_to_submit_application')
      });
    } finally {
      setIsApplyingLeadership(false);
    }
  }, [leadershipData, showNotification, t]);

  const handleCreateEvent = useCallback(async (e: React.FormEvent) => {
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
        title: t('chapters.manage.events_management.event_created_title'),
        message: t('chapters.manage.events_management.event_created_message')
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
      await loadEvents(); // Refresh events
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: t('common.error'),
        message: t('chapters.manage.events_management.failed_to_create_event')
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [managedChapter, newEventData, showNotification, loadEvents, t]);

  const handleCreateResource = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedChapter) return;
    setIsCreatingResource(true);
    try {
      await chaptersApi.createResource(managedChapter.chapter_id, newResource);
      const res = await chaptersApi.getResources(managedChapter.chapter_id);
      setResources(res.data.resources);
      setHasLoadedResources(true);
      setShowCreateResourceModal(false);
      setNewResource({ title: '', type: 'link', url: '', description: '' });
      showNotification({
        type: 'success',
        title: t('chapters.manage.resources_management.resource_added_title'),
        message: t('chapters.manage.resources_management.resource_added_message')
      });
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: t('common.error'),
        message: t('chapters.manage.resources_management.failed_to_add_resource')
      });
    } finally {
      setIsCreatingResource(false);
    }
  }, [managedChapter, newResource, showNotification, t]);

  const handleCreateAnnouncement = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedChapter) return;
    setIsCreatingAnnouncement(true);
    try {
      await chaptersApi.createAnnouncement(managedChapter.chapter_id, newAnnouncement);
      const res = await chaptersApi.getAnnouncements(managedChapter.chapter_id);
      setAnnouncements(res.data.announcements);
      setHasLoadedAnnouncements(true);
      setShowCreateAnnouncementModal(false);
      setNewAnnouncement({ title: '', content: '', is_pinned: false });
      showNotification({
        type: 'success',
        title: t('chapters.manage.announcements_management.announcement_posted_title'),
        message: t('chapters.manage.announcements_management.announcement_posted_message')
      });
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: t('common.error'),
        message: t('chapters.manage.announcements_management.failed_to_post_announcement')
      });
    } finally {
      setIsCreatingAnnouncement(false);
    }
  }, [managedChapter, newAnnouncement, showNotification, t]);

  const handleViewAttendance = useCallback(async (eventId: number) => {
    setSelectedEventForAttendance(eventId);
    try {
      // Ensure member list is loaded when viewing attendance
      await loadMembers();
      const res = await chaptersApi.getEventAttendance(eventId);
      setAttendance(res.data.attendance);
      setShowAttendanceModal(true);
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: t('common.error'),
        message: t('chapters.manage.attendance_modal.failed_to_load_attendance')
      });
    }
  }, [loadMembers, showNotification, t]);

  const handleMarkAttendance = useCallback(async (userId: number, status: string) => {
    if (!selectedEventForAttendance) return;
    try {
      await chaptersApi.markAttendance(selectedEventForAttendance, userId, status);
      // Refresh attendance list
      const res = await chaptersApi.getEventAttendance(selectedEventForAttendance);
      setAttendance(res.data.attendance);
      showNotification({
        type: 'success',
        title: t('chapters.manage.attendance_modal.attendance_marked_title'),
        message: t('chapters.manage.attendance_modal.attendance_marked_message')
      });
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: t('common.error'),
        message: t('chapters.manage.attendance_modal.failed_to_mark_attendance')
      });
    }
  }, [selectedEventForAttendance, showNotification, t]);


  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-brand-primary/10">
                <Globe className="h-6 w-6 text-brand-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{t('chapters.header.title')}</h1>
                <p className="text-xs text-slate-500">{t('chapters.header.subtitle')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowStartChapterModal(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium bg-brand-primary"
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
                  ? 'border-brand-primary text-brand-primary'
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
                  ? 'border-brand-primary text-brand-primary'
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
                  ? 'border-brand-primary text-brand-primary'
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
                onChapterSelected={handleViewChapter}
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
                        <div className="p-2 bg-brand-warning/10 rounded-lg">
                          <Megaphone className="h-6 w-6 text-brand-warning" />
                        </div>
                      <h3 className="text-lg font-semibold text-slate-900">{t('chapters.my.announcements')}</h3>
                    </div>
                      <div className="space-y-4">
                        {announcements.length === 0 ? (
                          <p className="text-slate-500 italic text-center py-4">{t('chapters.my.announcements_empty')}</p>
                        ) : (
                          announcements.map(announcement => (
                            <div key={announcement.id} className={`p-4 rounded-lg border ${announcement.is_pinned ? 'bg-brand-warning/5 border-brand-warning/20' : 'bg-white border-slate-200'}`}>
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
                        <div className="p-2 rounded-lg bg-brand-primary/10">
                          <Calendar className="h-6 w-6 text-brand-primary" />
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
                                  className="mt-3 block w-full text-center py-2 rounded-lg text-sm font-medium transition-colors bg-brand-primary text-white hover:bg-brand-primary-dark"
                                >
                                  {t('chapters.my.join_meeting')}
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
                        <div className="p-2 rounded-lg bg-brand-primary/10">
                          <FileText className="h-6 w-6 text-brand-primary" />
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
                                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-900 hover:text-brand-primary truncate block">
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
                  <div className="rounded-xl p-6 text-white shadow-lg bg-brand-primary">
                    <Award className="h-8 w-8 mb-4 opacity-80" />
                    <h3 className="text-lg font-bold mb-2">{t('chapters.my.leaderboard_title')}</h3>
                    <p className="text-green-50 text-sm mb-4">{t('chapters.my.leaderboard_subtitle')}</p>
                    <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm">
                      {t('chapters.my.view_rankings')}
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-brand-primary" />
                      {t('chapters.my.about_membership_title')}
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                        <span>{t('chapters.my.about_membership_1')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                        <span>{t('chapters.my.about_membership_2')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                        <span>{t('chapters.my.about_membership_3')}</span>
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
                <LoadingSpinner message={t('chapters.loading_manage')} />
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
                  className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all font-medium bg-brand-primary"
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
                          <span className="px-2 py-1 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/20 capitalize">
                            {String(t(`chapters.role.${uc.role}`, uc.role))}
                          </span>
                          <span className={`px-2 py-1 rounded-full border font-medium ${
                            uc.status === 'approved' ? 'bg-brand-success/10 text-brand-success border-brand-success/20' :
                            uc.status === 'pending' ? 'bg-brand-warning/10 text-brand-warning border-brand-warning/20' :
                            'bg-brand-danger/10 text-brand-danger border-brand-danger/20'
                          }`}>
                            {String(t(`chapters.status.${uc.status}`, uc.status))}
                          </span>
                          {uc.is_primary && (
                            <span className="px-2 py-1 rounded-full bg-brand-primary/10 text-brand-primary border-brand-primary/20">
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
                    <div className="p-2 bg-brand-warning/10 rounded-lg">
                      <Award className="h-6 w-6 text-brand-warning" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{t('chapters.manage.award_achievement.title')}</h2>
                      <p className="text-sm text-slate-500">{t('chapters.manage.award_achievement.subtitle')}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.award_achievement.select_student')}</label>
                      <select
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success"
                        value={selectedMember || ''}
                        onChange={(e) => setSelectedMember(Number(e.target.value))}
                      >
                        <option value="">{t('chapters.manage.award_achievement.choose_student_placeholder')}</option>
                        {members.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.first_name} {member.last_name} ({member.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.award_achievement.select_badge')}</label>
                      {badges.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">{t('chapters.manage.award_achievement.no_manual_badges')}</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {badges.map(badge => (
                            <button
                              key={badge.id}
                              onClick={() => setSelectedBadge(badge.id)}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                selectedBadge === badge.id
                                  ? 'border-brand-success bg-brand-success/5 ring-1 ring-brand-success'
                                  : 'border-slate-200 hover:border-brand-success/50'
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
                          disabled={!selectedMember || !selectedBadge || isAwardingBadge}
                          className="w-full py-2 bg-gradient-to-r from-brand-success to-brand-success-dark text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2"
                        >
                          {isAwardingBadge ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t('chapters.manage.award_achievement.awarding')}
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              {t('chapters.manage.award_achievement.award_badge_btn')}
                            </>
                          )}
                        </button>
                  </div>
                </div>

                {/* Chapter Info Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('chapters.manage.chapter_overview.title')}</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">{t('chapters.manage.chapter_overview.total_members')}</span>
                      <span className="font-bold text-slate-900">{members.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">{t('chapters.manage.chapter_overview.chapter_name')}</span>
                      <span className="font-bold text-slate-900">{managedChapter?.chapter_name || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">{t('chapters.manage.chapter_overview.your_role')}</span>
                      <span className="font-bold text-brand-success capitalize">{managedChapter?.role}</span>
                    </div>
                  </div>
                </div>

                {/* Member Management Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('chapters.manage.member_management.title')}</h2>
                  <div className="overflow-x-auto">
                    {hasLoadedMembers ? (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                          <tr>
                            <th className="p-3">{t('chapters.manage.member_management.member')}</th>
                            <th className="p-3">{t('chapters.manage.member_management.role')}</th>
                            <th className="p-3">{t('chapters.manage.member_management.status')}</th>
                            <th className="p-3">{t('chapters.manage.member_management.joined')}</th>
                            <th className="p-3 text-right">{t('chapters.manage.member_management.actions')}</th>
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
                                    ? 'bg-brand-warning/10 text-brand-warning' 
                                    : member.status === 'approved'
                                    ? 'bg-brand-success/10 text-brand-success'
                                    : 'bg-brand-danger/10 text-brand-danger'
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
                                      className="p-1.5 bg-brand-success/10 text-brand-success rounded hover:bg-brand-success/20 transition-colors"
                                      title={t('chapters.manage.member_management.approve')}
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleUpdateMemberStatus(member.id, 'rejected')}
                                      className="p-1.5 bg-brand-danger/10 text-brand-danger rounded hover:bg-brand-danger/20 transition-colors"
                                      title={t('chapters.manage.member_management.reject')}
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
                                {t('chapters.manage.member_management.no_members_found')}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8">
                        <LoadingSpinner message={t('chapters.manage.member_management.members_not_loaded')} />
                        <div className="flex justify-center mt-4">
                          <button
                            onClick={loadMembers}
                            className="px-4 py-2 bg-brand-success text-white rounded-lg hover:bg-brand-success-dark transition-colors flex items-center gap-2"
                          >
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('chapters.manage.member_management.load_members')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Events Management Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-success/10 rounded-lg">
                        <Calendar className="h-6 w-6 text-brand-success" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{t('chapters.manage.events_management.events_title')}</h2>
                        <p className="text-sm text-slate-500">{t('chapters.manage.events_management.events_subtitle')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCreateEventModal(true)}
                      className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:shadow-sm transition-colors text-sm font-medium bg-brand-primary"
                    >
                      <Plus className="h-4 w-4" />
                      {t('chapters.manage.events_management.create_event')}
                    </button>
                  </div>

                  {!hasLoadedEvents ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <LoadingSpinner message={t('chapters.manage.events_management.events_not_loaded')} />
                      <div className="flex justify-center mt-4">
                        <button
                          onClick={loadEvents}
                          className="px-4 py-2 bg-brand-success text-white rounded-lg hover:bg-brand-success-dark transition-colors flex items-center gap-2"
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('chapters.manage.events_management.load_events')}
                        </button>
                      </div>
                    </div>
                  ) : events.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <Calendar className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-500">{t('chapters.manage.events_management.events_empty')}</p>
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
                              className="text-xs text-brand-success hover:text-brand-success-dark font-medium flex items-center gap-1"
                            >
                              <ClipboardList className="h-3 w-3" />
                              {t('chapters.manage.events_management.attendance')}
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
                      <div className="p-2 rounded-lg bg-brand-primary/10">
                        <FileText className="h-6 w-6 text-brand-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{t('chapters.manage.resources_management.title')}</h2>
                        <p className="text-sm text-slate-500">{t('chapters.manage.resources_management.subtitle')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCreateResourceModal(true)}
                      className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {!hasLoadedResources ? (
                      <div className="text-center py-8">
                        <LoadingSpinner message={t('chapters.manage.resources_management.resources_not_loaded')} />
                        <div className="flex justify-center mt-4">
                          <button
                            onClick={loadResources}
                            className="px-4 py-2 bg-brand-success text-white rounded-lg hover:bg-brand-success-dark transition-colors flex items-center gap-2"
                          >
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('chapters.manage.resources_management.load_resources')}
                          </button>
                        </div>
                      </div>
                    ) : resources.length === 0 ? (
                      <p className="text-sm text-slate-500 italic text-center py-4">{t('chapters.manage.resources_management.no_resources_shared')}</p>
                    ) : (
                      resources.map(resource => (
                        <div key={resource.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          {resource.type === 'link' ? (
                            <LinkIcon className="h-5 w-5 text-slate-400 mt-0.5" />
                          ) : (
                            <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-900 hover:text-brand-primary truncate block">
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
                      <div className="p-2 bg-brand-warning/10 rounded-lg">
                        <Megaphone className="h-6 w-6 text-brand-warning" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{t('chapters.manage.announcements_management.title')}</h2>
                        <p className="text-sm text-slate-500">{t('chapters.manage.announcements_management.subtitle')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCreateAnnouncementModal(true)}
                      className="p-2 text-brand-warning hover:bg-brand-warning/10 rounded-lg transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {!hasLoadedAnnouncements ? (
                      <div className="text-center py-8">
                        <LoadingSpinner message={t('chapters.manage.announcements_management.announcements_not_loaded')} />
                        <div className="flex justify-center mt-4">
                          <button
                            onClick={loadAnnouncements}
                            className="px-4 py-2 bg-brand-success text-white rounded-lg hover:bg-brand-success-dark transition-colors flex items-center gap-2"
                          >
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('chapters.manage.announcements_management.load_announcements')}
                          </button>
                        </div>
                      </div>
                    ) : announcements.length === 0 ? (
                      <p className="text-sm text-slate-500 italic text-center py-4">{t('chapters.manage.announcements_management.no_announcements_yet')}</p>
                    ) : (
                      announcements.map(announcement => (
                        <div key={announcement.id} className={`p-4 rounded-lg border ${announcement.is_pinned ? 'bg-brand-warning/5 border-brand-warning/20' : 'bg-white border-slate-200'}`}>
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
                {t('chapters.start.title')}
              </h2>
              <button
                onClick={() => setShowStartChapterModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleStartChapter} className="space-y-6">
              <div>
                <label htmlFor="new-chapter-name" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('chapters.start.name_label')}
                </label>
                <input 
                  type="text" 
                  id="new-chapter-name"
                  required 
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                  value={newChapterData.name} 
                  onChange={(e) => setNewChapterData({ ...newChapterData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="new-chapter-country" className="block text-sm font-medium text-slate-700 mb-1">
                    {t('chapters.start.country_label')}
                  </label>
                  <input 
                    type="text" 
                    id="new-chapter-country"
                    required 
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                    value={newChapterData.country} 
                    onChange={(e) => setNewChapterData({ ...newChapterData, country: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="new-chapter-city" className="block text-sm font-medium text-slate-700 mb-1">
                    {t('chapters.start.city_label')}
                  </label>
                  <input 
                    type="text" 
                    id="new-chapter-city"
                    required 
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                    value={newChapterData.city} 
                    onChange={(e) => setNewChapterData({ ...newChapterData, city: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-chapter-description" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('chapters.start.description_label')}
                </label>
                <textarea 
                  id="new-chapter-description"
                  required 
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary h-24 transition-all"
                  value={newChapterData.description} 
                  onChange={(e) => setNewChapterData({ ...newChapterData, description: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="new-chapter-topics" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('chapters.start.topics_label')}
                </label>
                <input 
                  type="text" 
                  id="new-chapter-topics"
                  placeholder={t('chapters.start.topics_placeholder')} 
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                  value={newChapterData.topics} 
                  onChange={(e) => setNewChapterData({ ...newChapterData, topics: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowStartChapterModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingChapter}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center font-medium"
                >
                  {isCreatingChapter ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('chapters.start.submitting')}
                    </>
                  ) : (
                    t('chapters.start.submit')
                  )}
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
              <h2 className="text-xl font-bold text-slate-900">{t('chapters.manage.apply_leadership.title')}</h2>
              <button onClick={() => setShowApplyLeadershipModal(false)} className="text-slate-400 hover:text-slate-600" aria-label={t('common.close_modal')}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleApplyLeadership} className="space-y-6">
              <div>
                <label htmlFor="leadership-reason" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.apply_leadership.reason_label')}</label>
                <textarea
                  id="leadership-reason"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success focus:border-brand-success h-32 transition-all"
                  value={leadershipData.reason}
                  onChange={e => setLeadershipData({...leadershipData, reason: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="leadership-experience" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.apply_leadership.experience_label')}</label>
                <textarea
                  id="leadership-experience"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success focus:border-brand-success h-32 transition-all"
                  value={leadershipData.experience}
                  onChange={e => setLeadershipData({...leadershipData, experience: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowApplyLeadershipModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isApplyingLeadership}
                  className="px-4 py-2 bg-brand-success text-white rounded-lg hover:bg-brand-success-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center font-medium"
                >
                  {isApplyingLeadership ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('chapters.manage.apply_leadership.submitting')}
                    </>
                  ) : (
                    t('chapters.manage.apply_leadership.submit_btn')
                  )}
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
              <h2 className="text-xl font-bold text-slate-900">{t('chapters.manage.events_management.create_new_event')}</h2>
              <button 
                onClick={() => setShowCreateEventModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div>
                <label htmlFor="event-title" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.events_management.event_title')}</label>
                <input
                  type="text"
                  id="event-title"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success focus:border-brand-success transition-all"
                  placeholder={t('chapters.manage.events_management.event_title_placeholder')}
                  value={newEventData.title}
                  onChange={e => setNewEventData({...newEventData, title: e.target.value})}
                />
              </div>

              <div>
                <label htmlFor="event-description" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.events_management.event_description')}</label>
                <textarea
                  id="event-description"
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success focus:border-brand-success h-24 transition-all"
                  placeholder={t('chapters.manage.events_management.event_description_placeholder')}
                  value={newEventData.description}
                  onChange={e => setNewEventData({...newEventData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-date" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.events_management.event_date_time')}</label>
                  <input
                    type="datetime-local"
                    id="event-date"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success focus:border-brand-success transition-all"
                  value={newEventData.event_date}
                  onChange={e => setNewEventData({...newEventData, event_date: e.target.value})}
                  />
                </div>
                <div>
                  <label htmlFor="event-duration" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.events_management.event_duration')}</label>
                  <input
                    type="number"
                    id="event-duration"
                    min="15"
                    step="15"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success focus:border-brand-success transition-all"
                  value={newEventData.duration_minutes}
                  onChange={e => setNewEventData({...newEventData, duration_minutes: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="is_online"
                  className="rounded border-slate-300 text-brand-success focus:ring-brand-success transition-all"
                  checked={newEventData.is_online}
                  onChange={e => setNewEventData({...newEventData, is_online: e.target.checked})}
                />
                <label htmlFor="is_online" className="text-sm font-medium text-slate-700">{t('chapters.manage.events_management.event_online')}</label>
              </div>

              {newEventData.is_online ? (
                <div>
                  <label htmlFor="meeting-link" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.events_management.event_meeting_link')}</label>
                  <div className="relative">
                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="url"
                      id="meeting-link"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success focus:border-brand-success transition-all"
                      placeholder="https://meet.google.com/..."
                      value={newEventData.meeting_link}
                      onChange={e => setNewEventData({...newEventData, meeting_link: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="event-location" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.events_management.event_location')}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      id="event-location"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success focus:border-brand-success transition-all"
                      placeholder={t('chapters.manage.events_management.event_location_placeholder')}
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
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2 justify-center font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('chapters.manage.events_management.creating_event')}
                    </>
                  ) : (
                    t('chapters.manage.events_management.create_event_btn')
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
              <h2 className="text-xl font-bold text-slate-900">{t('chapters.manage.resources_management.add_resource')}</h2>
              <button onClick={() => setShowCreateResourceModal(false)} className="text-slate-400 hover:text-slate-600" aria-label={t('common.close_modal')}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateResource} className="space-y-6">
              <div>
                <label htmlFor="resource-title" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.resources_management.resource_title')}</label>
                <input
                  type="text"
                  id="resource-title"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success focus:border-brand-success transition-all"
                  value={newResource.title}
                  onChange={e => setNewResource({...newResource, title: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="resource-type" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.resources_management.resource_type')}</label>
                <select
                  id="resource-type"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success focus:border-brand-success transition-all"
                  value={newResource.type}
                  onChange={e => setNewResource({...newResource, type: e.target.value})}
                >
                  <option value="link">{t('chapters.manage.resources_management.resource_link_type')}</option>
                  <option value="file">{t('chapters.manage.resources_management.resource_file_type')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="resource-url" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.resources_management.resource_url')}</label>
                <input
                  type="url"
                  id="resource-url"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success focus:border-brand-success transition-all"
                  placeholder="https://..."
                  value={newResource.url}
                  onChange={e => setNewResource({...newResource, url: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="resource-description" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.resources_management.resource_description')}</label>
                <textarea
                  id="resource-description"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-success focus:border-brand-success h-24 transition-all"
                  value={newResource.description}
                  onChange={e => setNewResource({...newResource, description: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateResourceModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingResource}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center font-medium"
                >
                  {isCreatingResource ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('chapters.manage.resources_management.adding_resource')}
                    </>
                  ) : (
                    t('chapters.manage.resources_management.add_resource_btn')
                  )}
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
              <h2 className="text-xl font-bold text-slate-900">{t('chapters.manage.announcements_management.post_announcement')}</h2>
              <button onClick={() => setShowCreateAnnouncementModal(false)} className="text-slate-400 hover:text-slate-600" aria-label={t('common.close_modal')}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateAnnouncement} className="space-y-6">
              <div>
                <label htmlFor="announcement-title" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.announcements_management.announcement_title')}</label>
                <input
                  type="text"
                  id="announcement-title"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-warning focus:border-brand-warning transition-all"
                  value={newAnnouncement.title}
                  onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="announcement-content" className="block text-sm font-medium text-slate-700 mb-1">{t('chapters.manage.announcements_management.announcement_content')}</label>
                <textarea
                  id="announcement-content"
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-warning focus:border-brand-warning h-32 transition-all"
                  value={newAnnouncement.content}
                  onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_pinned"
                  className="rounded border-slate-300 text-brand-warning focus:ring-brand-warning transition-all"
                  checked={newAnnouncement.is_pinned}
                  onChange={e => setNewAnnouncement({...newAnnouncement, is_pinned: e.target.checked})}
                />
                <label htmlFor="is_pinned" className="text-sm font-medium text-slate-700">{t('chapters.manage.announcements_management.announcement_pin_to_top')}</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateAnnouncementModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAnnouncement}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center font-medium"
                >
                  {isCreatingAnnouncement ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('chapters.manage.announcements_management.posting_announcement')}
                    </>
                  ) : (
                    t('chapters.manage.announcements_management.post_announcement_btn')
                  )}
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
              <h2 className="text-xl font-bold text-slate-900">{t('chapters.manage.attendance_modal.title')}</h2>
              <button onClick={() => setShowAttendanceModal(false)} className="text-slate-400 hover:text-slate-600" aria-label={t('common.close_modal')}>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg mb-4 bg-brand-primary/10">
                <p className="text-sm text-brand-primary">
                  {t('chapters.manage.attendance_modal.message')}
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {members.length === 0 ? (
                  <div className="text-center py-4 text-slate-500">
                    {t('chapters.manage.member_management.no_members_found')}
                  </div>
                ) : (
                  members.map(member => {
                    const record = attendance.find(a => a.user_id === member.id);
                    const status = record ? record.status : 'absent'; // Default to absent if not marked? Or null?
                    
                    return (
                      <div key={member.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                            {member.first_name?.[0]}{member.last_name?.[0]}
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
                                ? 'bg-brand-success/10 text-brand-success ring-1 ring-brand-success' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            aria-label={t('chapters.manage.attendance_modal.present')}
                          >
                            {t('chapters.manage.attendance_modal.present')}
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(member.id, 'absent')}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              status === 'absent' 
                                ? 'bg-brand-danger/10 text-brand-danger ring-1 ring-brand-danger' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            aria-label={t('chapters.manage.attendance_modal.absent')}
                          >
                            {t('chapters.manage.attendance_modal.absent')}
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(member.id, 'excused')}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              status === 'excused' 
                                ? 'bg-brand-warning/10 text-brand-warning ring-1 ring-brand-warning' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            aria-label={t('chapters.manage.attendance_modal.excused')}
                          >
                            {t('chapters.manage.attendance_modal.excused')}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChaptersPage;
