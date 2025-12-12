import React, { useState, useMemo, useCallback } from 'react';
import { studyGroupsApi } from '@/services/api/studyGroups';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, Plus, Search, MessageCircle, Calendar, 
  BookOpen, User, Crown, Loader2, AlertCircle,
  X, Settings, UserPlus, LogOut, Clock, Target, Trash2
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
  const navigate = useNavigate();
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
      showNotification('success', t('community.groups.created_title'), t('community.groups.created_body'));
      await queryClient.invalidateQueries({ queryKey: ['study-groups'] });
    },
    onError: () => showNotification('error', t('common.error'), t('community.groups.create_error'))
  });

  const joinMutation = useMutation({
    mutationFn: async (group: StudyGroup) => studyGroupsApi.join(Number(group.id)),
    onSuccess: async (_, group) => {
      showNotification('success', t('community.groups.joined_title'), t('community.groups.joined_body'));

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
    onError: () => showNotification('error', t('common.error'), t('community.groups.join_error'))
  });

  const leaveMutation = useMutation({
    mutationFn: async (groupId: string) => studyGroupsApi.leave(Number(groupId)),
    onSuccess: async (_, groupId) => {
      showNotification('success', t('community.groups.left_title'), t('community.groups.left_body'));

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
    onError: () => showNotification('error', t('common.error'), t('community.groups.leave_error'))
  });

  const handleCreateGroup = useCallback(() => {
    if (!newGroupName.trim()) return;
    createMutation.mutate();
  }, [createMutation, newGroupName]);

  const handleJoinGroup = useCallback(async (group: StudyGroup) => {
    if (group.member_count >= group.max_members) {
      showNotification('error', 'Group is full', 'Please pick another group');
      return;
    }
    // Just trigger mutation, navigation happens in onSuccess
    joinMutation.mutate(group);
  }, [joinMutation, showNotification]);

  const handleLeaveGroup = useCallback(async (groupId: string, groupName: string) => {
    const ok = await confirm({
      title: t('community.groups.leave_confirm_title'),
      message: t('community.groups.leave_confirm_body', { name: groupName }),
      confirmText: t('community.groups.leave_confirm_cta'),
      cancelText: t('common.cancel')
    });
    if (!ok) return;
    leaveMutation.mutate(groupId);
  }, [leaveMutation, confirm]);

  const deleteMutation = useMutation({
    mutationFn: async (groupId: string) => studyGroupsApi.delete(Number(groupId)),
    onSuccess: async (_, groupId) => {
      showNotification('success', t('community.groups.deleted_title', 'Group deleted'), t('community.groups.deleted_body', 'Your group has been deleted.'));
      queryClient.setQueryData(['study-groups'], (prev: any) => {
        const current = prev || {};
        const myGroups = (current.myGroups || []).filter((g: any) => String(g.id) !== String(groupId));
        const publicGroups = (current.publicGroups || []).filter((g: any) => String(g.id) !== String(groupId));
        return { ...current, myGroups, publicGroups };
      });
      await queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      await refetch();
    },
    onError: () => showNotification('error', t('common.error'), t('community.groups.delete_error', 'Failed to delete group'))
  });

  const handleDeleteGroup = useCallback(async (groupId: string, groupName: string) => {
    const ok = await confirm({
      title: t('community.groups.delete_confirm_title', 'Delete group'),
      message: t('community.groups.delete_confirm_body', { name: groupName }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
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
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: brandColors.primaryHex }}>{t('community.groups.title')}</h1>
          <p className="text-slate-600 text-sm">{t('community.groups.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 text-white rounded-lg shadow-md hover:shadow-lg transition-all font-semibold flex items-center gap-2"
          style={{ backgroundColor: brandColors.primaryHex }}
        >
          <Plus className="h-5 w-5" />
          {t('community.groups.create')}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder={t('community.groups.search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/20 focus:border-[#1e1b4b]"
        />
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab('my-groups')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'my-groups'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          {t('community.groups.my_groups')}
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'discover'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          {t('community.groups.discover')}
        </button>
      </div>

      {/* My Groups */}
      {activeTab === 'my-groups' && (
      <div>
        {filteredMyGroups.length === 0 ? (
          <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200">
            <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('community.groups.empty_mine_title')}</h3>
            <p className="text-slate-600 mb-4">{t('community.groups.empty_mine_body')}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              {t('community.groups.create')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMyGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-slate-200/50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 mb-1">{group.name}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{(group.description || '').slice(0, 140)}{(group.description || '').length > 140 ? '…' : ''}</p>
                  </div>
                  {(group.members || []).some(m => m.id === user?.id && m.role === 'admin') && (
                    <Crown className="h-5 w-5 text-[#cfa15a] flex-shrink-0" />
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {t('community.groups.members_count', { count: group.member_count, max: group.max_members })}
                  </span>
                  {group.course_title && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {group.course_title}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Link
                    to={`/member/study-groups/${group.id}`}
                    state={{ fromTab: activeTab }}
                    className="flex-1 px-3 py-2 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm flex items-center justify-center gap-1 text-center"
                    style={{ backgroundColor: brandColors.primaryHex }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Open Group
                  </Link>
                  {String(group.created_by) === String(user?.id) ? (
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                      title="Delete group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLeaveGroup(group.id, group.name)}
                      className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all"
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
      <div>
        {filteredPublicGroups.length === 0 ? (
          <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 md:col-span-3">
            <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('community.groups.empty_public_title')}</h3>
            <p className="text-slate-600">{t('community.groups.empty_public_body')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPublicGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-slate-200/50"
              >
                <div className="mb-4">
                  <h3 className="font-bold text-slate-800 mb-1">{group.name}</h3>
                  <p className="text-sm text-slate-600 line-clamp-2">{group.description?.trim() || t('community.groups.no_description')}</p>
                </div>
                
                <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {t('community.groups.members_count', { count: group.member_count, max: group.max_members })}
                  </span>
                  {group.course_title && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {group.course_title}
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => handleJoinGroup(group)}
                  disabled={group.member_count >= group.max_members || joinMutation.isLoading}
                  className="w-full px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Create Group</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Bible Study Tuesdays"
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/20 focus:border-[#1e1b4b]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What will you study? When do you meet?"
                  rows={3}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/20 focus:border-[#1e1b4b]"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || createMutation.isLoading}
                  className="flex-1 px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: brandColors.primaryHex }}
                >
                  {createMutation.isLoading ? 'Creating...' : 'Create'}
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
