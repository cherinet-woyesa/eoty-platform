import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, Plus, Search, MessageCircle, Calendar, 
  BookOpen, User, Crown, Loader2, AlertCircle,
  X, Settings, UserPlus, LogOut, Clock, Target
} from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';

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
  const navigate = useNavigate();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  // Load study groups
  const loadStudyGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, use localStorage to simulate study groups
      // In a real implementation, this would come from the backend
      const savedGroups = localStorage.getItem(`study_groups_${user?.id}`);
      let allGroups: StudyGroup[] = [];
      
      if (savedGroups) {
        try {
          allGroups = JSON.parse(savedGroups);
        } catch (e) {
          console.warn('Failed to parse saved groups:', e);
        }
      }
      
      // Filter groups user is a member of
      const userGroups = allGroups.filter(group =>
        group.members.some(member => member.id === user?.id)
      );
      
      // Filter public groups user is not a member of
      const publicGroups = allGroups.filter(group =>
        group.is_public && !group.members.some(member => member.id === user?.id)
      );
      
      setMyGroups(userGroups);
      setGroups(publicGroups);
    } catch (err: any) {
      console.error('Failed to load study groups:', err);
      setError('Failed to load study groups. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadStudyGroups();
  }, [loadStudyGroups]);

  // Create new study group
  const handleCreateGroup = useCallback(() => {
    if (!newGroupName.trim() || !user?.id) return;
    
    const newGroup: StudyGroup = {
      id: `group_${Date.now()}`,
      name: newGroupName,
      description: newGroupDescription,
      member_count: 1,
      max_members: 20,
      is_public: true,
      created_by: user.id,
      created_by_name: `${user.firstName} ${user.lastName}`,
      created_at: new Date().toISOString(),
      members: [{
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: 'admin',
        joined_at: new Date().toISOString()
      }]
    };
    
    const allGroups = [...myGroups, ...groups, newGroup];
    localStorage.setItem(`study_groups_${user.id}`, JSON.stringify(allGroups));
    
    setNewGroupName('');
    setNewGroupDescription('');
    setShowCreateModal(false);
    loadStudyGroups();
  }, [newGroupName, newGroupDescription, user, myGroups, groups, loadStudyGroups]);

  // Join group
  const handleJoinGroup = useCallback((group: StudyGroup) => {
    if (!user?.id) return;
    
    const updatedGroup = {
      ...group,
      member_count: group.member_count + 1,
      members: [
        ...group.members,
        {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          role: 'member',
          joined_at: new Date().toISOString()
        }
      ]
    };
    
    const allGroups = [...myGroups, ...groups].map(g =>
      g.id === group.id ? updatedGroup : g
    );
    
    localStorage.setItem(`study_groups_${user.id}`, JSON.stringify(allGroups));
    loadStudyGroups();
  }, [user, myGroups, groups, loadStudyGroups]);

  // Leave group
  const handleLeaveGroup = useCallback((groupId: string) => {
    if (!user?.id) return;
    
    const allGroups = [...myGroups, ...groups].map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          member_count: Math.max(0, group.member_count - 1),
          members: group.members.filter(m => m.id !== user.id)
        };
      }
      return group;
    });
    
    localStorage.setItem(`study_groups_${user.id}`, JSON.stringify(allGroups));
    loadStudyGroups();
  }, [user?.id, myGroups, groups, loadStudyGroups]);

  // Filtered groups
  const filteredMyGroups = useMemo(() => {
    return myGroups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [myGroups, searchTerm]);

  const filteredPublicGroups = useMemo(() => {
    return groups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#39FF14] mx-auto mb-4" />
            <p className="text-stone-600 text-lg">Loading study groups...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <button 
              onClick={loadStudyGroups}
              className="px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 rounded-lg hover:shadow-lg transition-all font-semibold"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-800 mb-2">Study Groups</h1>
          <p className="text-stone-600">Collaborate and learn together with peers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Create Group
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
        <input
          type="text"
          placeholder="Search study groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
        />
      </div>

      {/* My Groups */}
      <div>
        <h2 className="text-xl font-bold text-stone-800 mb-4">My Study Groups</h2>
        {filteredMyGroups.length === 0 ? (
          <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200">
            <Users className="h-16 w-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-stone-800 mb-2">No study groups yet</h3>
            <p className="text-stone-600 mb-4">Create or join a study group to start collaborating</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 rounded-lg hover:shadow-lg transition-all font-semibold"
            >
              Create Your First Group
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
                    <p className="text-sm text-stone-600 line-clamp-2">{group.description}</p>
                  </div>
                  {group.members.some(m => m.id === user?.id && m.role === 'admin') && (
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
                  <button
                    onClick={() => navigate(`/forums?group=${group.id}`)}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 rounded-lg hover:shadow-lg transition-all font-semibold text-sm flex items-center justify-center gap-1"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Open Chat
                  </button>
                  <button
                    onClick={() => handleLeaveGroup(group.id)}
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
          <h2 className="text-xl font-bold text-stone-800 mb-4">Discover Groups</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPublicGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-stone-200/50"
              >
                <div className="mb-4">
                  <h3 className="font-bold text-stone-800 mb-1">{group.name}</h3>
                  <p className="text-sm text-stone-600 line-clamp-2">{group.description}</p>
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
                
                <button
                  onClick={() => handleJoinGroup(group)}
                  disabled={group.member_count >= group.max_members}
                  className="w-full px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 rounded-lg hover:shadow-lg transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="h-4 w-4" />
                  {group.member_count >= group.max_members ? 'Full' : 'Join Group'}
                </button>
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
              <h2 className="text-xl font-bold text-stone-800">Create Study Group</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-stone-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Describe your study group..."
                  rows={3}
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-transparent"
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
                  disabled={!newGroupName.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-900 rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyGroupsPage;
