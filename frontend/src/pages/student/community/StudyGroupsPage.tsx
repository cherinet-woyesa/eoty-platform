import React, { useState, useMemo, useCallback } from 'react';
import { studyGroupsApi } from '@/services/api/studyGroups';
import { Link, useLocation } from 'react-router-dom';
import {
  Users, Plus, Search, MessageCircle,
  BookOpen, Crown, Loader2, AlertCircle,
  X, UserPlus, LogOut, Trash2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { brandColors } from '@/theme/brand';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  course_id?: string;
  course_title?: string;
  member_count: number;
  max_members: number;
  is_public: boolean;
  created_by: string;
  created_by_name: string;
  created_at: string;
  members: GroupMember[];
  recent_activity?: string;
}

interface GroupMember {
  id: string;
  name: string;
  role: 'admin' | 'member';
  joined_at: string;
  avatar?: string;
}

interface StudyGroupsPageProps {
  embedded?: boolean;
}

const StudyGroupsPage: React.FC<StudyGroupsPageProps> = ({ embedded = false }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [recentlyJoined, setRecentlyJoined] = useState<Set<string>>(new Set());
  const [recentlyLeft, setRecentlyLeft] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['study-groups'],
    queryFn: async () => {
      const resp = await studyGroupsApi.list();
      return resp?.data || {};
    },
    staleTime: 1000 * 30
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const name = newGroupName.trim();
      const description = newGroupDescription.trim();
      return studyGroupsApi.create({ name, description, is_public: true, max_members: 50 });
    },
    onSuccess: async () => {
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      showNotification({ type: 'success', title: 'Success', message: t('community.groups.created_body') });
      await queryClient.invalidateQueries({ queryKey: ['study-groups'] });
    },
    onError: () => showNotification({ type: 'error', title: 'Error', message: t('community.groups.create_error') })
  });

  const joinMutation = useMutation({
    mutationFn: async (group: StudyGroup) => studyGroupsApi.join(Number(group.id)),
    onSuccess: async (_, group) => {
      showNotification({ type: 'success', title: 'Success', message: t('community.groups.joined_body') });

      // Optimistically move the group to "my groups" and out of "discover"
      queryClient.setQueryData(['study-groups'], (prev: any) => {
        const current = prev || {};
        const myGroups = [...(current.myGroups || [])];
        if (!myGroups.some((g: any) => String(g.id) === String(group.id))) {
          myGroups.push(group);
        }
        const publicGroups = (current.publicGroups || []).filter(
          (g: any) => String(g.id) !== String(group.id)
        );
        return { ...current, myGroups, publicGroups };
      });

      setRecentlyJoined((prev) => {
        const next = new Set(prev);
        next.add(String(group.id));
        return next;
      });
      setRecentlyLeft((prev) => {
        const next = new Set(prev);
        next.delete(String(group.id));
        return next;
      });

      // Refresh from server to stay consistent
      await queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      await refetch();

      // Stay on page but switch to My Groups to reflect the join
      setActiveTab('my-groups');
    },
    onError: () => showNotification({ type: 'error', title: 'Error', message: t('community.groups.join_error') })
  });

  const leaveMutation = useMutation({
    mutationFn: async (groupId: string) => studyGroupsApi.leave(Number(groupId)),
    onSuccess: async (_, groupId) => {
      showNotification({ type: 'success', title: 'Success', message: t('community.groups.left_body') });

      queryClient.setQueryData(['study-groups'], (prev: any) => {
        const current = prev || {};
        const myGroups = (current.myGroups || []).filter((g: any) => String(g.id) !== String(groupId));

        // If the group was public, return it to discover
        const leftGroup = (current.myGroups || []).find((g: any) => String(g.id) === String(groupId));
        let publicGroups = current.publicGroups || [];
        if (leftGroup && leftGroup.is_public) {
          const exists = publicGroups.some((g: any) => String(g.id) === String(groupId));
          if (!exists) {
            publicGroups = [leftGroup, ...publicGroups];
          }
        }

        return { ...current, myGroups, publicGroups };
      });

      setRecentlyLeft((prev) => {
        const next = new Set(prev);
        next.add(String(groupId));
        return next;
      });
      setRecentlyJoined((prev) => {
        const next = new Set(prev);
        next.delete(String(groupId));
        return next;
      });

      await queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      await refetch();
      setActiveTab('my-groups');
    },
    onError: () => showNotification({ type: 'error', title: 'Error', message: t('community.groups.leave_error') })
  });

  const handleCreateGroup = useCallback(() => {
    if (!newGroupName.trim()) return;
    createMutation.mutate();
  }, [createMutation, newGroupName]);

  const handleJoinGroup = useCallback(async (group: StudyGroup) => {
    if (group.member_count >= group.max_members) {
      showNotification({ type: 'error', title: 'Group Full', message: 'Please pick another group' });
      return;
    }
    // Just trigger mutation, navigation happens in onSuccess
    joinMutation.mutate(group);
  }, [joinMutation, showNotification]);

  const handleLeaveGroup = useCallback(async (groupId: string, groupName: string) => {
    const ok = await confirm({
      title: t('community.groups.leave_confirm_title'),
      message: t('community.groups.leave_confirm_body', { name: groupName }),
      confirmLabel: t('community.groups.leave_confirm_cta'),
      cancelLabel: t('common.cancel')
    });
    if (!ok) return;
    leaveMutation.mutate(groupId);
  }, [leaveMutation, confirm]);

  const deleteMutation = useMutation({
    mutationFn: async (groupId: string) => studyGroupsApi.delete(Number(groupId)),
    onSuccess: async (_, groupId) => {
      showNotification({ type: 'success', title: 'Success', message: t('community.groups.deleted_body', 'Your group has been deleted.') });
      queryClient.setQueryData(['study-groups'], (prev: any) => {
        const current = prev || {};
        const myGroups = (current.myGroups || []).filter((g: any) => String(g.id) !== String(groupId));
        const publicGroups = (current.publicGroups || []).filter((g: any) => String(g.id) !== String(groupId));
        return { ...current, myGroups, publicGroups };
      });
      await queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      await refetch();
    },
    onError: () => showNotification({ type: 'error', title: 'Error', message: t('community.groups.delete_error', 'Failed to delete group') })
  });

  const handleDeleteGroup = useCallback(async (groupId: string, groupName: string) => {
    const ok = await confirm({
      title: t('community.groups.delete_confirm_title', 'Delete group'),
      message: t('community.groups.delete_confirm_body', { name: groupName }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      variant: 'danger'
    });
    if (!ok) return;
    deleteMutation.mutate(groupId);
  }, [deleteMutation, confirm, t]);

  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'my-groups' | 'discover'>((location.state as any)?.activeTab || 'my-groups');

  const publicGroups: StudyGroup[] = useMemo(() => {
    const all = data?.publicGroups || [];
    const mySet = new Set((data?.myGroups || []).map((g: any) => String(g.id)));
    const localJoined = recentlyJoined;
    return all.filter((g: any) => {
      const id = String(g.id);
      if (mySet.has(id)) return false;
      if (localJoined.has(id)) return false;
      return true;
    });
  }, [data, recentlyJoined]);

  const myGroups: StudyGroup[] = useMemo(() => {
    const mine = data?.myGroups || [];
    return mine.filter((g: any) => !recentlyLeft.has(String(g.id)));
  }, [data, recentlyLeft]);

  // Filtered groups
  const filteredMyGroups = useMemo(() => {
    return myGroups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [myGroups, searchTerm]);

  const filteredPublicGroups = useMemo(() => {
    return publicGroups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [publicGroups, searchTerm]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin" style={{ color: brandColors.primaryHex }} />
              <p className="text-slate-600 text-lg">{t('community.groups.loading')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 text-lg mb-4">{t('community.groups.error')}</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-lg text-white hover:shadow-lg transition-all font-semibold shadow-sm"
                style={{ backgroundColor: brandColors.primaryHex }}
              >
                {t('common.try_again')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'w-full' : 'min-h-screen bg-gray-50/50 pb-12'}>
      <div className={embedded ? 'w-full p-6 space-y-6' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8'}>
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('community.groups.title')}</h1>
            <p className="mt-2 text-lg text-gray-600">{t('community.groups.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white shadow-sm hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            style={{ backgroundColor: brandColors.primaryHex }}
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('community.groups.create')}
          </button>
        </div>

        {/* Navigation & Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex p-1 bg-gray-100/80 rounded-xl">
              <button
                onClick={() => setActiveTab('my-groups')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'my-groups'
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
              >
                {t('community.groups.my_groups')}
              </button>
              <button
                onClick={() => setActiveTab('discover')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'discover'
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
              >
                {t('community.groups.discover')}
              </button>
            </div>

            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder={t('community.groups.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {activeTab === 'my-groups' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {filteredMyGroups.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="h-10 w-10 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t('community.groups.empty_mine_title')}</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">{t('community.groups.empty_mine_body')}</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-8 py-3 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                    style={{ backgroundColor: brandColors.primaryHex }}
                  >
                    {t('community.groups.create')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMyGroups.map((group) => (
                    <div
                      key={group.id}
                      className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-indigo-100 flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          <Users className="h-6 w-6" />
                        </div>
                        {(group.members || []).some(m => m.id === user?.id && m.role === 'admin') && (
                          <span className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                            <Crown className="h-3 w-3" />
                            Admin
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {group.name}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1 leading-relaxed">
                        {group.description || t('community.groups.no_description')}
                      </p>

                      <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-6 pt-4 border-t border-gray-50">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {group.member_count} / {group.max_members} members
                        </span>
                        {group.course_title && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-md text-gray-500">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span className="max-w-[120px] truncate">{group.course_title}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-auto">
                        <Link
                          to={`/member/study-groups/${group.id}`}
                          state={{ fromTab: activeTab }}
                          className="flex-1 px-4 py-3 text-white rounded-xl shadow-sm hover:shadow-md transition-all font-semibold text-sm flex items-center justify-center gap-2 group-hover:bg-indigo-700"
                          style={{ backgroundColor: brandColors.primaryHex }}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Enter Group
                        </Link>

                        {String(group.created_by) === String(user?.id) ? (
                          <button
                            onClick={() => handleDeleteGroup(group.id, group.name)}
                            className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                            title="Delete group"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLeaveGroup(group.id, group.name)}
                            className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 hover:text-gray-800 transition-all"
                            title="Leave group"
                          >
                            <LogOut className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'discover' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {filteredPublicGroups.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t('community.groups.empty_public_title')}</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">{t('community.groups.empty_public_body')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPublicGroups.map((group) => (
                    <div
                      key={group.id}
                      className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-indigo-100 flex flex-col h-full relative"
                    >
                      <div className="mb-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                            <Users className="h-6 w-6" />
                          </div>
                          {group.course_title && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                              Course Group
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {group.name}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                          {group.description?.trim() || t('community.groups.no_description')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-6 pt-4 border-t border-gray-50">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {group.member_count} / {group.max_members} members
                        </span>
                        <span className="text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full font-semibold">Public</span>
                      </div>

                      <button
                        onClick={() => handleJoinGroup(group)}
                        disabled={group.member_count >= group.max_members || joinMutation.isPending}
                        className="w-full mt-auto px-4 py-3 text-white rounded-xl shadow-sm hover:shadow-md transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
                        style={{ backgroundColor: brandColors.primaryHex }}
                      >
                        <UserPlus className="h-4 w-4" />
                        {group.member_count >= group.max_members ? t('community.groups.full') : t('community.groups.join_open')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Group Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-900">Create New Group</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Biology 101 Study Crew"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 placeholder:text-gray-400 transition-all"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Briefly describe the goal of this group..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 placeholder:text-gray-400 resize-none transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim() || createMutation.isPending}
                    className="flex-1 px-4 py-3 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: brandColors.primaryHex }}
                  >
                    {createMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </span>
                    ) : 'Create Group'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyGroupsPage;
