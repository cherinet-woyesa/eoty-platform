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

const StudyGroupsPage: React.FC = () => {
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
    <div className="w-full h-full bg-slate-50/50">
      <div className="w-full max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-indigo-950 mb-1">{t('community.groups.title')}</h1>
              <p className="text-slate-500 text-sm font-normal">{t('community.groups.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-semibold flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
            style={{ backgroundColor: brandColors.primaryHex }}
          >
            <Plus className="h-5 w-5" />
            {t('community.groups.create')}
          </button>
        </div>

        {/* Controls: Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex space-x-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('my-groups')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'my-groups'
                ? 'bg-indigo-50 text-indigo-900 shadow-sm ring-1 ring-indigo-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
              {t('community.groups.my_groups')}
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'discover'
                ? 'bg-indigo-50 text-indigo-900 shadow-sm ring-1 ring-indigo-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
              {t('community.groups.discover')}
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder={t('community.groups.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm shadow-sm"
            />
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'my-groups' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {filteredMyGroups.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{t('community.groups.empty_mine_title')}</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">{t('community.groups.empty_mine_body')}</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-2.5 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                  style={{ backgroundColor: brandColors.primaryHex }}
                >
                  {t('community.groups.create')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredMyGroups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-slate-100 hover:border-indigo-100 group flex flex-col h-full transform hover:-translate-y-1 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Users className="h-5 w-5" />
                      </div>
                      {(group.members || []).some(m => m.id === user?.id && m.role === 'admin') && (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                          <Crown className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors line-clamp-1">{group.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{group.description || t('community.groups.no_description')}</p>

                    <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-5 pt-4 border-t border-slate-50">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {group.member_count} / {group.max_members} members
                      </span>
                      {group.course_title && (
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span className="max-w-[100px] truncate">{group.course_title}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-auto">
                      <Link
                        to={`/member/study-groups/${group.id}`}
                        state={{ fromTab: activeTab }}
                        className="flex-1 px-4 py-2.5 text-white rounded-xl shadow-sm hover:shadow-md transition-all font-semibold text-sm flex items-center justify-center gap-2 group-hover:bg-indigo-700"
                        style={{ backgroundColor: brandColors.primaryHex }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Enter Group
                      </Link>

                      {String(group.created_by) === String(user?.id) ? (
                        <button
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                          title="Delete group"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLeaveGroup(group.id, group.name)}
                          className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-all"
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

        {/* Public Groups */}
        {activeTab === 'discover' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {filteredPublicGroups.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{t('community.groups.empty_public_title')}</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">{t('community.groups.empty_public_body')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPublicGroups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-slate-100 hover:border-indigo-100 group flex flex-col h-full transform hover:-translate-y-1 relative"
                  >
                    <div className="mb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-2 inline-block">
                          <Users className="h-5 w-5" />
                        </div>
                        {group.course_title && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border border-slate-100 px-2 py-1 rounded-full">
                            Course Group
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors line-clamp-1">{group.name}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2">{group.description?.trim() || t('community.groups.no_description')}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-5 pt-4 border-t border-slate-50">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {group.member_count} / {group.max_members} members
                      </span>
                      <span className="text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Public</span>
                    </div>

                    <button
                      onClick={() => handleJoinGroup(group)}
                      disabled={group.member_count >= group.max_members || joinMutation.isPending}
                      className="w-full mt-auto px-4 py-2.5 text-white rounded-xl shadow-sm hover:shadow-md transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
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

        {/* Create Group Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-800">Create New Group</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Biology 101 Study Crew"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Briefly describe the goal of this group..."
                    rows={4}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim() || createMutation.isPending}
                    className="flex-1 px-4 py-2.5 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
