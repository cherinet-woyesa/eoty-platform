import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
    Users, Plus, X, Loader2,
    Shield, RefreshCw, TrendingUp, ClipboardList,
    Globe, BookOpen, Settings
} from 'lucide-react';
import { chaptersApi } from '@/services/api/chapters';
import { achievementsApi } from '@/services/api/achievements';
import { useNotification } from '@/context/NotificationContext';
import ChapterSelection from '@/components/shared/chapters/ChapterSelection';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { brandColors } from '@/theme/brand';

// New Sub-components - Imported
import QuickStats from '@/components/shared/chapters/QuickStats';
import ChapterMemberManagement from '@/components/shared/chapters/management/ChapterMemberManagement';
import ChapterEventManagement from '@/components/shared/chapters/management/ChapterEventManagement';
import ChapterResourceManagement from '@/components/shared/chapters/management/ChapterResourceManagement';
import ChapterAnnouncementManagement from '@/components/shared/chapters/management/ChapterAnnouncementManagement';
import BadgeAwarding from '@/components/shared/chapters/management/BadgeAwarding';

const ChaptersPage: React.FC = () => {
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();

    // Tab State synced with URL
    const activeTab = (searchParams.get('tab') as 'browse' | 'my-chapters' | 'manage') || 'browse';
    const setActiveTab = React.useCallback((tab: string) => setSearchParams({ tab }), [setSearchParams]);

    const handleChapterSelected = React.useCallback(() => setActiveTab('my-chapters'), [setActiveTab]);

    // Local UI State
    const [showStartChapterModal, setShowStartChapterModal] = useState(false);
    const [showApplyLeadershipModal, setShowApplyLeadershipModal] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [showCreateResourceModal, setShowCreateResourceModal] = useState(false);
    const [showCreateAnnouncementModal, setShowCreateAnnouncementModal] = useState(false);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);

    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [selectedBadgeId, setSelectedBadgeId] = useState<number | null>(null);
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

    // Form states
    const [newChapterData, setNewChapterData] = useState({ name: '', country: '', city: '', description: '', topics: '' });
    const [leadershipData, setLeadershipData] = useState({ reason: '', experience: '' });
    const [newEventData, setNewEventData] = useState({ title: '', description: '', event_date: '', duration_minutes: 60, is_online: false, location: '', meeting_link: '' });
    const [newResource, setNewResource] = useState({ title: '', url: '', description: '' });
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', is_pinned: false });

    // --- Queries ---
    const { data: managedChapter, isLoading: isLoadingManaged } = useQuery({
        queryKey: ['managed-chapter'],
        queryFn: chaptersApi.getManagedChapter,
        retry: false
    });

    const { data: membersData, isLoading: isLoadingMembers } = useQuery({
        queryKey: ['chapter-members', managedChapter?.id],
        queryFn: () => chaptersApi.getChapterMembers(managedChapter.id),
        enabled: !!managedChapter && activeTab === 'manage'
    });

    const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
        queryKey: ['chapter-events', managedChapter?.id],
        queryFn: () => chaptersApi.getChapterEvents(managedChapter.id),
        enabled: !!managedChapter && activeTab === 'manage'
    });

    const { data: resourcesData, isLoading: isLoadingResources } = useQuery({
        queryKey: ['chapter-resources', managedChapter?.id],
        queryFn: () => chaptersApi.getChapterResources(managedChapter.id),
        enabled: !!managedChapter && activeTab === 'manage'
    });

    const { data: announcementsData, isLoading: isLoadingAnnouncements } = useQuery({
        queryKey: ['chapter-announcements', managedChapter?.id],
        queryFn: () => chaptersApi.getChapterAnnouncements(managedChapter.id),
        enabled: !!managedChapter && activeTab === 'manage'
    });

    const { data: badgesData } = useQuery({
        queryKey: ['available-badges'],
        queryFn: achievementsApi.getAllBadges,
        enabled: !!managedChapter && activeTab === 'manage'
    });

    const { data: attendanceData, isLoading: isLoadingAttendance } = useQuery({
        queryKey: ['event-attendance', selectedEventId],
        queryFn: () => chaptersApi.getEventAttendance(managedChapter.id, selectedEventId!),
        enabled: !!managedChapter && !!selectedEventId && showAttendanceModal
    });

    // --- Mutations ---
    const startChapterMutation = useMutation({
        mutationFn: chaptersApi.createChapter,
        onSuccess: () => {
            showNotification('success', t('chapters.start.success_msg'));
            setShowStartChapterModal(false);
            queryClient.invalidateQueries({ queryKey: ['managed-chapter'] });
            setActiveTab('manage');
        },
        onError: () => showNotification('error', t('chapters.start.error_msg'))
    });

    const applyLeadershipMutation = useMutation({
        mutationFn: (data: any) => chaptersApi.applyForLeadership(managedChapter.id, data),
        onSuccess: () => {
            showNotification('success', t('chapters.manage.apply_leadership.success_msg'));
            setShowApplyLeadershipModal(false);
        },
        onError: () => showNotification('error', t('chapters.manage.apply_leadership.error_msg'))
    });

    const createEventMutation = useMutation({
        mutationFn: (data: any) => chaptersApi.createEvent(managedChapter.id, data),
        onSuccess: () => {
            showNotification('success', t('chapters.manage.events_management.success_msg'));
            setShowCreateEventModal(false);
            queryClient.invalidateQueries({ queryKey: ['chapter-events'] });
        },
        onError: () => showNotification('error', t('chapters.manage.events_management.error_msg'))
    });

    const createResourceMutation = useMutation({
        mutationFn: (data: any) => chaptersApi.createResource(managedChapter.id, data),
        onSuccess: () => {
            showNotification('success', t('chapters.manage.resources_management.success_msg'));
            setShowCreateResourceModal(false);
            queryClient.invalidateQueries({ queryKey: ['chapter-resources'] });
        },
        onError: () => showNotification('error', t('chapters.manage.resources_management.error_msg'))
    });

    const createAnnouncementMutation = useMutation({
        mutationFn: (data: any) => chaptersApi.createAnnouncement(managedChapter.id, data),
        onSuccess: () => {
            showNotification('success', t('chapters.manage.announcements_management.success_msg'));
            setShowCreateAnnouncementModal(false);
            queryClient.invalidateQueries({ queryKey: ['chapter-announcements'] });
        },
        onError: () => showNotification('error', t('chapters.manage.announcements_management.error_msg'))
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ userId, status }: { userId: number, status: string }) =>
            chaptersApi.updateMemberStatus(managedChapter.id, userId, status),
        onSuccess: () => {
            showNotification('success', t('chapters.manage.member_management.update_success'));
            queryClient.invalidateQueries({ queryKey: ['chapter-members'] });
        }
    });

    const markAttendanceMutation = useMutation({
        mutationFn: ({ userId, status }: { userId: number, status: string }) =>
            chaptersApi.markAttendance(managedChapter.id, selectedEventId!, userId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-attendance', selectedEventId] });
        }
    });

    const awardBadgeMutation = useMutation({
        mutationFn: () => achievementsApi.awardBadge(selectedMemberId!, selectedBadgeId!),
        onSuccess: () => {
            showNotification('success', 'Badge awarded successfully');
            setSelectedBadgeId(null);
            setSelectedMemberId(null);
        },
        onError: () => showNotification('error', 'Failed to award badge')
    });

    // --- Handlers ---
    const handleStartChapter = (e: React.FormEvent) => {
        e.preventDefault();
        startChapterMutation.mutate(newChapterData);
    };

    const handleApplyLeadership = (e: React.FormEvent) => {
        e.preventDefault();
        applyLeadershipMutation.mutate(leadershipData);
    };

    const handleCreateEvent = (e: React.FormEvent) => {
        e.preventDefault();
        createEventMutation.mutate(newEventData);
    };

    const handleCreateResource = (e: React.FormEvent) => {
        e.preventDefault();
        createResourceMutation.mutate(newResource);
    };

    const handleCreateAnnouncement = (e: React.FormEvent) => {
        e.preventDefault();
        createAnnouncementMutation.mutate(newAnnouncement);
    };

    const handleViewAttendance = (eventId: number) => {
        setSelectedEventId(eventId);
        setShowAttendanceModal(true);
    };

    const handleMarkAttendance = (userId: number, status: string) => {
        if (selectedEventId) {
            markAttendanceMutation.mutate({ userId, status });
        }
    };

    const pendingRequestsCount = useMemo(() => {
        return membersData?.data?.members?.filter((m: any) => m.status === 'pending').length || 0;
    }, [membersData]);

    return (
        <div className="w-full h-full">
            <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="mb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-stone-800 mb-1.5 flex items-center gap-2">
                            <Shield className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
                            {t('chapters.title')}
                        </h1>
                        <p className="text-stone-600 text-sm">{t('chapters.description')}</p>
                    </div>
                    <button
                        onClick={() => setShowStartChapterModal(true)}
                        className="inline-flex items-center justify-center px-4 py-2 bg-brand-primary text-white rounded-lg shadow-sm hover:bg-brand-primary/90 transition-all text-sm font-medium gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        {t('chapters.browse.start_chapter_btn')}
                    </button>
                </div>

                {/* Tabs Container */}
                <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
                    {/* Tab Navigation */}
                    <nav className="flex border-b border-stone-200 flex-shrink-0 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('browse')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                                activeTab === 'browse'
                                    ? 'bg-stone-50'
                                    : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
                            }`}
                            style={{
                                borderColor: activeTab === 'browse' ? brandColors.primaryHex : 'transparent',
                                color: activeTab === 'browse' ? brandColors.primaryHex : undefined
                            }}
                        >
                            <Globe className="h-4 w-4" />
                            <span>{t('chapters.tabs.browse', 'Browse Chapters')}</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('my-chapters')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                                activeTab === 'my-chapters'
                                    ? 'bg-stone-50'
                                    : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
                            }`}
                            style={{
                                borderColor: activeTab === 'my-chapters' ? brandColors.primaryHex : 'transparent',
                                color: activeTab === 'my-chapters' ? brandColors.primaryHex : undefined
                            }}
                        >
                            <BookOpen className="h-4 w-4" />
                            <span>{t('chapters.tabs.my_chapters', 'My Chapters')}</span>
                        </button>

                        {managedChapter && (
                            <button
                                onClick={() => setActiveTab('manage')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                                    activeTab === 'manage'
                                        ? 'bg-stone-50'
                                        : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
                                }`}
                                style={{
                                    borderColor: activeTab === 'manage' ? brandColors.primaryHex : 'transparent',
                                    color: activeTab === 'manage' ? brandColors.primaryHex : undefined
                                }}
                            >
                                <Settings className="h-4 w-4" />
                                <span>{t('chapters.tabs.manage', 'Manage Chapter')}</span>
                            </button>
                        )}
                    </nav>

                    {/* Tab Content */}
                    <div className="bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex-1 overflow-y-auto p-4 sm:p-6">
                        {activeTab === 'manage' && managedChapter && (
                            <div className="mb-6">
                                <QuickStats
                                    memberCount={membersData?.data?.members?.length || 0}
                                    eventCount={eventsData?.data?.events?.length || 0}
                                    badgeCount={badgesData?.length || 0}
                                    pendingRequests={pendingRequestsCount}
                                />
                            </div>
                        )}

                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {activeTab === 'browse' && (
                                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 transition-all">
                                    <ChapterSelection onChapterSelected={handleChapterSelected} />
                                </div>
                            )}

                            {activeTab === 'my-chapters' && (
                                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 transition-all">
                                    <ChapterSelection showOnlyMembership={true} />
                                </div>
                            )}

                            {activeTab === 'manage' && (
                                <div className="space-y-8">
                                    {!managedChapter ? (
                                        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-10 text-center max-w-2xl mx-auto">
                                            <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Shield className="h-10 w-10 text-brand-primary" />
                                            </div>
                                            <h2 className="text-2xl font-bold text-stone-900 mb-3">{t('chapters.manage.no_chapter.title')}</h2>
                                            <p className="text-stone-500 mb-8 leading-relaxed">{t('chapters.manage.no_chapter.subtitle')}</p>
                                            <button
                                                onClick={() => setShowApplyLeadershipModal(true)}
                                                className="w-full sm:w-auto px-6 py-2.5 bg-brand-primary text-white rounded-lg shadow-sm hover:bg-brand-primary/90 transition-all font-medium"
                                            >
                                                {t('chapters.manage.apply_leadership_btn')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            {/* Left Column: Management Sections */}
                                            <div className="lg:col-span-2 space-y-8">
                                                <section>
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Users className="h-5 w-5 text-stone-400" />
                                                        <h2 className="text-lg font-bold text-stone-900">{t('chapters.manage.member_management.title')}</h2>
                                                        {pendingRequestsCount > 0 && (
                                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                                                {pendingRequestsCount} {t('common.pending')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <ChapterMemberManagement
                                                        members={membersData?.data?.members || []}
                                                        onUpdateStatus={(userId, status) => updateStatusMutation.mutate({ userId, status })}
                                                        isLoading={isLoadingMembers}
                                                    />
                                                </section>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <section>
                                                        <ChapterEventManagement
                                                            events={eventsData?.data?.events || []}
                                                            onCreateEvent={() => setShowCreateEventModal(true)}
                                                            onViewAttendance={handleViewAttendance}
                                                            isLoading={isLoadingEvents}
                                                        />
                                                    </section>
                                                    <section>
                                                        <ChapterResourceManagement
                                                            resources={resourcesData?.data?.resources || []}
                                                            onCreateResource={() => setShowCreateResourceModal(true)}
                                                            isLoading={isLoadingResources}
                                                        />
                                                    </section>
                                                </div>

                                                <section>
                                                    <ChapterAnnouncementManagement
                                                        announcements={announcementsData?.data?.announcements || []}
                                                        onCreateAnnouncement={() => setShowCreateAnnouncementModal(true)}
                                                        isLoading={isLoadingAnnouncements}
                                                    />
                                                </section>
                                            </div>

                                            {/* Right Column: Actions & Social */}
                                            <div className="space-y-8">
                                                <BadgeAwarding
                                                    members={membersData?.data?.members?.filter((m: any) => m.status === 'approved') || []}
                                                    badges={badgesData || []}
                                                    selectedMember={selectedMemberId}
                                                    selectedBadge={selectedBadgeId}
                                                    onSelectMember={setSelectedMemberId}
                                                    onSelectBadge={setSelectedBadgeId}
                                                    onAward={() => awardBadgeMutation.mutate()}
                                                    isAwarding={awardBadgeMutation.isPending}
                                                />

                                                {/* Quick Info Card */}
                                                <div className="bg-slate-900 rounded-3xl p-8 text-white overflow-hidden relative shadow-2xl">
                                                    <TrendingUp className="absolute -right-4 -bottom-4 h-48 w-48 text-white/5" />
                                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
                                                        <RefreshCw className="h-5 w-5 text-brand-primary" />
                                                        {t('chapters.manage.insights.title', 'Growth Insights')}
                                                    </h3>
                                                    <div className="space-y-6 relative z-10">
                                                        <div className="flex justify-between items-end border-b border-white/10 pb-3">
                                                            <span className="text-white/40 text-[10px] uppercase font-black tracking-widest">{t('chapters.manage.insights.retention', 'Member Retention')}</span>
                                                            <span className="text-2xl font-black text-brand-primary">94%</span>
                                                        </div>
                                                        <div className="flex justify-between items-end border-b border-white/10 pb-3">
                                                            <span className="text-white/40 text-[10px] uppercase font-black tracking-widest">{t('chapters.manage.insights.engagement', 'Event Engagement')}</span>
                                                            <span className="text-2xl font-black text-brand-success">82%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showStartChapterModal && (
                <GenericModal title={t('chapters.start.title')} onClose={() => setShowStartChapterModal(false)}>
                    <form onSubmit={handleStartChapter} className="space-y-6">
                        <FormInput label={t('chapters.start.name_label')} value={newChapterData.name} onChange={v => setNewChapterData({ ...newChapterData, name: v })} required placeholder="e.g. EOTY London Chapter" />
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label={t('chapters.start.country_label')} value={newChapterData.country} onChange={v => setNewChapterData({ ...newChapterData, country: v })} required placeholder="e.g. UK" />
                            <FormInput label={t('chapters.start.city_label')} value={newChapterData.city} onChange={v => setNewChapterData({ ...newChapterData, city: v })} required placeholder="e.g. London" />
                        </div>
                        <FormTextarea label={t('chapters.start.desc_label')} value={newChapterData.description} onChange={v => setNewChapterData({ ...newChapterData, description: v })} required rows={4} />
                        <FormInput label={t('chapters.start.topics_label')} value={newChapterData.topics} onChange={v => setNewChapterData({ ...newChapterData, topics: v })} placeholder="e.g. Coding, Robotics, AI" />
                        <ModalActions onCancel={() => setShowStartChapterModal(false)} submitLabel={t('chapters.start.submit_btn')} />
                    </form>
                </GenericModal>
            )}

            {showApplyLeadershipModal && (
                <GenericModal title={t('chapters.manage.apply_leadership.title')} onClose={() => setShowApplyLeadershipModal(false)}>
                    <form onSubmit={handleApplyLeadership} className="space-y-6">
                        <FormTextarea label={t('chapters.manage.apply_leadership.reason_label')} value={leadershipData.reason} onChange={v => setLeadershipData({ ...leadershipData, reason: v })} required rows={4} />
                        <FormTextarea label={t('chapters.manage.apply_leadership.experience_label')} value={leadershipData.experience} onChange={v => setLeadershipData({ ...leadershipData, experience: v })} required rows={3} />
                        <ModalActions onCancel={() => setShowApplyLeadershipModal(false)} submitLabel={t('chapters.manage.apply_leadership.submit_btn')} />
                    </form>
                </GenericModal>
            )}

            {showCreateEventModal && (
                <GenericModal title={t('chapters.manage.events_management.create_modal_title')} onClose={() => setShowCreateEventModal(false)}>
                    <form onSubmit={handleCreateEvent} className="space-y-6">
                        <FormInput label={t('chapters.manage.events_management.event_title_label')} value={newEventData.title} onChange={v => setNewEventData({ ...newEventData, title: v })} required />
                        <FormTextarea label={t('chapters.manage.events_management.event_desc_label')} value={newEventData.description} onChange={v => setNewEventData({ ...newEventData, description: v })} required />
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput type="datetime-local" label={t('chapters.manage.events_management.event_date_label')} value={newEventData.event_date} onChange={v => setNewEventData({ ...newEventData, event_date: v })} required />
                            <FormInput type="number" label={t('chapters.manage.events_management.duration_label')} value={newEventData.duration_minutes.toString()} onChange={v => setNewEventData({ ...newEventData, duration_minutes: parseInt(v) || 0 })} required />
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={newEventData.is_online} onChange={e => setNewEventData({ ...newEventData, is_online: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                            <label className="text-sm text-stone-700">{t('chapters.manage.events_management.is_online_label')}</label>
                        </div>
                        {newEventData.is_online ? (
                            <FormInput label={t('chapters.manage.events_management.meeting_link_label')} value={newEventData.meeting_link} onChange={v => setNewEventData({ ...newEventData, meeting_link: v })} />
                        ) : (
                            <FormInput label={t('chapters.manage.events_management.location_label')} value={newEventData.location} onChange={v => setNewEventData({ ...newEventData, location: v })} />
                        )}
                        <ModalActions onCancel={() => setShowCreateEventModal(false)} submitLabel={t('chapters.manage.events_management.create_btn')} />
                    </form>
                </GenericModal>
            )}

            {showCreateResourceModal && (
                <GenericModal title={t('chapters.manage.resources_management.add_modal_title')} onClose={() => setShowCreateResourceModal(false)}>
                    <form onSubmit={handleCreateResource} className="space-y-6">
                        <FormInput label={t('chapters.manage.resources_management.resource_title_label')} value={newResource.title} onChange={v => setNewResource({ ...newResource, title: v })} required />
                        <FormInput label={t('chapters.manage.resources_management.resource_url_label')} value={newResource.url} onChange={v => setNewResource({ ...newResource, url: v })} required />
                        <FormTextarea label={t('chapters.manage.resources_management.resource_desc_label')} value={newResource.description} onChange={v => setNewResource({ ...newResource, description: v })} />
                        <ModalActions onCancel={() => setShowCreateResourceModal(false)} submitLabel={t('chapters.manage.resources_management.add_btn')} />
                    </form>
                </GenericModal>
            )}

            {showCreateAnnouncementModal && (
                <GenericModal title={t('chapters.manage.announcements_management.post_modal_title')} onClose={() => setShowCreateAnnouncementModal(false)}>
                    <form onSubmit={handleCreateAnnouncement} className="space-y-6">
                        <FormInput label={t('chapters.manage.announcements_management.title_label')} value={newAnnouncement.title} onChange={v => setNewAnnouncement({ ...newAnnouncement, title: v })} required />
                        <FormTextarea label={t('chapters.manage.announcements_management.content_label')} value={newAnnouncement.content} onChange={v => setNewAnnouncement({ ...newAnnouncement, content: v })} required rows={5} />
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={newAnnouncement.is_pinned} onChange={e => setNewAnnouncement({ ...newAnnouncement, is_pinned: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                            <label className="text-sm text-stone-700">{t('chapters.manage.announcements_management.pin_label')}</label>
                        </div>
                        <ModalActions onCancel={() => setShowCreateAnnouncementModal(false)} submitLabel={t('chapters.manage.announcements_management.post_btn')} />
                    </form>
                </GenericModal>
            )}

            {showAttendanceModal && (
                <GenericModal title={t('chapters.manage.attendance_modal.title')} onClose={() => setShowAttendanceModal(false)} size="max-w-2xl">
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm font-medium">
                            {attendanceData?.data?.attendance?.length > 0 ? t('chapters.manage.attendance_modal.message') : t('chapters.manage.attendance_modal.no_data')}
                        </div>
                        <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {isLoadingAttendance ? <LoadingSpinner /> : attendanceData?.data?.attendance?.map((record: any) => (
                                <div key={record.user_id} className="flex items-center justify-between p-4 bg-white border border-stone-100 rounded-xl hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-sm font-bold text-stone-400">
                                            {record.first_name?.[0]}{record.last_name?.[0]}
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-stone-800 block">{record.first_name} {record.last_name}</span>
                                            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest">{record.joined_at ? new Date(record.joined_at).getFullYear() : 'New'} Member</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleMarkAttendance(record.user_id, 'attended')}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${record.status === 'attended' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}
                                        >
                                            {t('chapters.manage.attendance_modal.attended')}
                                        </button>
                                        <button
                                            onClick={() => handleMarkAttendance(record.user_id, 'absent')}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${record.status === 'absent' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}
                                        >
                                            {t('chapters.manage.attendance_modal.absent')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </GenericModal>
            )}
        </div>
    );
};

// --- Small UI Helper Components ---

const GenericModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; size?: string }> = ({ title, onClose, children, size = 'max-w-lg' }) => (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
        <div className={`bg-white rounded-xl ${size} w-full shadow-2xl overflow-hidden animate-in zoom-in duration-300`}>
            <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <h2 className="text-lg font-bold text-stone-900 tracking-tight">{title}</h2>
                <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors shadow-sm"><X className="h-5 w-5 text-stone-400" /></button>
            </div>
            <div className="p-6">{children}</div>
        </div>
    </div>
);

const FormInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string }> = ({ label, value, onChange, required, type = 'text', placeholder }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">{label}</label>
        <input
            type={type}
            required={required}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm"
            value={value}
            onChange={e => onChange(e.target.value)}
        />
    </div>
);

const FormTextarea: React.FC<{ label: string; value: string; onChange: (v: string) => void; required?: boolean; rows?: number }> = ({ label, value, onChange, required, rows = 3 }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">{label}</label>
        <textarea
            required={required}
            rows={rows}
            className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm"
            value={value}
            onChange={e => onChange(e.target.value)}
        />
    </div>
);

const ModalActions: React.FC<{ onCancel: () => void; submitLabel: string; isLoading?: boolean; variant?: 'primary' | 'success' | 'warning' }> = ({ onCancel, submitLabel, isLoading, variant = 'primary' }) => {
    const colorClass = variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' :
        variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
            'bg-brand-primary hover:bg-brand-primary/90';

    return (
        <div className="flex gap-3 pt-4 mt-6 border-t border-stone-100">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 px-4 bg-stone-100 text-stone-600 rounded-lg font-medium text-sm hover:bg-stone-200 transition-colors">{useTranslation().t('common.cancel')}</button>
            <button type="submit" disabled={isLoading} className={`flex-[2] py-2.5 px-4 ${colorClass} text-white rounded-lg font-medium text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2`}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
            </button>
        </div>
    );
};

export default ChaptersPage;