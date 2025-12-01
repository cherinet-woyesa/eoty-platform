/**
 * Chapter Roles Management Component
 * Admin interface for managing chapter-specific roles (FR7)
 */

import React, { useState, useEffect } from 'react';
import { UserCog, MapPin, Crown, Users } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import chapterRolesApi, { ChapterRole, RegionalCoordinator } from '@/services/api/chapterRoles';
import { chaptersApi } from '@/services/api/chapters';
import { adminApi } from '@/services/api/admin';

interface Chapter {
  id: number;
  name: string;
  location: string;
  city: string;
  country: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const ChapterRolesManagement: React.FC = () => {
  const { showNotification } = useNotification();
  const [chapterRoles, setChapterRoles] = useState<ChapterRole[]>([]);
  const [regionalCoordinators, setRegionalCoordinators] = useState<RegionalCoordinator[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Assignment form state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedRole, setSelectedRole] = useState<'chapter_admin' | 'regional_coordinator'>('chapter_admin');

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load chapters
      const chaptersResponse = await chaptersApi.getChapters();
      if (chaptersResponse.success) {
        setChapters(chaptersResponse.data.chapters);
      }

      // Load users
      const usersResponse = await adminApi.getUsers();
      if (usersResponse.success) {
        setUsers(usersResponse.data.users);
      }

      // Load regional coordinators
      const coordinatorsResponse = await chapterRolesApi.getRegionalCoordinators();
      if (coordinatorsResponse.success) {
        setRegionalCoordinators(coordinatorsResponse.data.coordinators);
      }

    } catch (error) {
      console.error('Error loading chapter roles data:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load chapter roles data'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedChapter || !selectedRole) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all fields'
      });
      return;
    }

    setActionLoading('assign');
    try {
      const response = await chapterRolesApi.assignChapterRole({
        userId: selectedUser,
        chapterId: parseInt(selectedChapter),
        role: selectedRole
      });

      if (response.success) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: `${selectedRole.replace('_', ' ').toUpperCase()} role assigned successfully`
        });
        setShowAssignForm(false);
        setSelectedUser('');
        setSelectedChapter('');
        setSelectedRole('chapter_admin');
        await loadData(); // Refresh data
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: response.message || 'Failed to assign role'
        });
      }
    } catch (error: any) {
      console.error('Error assigning role:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to assign role'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveRole = async (roleId: number, userId: string, chapterId: number, role: string) => {
    if (!confirm(`Are you sure you want to remove the ${role.replace('_', ' ')} role from this user?`)) {
      return;
    }

    setActionLoading(`remove-${roleId}`);
    try {
      const response = await chapterRolesApi.removeChapterRole({
        userId,
        chapterId,
        role: role as 'chapter_admin' | 'regional_coordinator'
      });

      if (response.success) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Role removed successfully'
        });
        await loadData(); // Refresh data
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: response.message || 'Failed to remove role'
        });
      }
    } catch (error: any) {
      console.error('Error removing role:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to remove role'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'chapter_admin':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'regional_coordinator':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'chapter_admin':
        return <Crown className="w-4 h-4" />;
      case 'regional_coordinator':
        return <Users className="w-4 h-4" />;
      default:
        return <UserCog className="w-4 h-4" />;
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'chapter_admin':
        return 'Chapter Admin';
      case 'regional_coordinator':
        return 'Regional Coordinator';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27AE60]"></div>
        <span className="ml-2 text-gray-600">Loading chapter roles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chapter Roles Management</h2>
          <p className="text-gray-600 mt-1">Manage chapter-specific roles for multi-city administration</p>
        </div>
        <button
          onClick={() => setShowAssignForm(true)}
          className="bg-[#27AE60] text-white px-4 py-2 rounded-lg hover:bg-[#219150] transition-colors flex items-center gap-2"
        >
          <UserCog className="w-4 h-4" />
          Assign Role
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Crown className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Chapter Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {chapterRoles.filter(r => r.role === 'chapter_admin').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-[#27AE60]" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Regional Coordinators</p>
              <p className="text-2xl font-bold text-gray-900">{regionalCoordinators.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <MapPin className="w-8 h-8 text-[#27AE60]" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Chapters</p>
              <p className="text-2xl font-bold text-gray-900">{chapters.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Regional Coordinators Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Regional Coordinators</h3>
          <p className="text-sm text-gray-600">Users overseeing multiple chapters in their region</p>
        </div>

        <div className="p-6">
          {regionalCoordinators.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No regional coordinators assigned yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regionalCoordinators.map((coordinator) => (
                <div key={coordinator.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          {getRoleIcon(coordinator.role)}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {coordinator.first_name} {coordinator.last_name}
                        </h4>
                        <p className="text-sm text-gray-500">{coordinator.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveRole(
                        coordinator.id,
                        coordinator.user_id,
                        coordinator.chapter_id,
                        coordinator.role
                      )}
                      disabled={actionLoading === `remove-${coordinator.id}`}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {actionLoading === `remove-${coordinator.id}` ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                  <div className="mt-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(coordinator.role)}`}>
                      {getRoleIcon(coordinator.role)}
                      <span className="ml-1">{getRoleDisplayName(coordinator.role)}</span>
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {coordinator.chapter_name} - {coordinator.chapter_location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Role Modal */}
      {showAssignForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Chapter Role</h3>

              <form onSubmit={handleAssignRole} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    required
                  >
                    <option value="">Select a user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    required
                  >
                    <option value="">Select a chapter...</option>
                    {chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.name} - {chapter.location}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as 'chapter_admin' | 'regional_coordinator')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
                    required
                  >
                    <option value="chapter_admin">Chapter Admin</option>
                    <option value="regional_coordinator">Regional Coordinator</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignForm(false);
                      setSelectedUser('');
                      setSelectedChapter('');
                      setSelectedRole('chapter_admin');
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === 'assign'}
                    className="px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#219150] disabled:opacity-50"
                  >
                    {actionLoading === 'assign' ? 'Assigning...' : 'Assign Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapterRolesManagement;
