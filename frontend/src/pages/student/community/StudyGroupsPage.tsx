import React, { useState, useMemo, useCallback } from 'react';
import { studyGroupsApi } from '@/services/api/studyGroups';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, Plus, Search, MessageCircle, Calendar, 
  BookOpen, User, Crown, Loader2, AlertCircle,
  X, Settings, UserPlus, LogOut, Clock, Target
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

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
      showNotification('success', 'Group created', 'Your study group is now live');
      await queryClient.invalidateQueries({ queryKey: ['study-groups'] });
    },
    onError: () => showNotification('error', 'Error', 'Failed to create group')
  });

  const joinMutation = useMutation({
    mutationFn: async (group: StudyGroup) => studyGroupsApi.join(Number(group.id)),
    onSuccess: async (_, group) => {
      showNotification('success', 'Joined group', 'You are now a member');
      // Optimistically move to myGroups
      queryClient.setQueryData(['study-groups'], (oldData: any) => {
        if (!oldData) return oldData;
        const myGroups = oldData.myGroups || [];
        const publicGroups = oldData.publicGroups || [];
        const target = publicGroups.find((g: any) => String(g.id) === String(group.id)) || group;
        return {
          ...oldData,
          myGroups: [target, ...myGroups.filter((g: any) => String(g.id) !== String(group.id))],
          publicGroups: publicGroups.filter((g: any) => String(g.id) !== String(group.id))
        };
      });
      await queryClient.invalidateQueries({ queryKey: ['study-groups'] });
    },
    onError: () => showNotification('error', 'Error', 'Failed to join group')
  });

  const leaveMutation = useMutation({
    mutationFn: async (groupId: string) => studyGroupsApi.leave(Number(groupId)),
    onSuccess: async () => {
      showNotification('success', 'Left group', 'You have left the study group');
      queryClient.setQueryData(['study-groups'], (oldData: any) => {
        if (!oldData) return oldData;
        const myGroups = (oldData.myGroups || []).filter((g: any) => String(g.id) !== String(groupId));
        return { ...oldData, myGroups };
      });
      await queryClient.invalidateQueries({ queryKey: ['study-groups'] });
    },
    onError: () => showNotification('error', 'Error', 'Failed to leave group')
  });

  const handleCreateGroup = useCallback(() => {
    if (!newGroupName.trim()) return;
    createMutation.mutate();
  }, [createMutation, newGroupName]);

  const handleJoinGroup = useCallback((group: StudyGroup) => {
    if (group.member_count >= group.max_members) {
      showNotification('error', 'Group is full', 'Please pick another group');
      return;
    }
    joinMutation.mutate(group);
  }, [joinMutation, showNotification]);

  const handleLeaveGroup = useCallback(async (groupId: string, groupName: string) => {
    const ok = await confirm({
      title: 'Leave group',
      message: `Are you sure you want to leave "${groupName}"?`,
      confirmText: 'Leave',
      cancelText: 'Stay'
    });
    if (!ok) return;
    leaveMutation.mutate(groupId);
  }, [leaveMutation, confirm]);

  const publicGroups: StudyGroup[] = useMemo(() => {
    const all = data?.publicGroups || [];
    const mySet = new Set((data?.myGroups || []).map((g: any) => String(g.id)));
    const createdByMe = all.filter((g: any) => String(g.created_by) === String(user?.id));
    createdByMe.forEach((g: any) => mySet.add(String(g.id)));
    return all.filter((g: any) => !mySet.has(String(g.id)));
  }, [data, user?.id]);

  const myGroups: StudyGroup[] = useMemo(() => {
    const mine = data?.myGroups || [];
    const created = (data?.publicGroups || []).filter((g: any) => String(g.created_by) === String(user?.id));
    const merged = [...mine];
    const existing = new Set(mine.map((g: any) => String(g.id)));
    created.forEach((g: any) => {
      if (!existing.has(String(g.id))) merged.push(g);
    });
    return merged;
  }, [data, user?.id]);

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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-[#27AE60] mx-auto mb-4" />
              <p className="text-stone-600 text-lg">Loading study groups...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
        <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 text-lg mb-4">Failed to load study groups. Please try again.</p>
              <button 
                onClick={() => refetch()}
                className="px-4 py-2 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors font-semibold shadow-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-800 mb-1">Study Groups</h1>
          <p className="text-stone-600 text-sm">Collaborate with peers on focused Bible study.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-white rounded-lg shadow-md hover:shadow-lg transition-all font-semibold flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Group
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
        <input
          type="text"
          placeholder="Search groups"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50"
        />
      </div>

      {/* My Groups */}
      <div>
        <h2 className="text-xl font-bold text-stone-800 mb-3">My Groups</h2>
        {filteredMyGroups.length === 0 ? (
          <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200">
            <Users className="h-16 w-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-stone-800 mb-2">No groups yet</h3>
            <p className="text-stone-600 mb-4">Create or join a group to start collaborating.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
            >
              Create Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMyGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-stone-200/50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-stone-800 mb-1">{group.name}</h3>
                    <p className="text-sm text-stone-600 line-clamp-2">{(group.description || '').slice(0, 140)}{(group.description || '').length > 140 ? '…' : ''}</p>
                  </div>
                  {(group.members || []).some(m => m.id === user?.id && m.role === 'admin') && (
                    <Crown className="h-5 w-5 text-[#FFD700] flex-shrink-0" />
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm text-stone-600 mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {group.member_count} / {group.max_members} members
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
                    to={`/student/study-groups/${group.id}`}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 hover:shadow-lg transition-all font-semibold text-sm flex items-center justify-center gap-1 text-center"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Open Group
                  </Link>
                  <button
                    onClick={() => handleLeaveGroup(group.id, group.name)}
                    className="px-3 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-all"
                    title="Leave group"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Public Groups */}
      {filteredPublicGroups.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-stone-800 mb-3">Discover</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPublicGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-stone-200/50"
              >
                <div className="mb-4">
                  <h3 className="font-bold text-stone-800 mb-1">{group.name}</h3>
                  <p className="text-sm text-stone-600 line-clamp-2">{group.description?.trim() || 'No description provided.'}</p>
                </div>
                
                <div className="flex items-center justify-between text-sm text-stone-600 mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {group.member_count} / {group.max_members} members
                  </span>
                  {group.course_title && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {group.course_title}
                    </span>
                  )}
                </div>
                
                <Link
                  to={`/student/study-groups/${group.id}`}
                  onClick={(e) => {
                    if (group.member_count >= group.max_members || joinMutation.isLoading) {
                      e.preventDefault();
                      handleJoinGroup(group);
                    } else {
                      // ensure join before navigate for non-members
                      handleJoinGroup(group);
                    }
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 hover:shadow-lg transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="h-4 w-4" />
                  {group.member_count >= group.max_members ? 'Full' : 'Join / Open'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-stone-800">Create Group</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-stone-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Bible Study Tuesdays"
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What will you study? When do you meet?"
                  rows={3}
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || createMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
