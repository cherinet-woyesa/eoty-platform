/**
 * Chapter Roles Management Component
 * Admin interface for managing chapter-specific roles (FR7)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { UserCog, MapPin, Crown, Users, Search, Loader2, RefreshCw } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import chapterRolesApi, { ChapterRole, RegionalCoordinator } from '@/services/api/chapterRoles';
import { chaptersApi } from '@/services/api/chapters';
import { adminApi } from '@/services/api/admin';
import { brandColors } from '@/theme/brand';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'chapter_admin' | 'regional_coordinator'>('all');
  const [sortBy, setSortBy] = useState<'chapter' | 'user'>('chapter');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Assignment form state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedRole, setSelectedRole] = useState<'chapter_admin' | 'regional_coordinator'>('chapter_admin');

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Debounce search to smooth filtering
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Load dynamic country/region lists from backend
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await chaptersApi.getLocations();
        if (data.success) {
          const countries = Array.from(new Set((data.data.countries || []).map((c: string) => c.toLowerCase())));
          const regions = Array.from(new Set((data.data.regions || []).map((r: string) => r.toLowerCase())));
          setCountryOptions(countries);
          setRegionOptions(regions);
        }
      } catch (err) {
        console.warn('Country/region fetch failed', err);
      }
    };
    fetchLocations();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const unwrap = (res: any) => {
        const base = res?.data ?? res;
        return base?.data ?? base;
      };

      // Load chapters
      const chaptersResponse = await chaptersApi.getChapters();
      const chaptersPayload = unwrap(chaptersResponse);
      if (chaptersPayload?.chapters) setChapters(chaptersPayload.chapters);

      // Load users
      const usersResponse = await adminApi.getUsers({ page: 1, limit: 500 });
      const usersPayload = unwrap(usersResponse);
      if (usersPayload?.users) setUsers(usersPayload.users);

      // Load all chapter roles
      const rolesResponse = await chapterRolesApi.getAllChapterRoles();
      const rolesPayload = unwrap(rolesResponse);
      if (rolesPayload?.roles) {
        const mappedRoles = rolesPayload.roles.map((role: any) => ({
          ...role,
          user_name: `${role.first_name} ${role.last_name}`,
          user_email: role.email
        }));
        setChapterRoles(mappedRoles);
      }

      // Load regional coordinators
      const coordinatorsResponse = await chapterRolesApi.getRegionalCoordinators();
      const coordinatorsPayload = unwrap(coordinatorsResponse);
      if (coordinatorsPayload?.coordinators) {
        setRegionalCoordinators(coordinatorsPayload.coordinators);
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
        return 'bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30';
      case 'regional_coordinator':
        return 'bg-[#0EA5E9]/15 text-[#0369A1] border-[#0EA5E9]/30';
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

  const filteredChapterRoles = useMemo(() => {
    const term = debouncedSearch;
    let list = chapterRoles.filter(cr =>
      (!term ||
        cr.chapter_name?.toLowerCase().includes(term) ||
        cr.user_name?.toLowerCase().includes(term) ||
        cr.role?.toLowerCase().includes(term)) &&
      (roleFilter === 'all' || cr.role === roleFilter) &&
      (!regionFilter || (cr.region || '').toLowerCase() === regionFilter) &&
      (!countryFilter || (cr.country || '').toLowerCase() === countryFilter)
    );

    list = list.sort((a, b) => {
      if (sortBy === 'chapter') {
        return (a.chapter_name || '').localeCompare(b.chapter_name || '');
      }
      return (a.user_name || '').localeCompare(b.user_name || '');
    });

    return list;
  }, [chapterRoles, debouncedSearch, roleFilter, sortBy, regionFilter, countryFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Chapter Roles Management</h2>
            <p className="text-gray-600 mt-1">Manage chapter-specific roles for multi-city administration</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="h-10 w-64 bg-gray-100 border border-gray-200 rounded-lg animate-pulse" />
            <div className="h-10 w-36 bg-gray-100 border border-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-24 bg-gray-100 border border-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-28 bg-gray-100 border border-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chapter Roles Management</h2>
          <p className="text-gray-600 mt-1">Manage chapter-specific roles for multi-city administration</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, chapter, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-opacity-40"
              style={{ 
                '--tw-ring-color': brandColors.primaryHex,
                borderColor: searchTerm ? brandColors.primaryHex : undefined
              } as React.CSSProperties}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | 'chapter_admin' | 'regional_coordinator')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-opacity-40"
            style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
          >
            <option value="all">All Roles</option>
            <option value="chapter_admin">Chapter Admin</option>
            <option value="regional_coordinator">Regional Coordinator</option>
          </select>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value.toLowerCase())}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-opacity-40"
            style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
          >
            <option value="">All Regions</option>
            {regionOptions.map((r, idx) => (
              <option key={`${r}-${idx}`} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value.toLowerCase())}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-opacity-40"
            style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
          >
            <option value="">All Countries</option>
            {countryOptions.map((c, idx) => (
              <option key={`${c}-${idx}`} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={() => setSortBy(sortBy === 'chapter' ? 'user' : 'chapter')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-opacity-40"
            style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
          >
            Sort by {sortBy === 'chapter' ? 'Chapter' : 'User'}
          </button>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-opacity-40"
            style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
          <button
            onClick={() => setShowAssignForm(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-40"
            style={{ backgroundColor: brandColors.primaryHex, '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
          >
            <UserCog className="w-4 h-4 mr-2" />
            Assign Role
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Crown className="w-8 h-8 text-[#F59E0B]" />
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
            <Users className="w-8 h-8 text-[#0EA5E9]" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Regional Coordinators</p>
              <p className="text-2xl font-bold text-gray-900">{regionalCoordinators.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <MapPin className="w-8 h-8" style={{ color: brandColors.primaryHex }} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Chapters</p>
              <p className="text-2xl font-bold text-gray-900">{chapters.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Admins Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Chapter Admins</h3>
          <p className="text-sm text-gray-600">Users managing specific chapters</p>
        </div>

        <div className="p-6">
          {chapterRoles.filter(r => r.role === 'chapter_admin').length === 0 ? (
            <p className="text-gray-500 text-center py-8">No chapter admins assigned yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chapterRoles.filter(r => r.role === 'chapter_admin').map((admin) => (
                <div key={admin.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${brandColors.primaryHex}20` }}>
                          {getRoleIcon(admin.role)}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {admin.user_name}
                        </h4>
                        <p className="text-sm text-gray-500">{admin.user_email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveRole(
                        admin.id,
                        admin.user_id,
                        admin.chapter_id,
                        admin.role
                      )}
                      disabled={actionLoading === `remove-${admin.id}`}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {actionLoading === `remove-${admin.id}` ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                  <div className="mt-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(admin.role)}`}>
                      {getRoleIcon(admin.role)}
                      <span className="ml-1">{getRoleDisplayName(admin.role)}</span>
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {admin.chapter_name} - {admin.chapter_location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${brandColors.primaryHex}20` }}>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-40"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-40"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-40"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
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
                    className="px-4 py-2 text-white rounded-lg disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-opacity-40"
                    style={{ 
                      backgroundColor: brandColors.primaryHex,
                      '--tw-ring-color': brandColors.primaryHex 
                    } as React.CSSProperties}
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
