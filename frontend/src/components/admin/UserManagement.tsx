import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { chaptersApi } from '../../services/api/chapters';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Shield,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Plus,
  Sparkles,
  Clock,
  TrendingUp
} from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  chapter: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  courseProgress?: number;
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isPlatformAdmin = currentUser?.role === 'platform_admin';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    chapter: 'addis-ababa',
    role: 'student'
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [chapters, setChapters] = useState<{id: number, name: string, location: string}[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchChapters();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers();
      setUsers(response.data.users);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async () => {
    try {
      console.log('Fetching chapters from API...');
      const response = await chaptersApi.getAllChapters();
      console.log('Chapters API response:', response);
      
      if (response.success && response.data && response.data.chapters) {
        console.log('Setting chapters:', response.data.chapters);
        setChapters(response.data.chapters);
      } else {
        console.error('Invalid response format:', response);
        throw new Error('Failed to fetch chapters - invalid response format');
      }
    } catch (err) {
      console.error('Error fetching chapters:', err);
      // Fallback to hardcoded chapters
      setChapters([
        { id: 1, name: 'addis-ababa', location: 'Addis Ababa, Ethiopia' },
        { id: 2, name: 'toronto', location: 'Toronto, Canada' },
        { id: 3, name: 'washington-dc', location: 'Washington DC, USA' },
        { id: 4, name: 'london', location: 'London, UK' },
      ]);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');
    try {
      await adminApi.createUser(newUser);
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        chapter: 'addis-ababa',
        role: 'student'
      });
      setShowCreateForm(false);
      await fetchUsers();
    } catch (err: any) {
      console.error('Failed to create user:', err);
      setError('Failed to create user: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      await adminApi.updateUserRole(userId, newRole);
      await fetchUsers();
    } catch (err: any) {
      console.error('Failed to update user role:', err);
      setError('Failed to update user role: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      await adminApi.updateUserStatus(userId, !currentStatus);
      await fetchUsers();
    } catch (err: any) {
      console.error('Failed to update user status:', err);
      setError('Failed to update user status: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'platform_admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'chapter_admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'teacher':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'student':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTimeAgo = (date: string | Date) => {
    const now = new Date();
    const userDate = typeof date === 'string' ? new Date(date) : date;
    const diffInHours = Math.floor((now.getTime() - userDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return userDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header Section - Compact */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-3 sm:p-4 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-lg sm:text-xl font-bold">User Management</h1>
              <div className="hidden sm:flex items-center space-x-1 text-blue-100">
                <Clock className="h-3 w-3" />
                <span className="text-xs">Updated {getTimeAgo(new Date())}</span>
              </div>
            </div>
            <p className="text-blue-100 text-xs sm:text-sm">
              Manage platform users, roles, and permissions
            </p>
            <p className="text-blue-200 text-xs mt-1">
              {currentUser?.firstName} {currentUser?.lastName} • {users.length} total users
            </p>
          </div>
          <div className="mt-3 lg:mt-0 lg:ml-4">
            <div className="flex flex-col sm:flex-row gap-1.5">
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm"
              >
                <Plus className="h-3 w-3 mr-1.5" />
                New User
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          { 
            name: 'Total Users', 
            value: users.length.toString(), 
            icon: Users, 
            change: '+12', 
            changeType: 'positive',
            color: 'from-blue-500 to-blue-600',
            bgColor: 'from-blue-50 to-blue-100'
          },
          { 
            name: 'Active Today', 
            value: users.filter(u => u.lastLogin && new Date(u.lastLogin).toDateString() === new Date().toDateString()).length.toString(), 
            icon: CheckCircle, 
            change: '+8', 
            changeType: 'positive',
            color: 'from-green-500 to-green-600',
            bgColor: 'from-green-50 to-green-100'
          },
          { 
            name: 'New This Week', 
            value: users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length.toString(), 
            icon: Sparkles, 
            change: '+5', 
            changeType: 'positive',
            color: 'from-purple-500 to-purple-600',
            bgColor: 'from-purple-50 to-purple-100'
          },
          { 
            name: 'Admins', 
            value: users.filter(u => u.role.includes('admin')).length.toString(), 
            icon: Shield, 
            change: '+2', 
            changeType: 'positive',
            color: 'from-orange-500 to-orange-600',
            bgColor: 'from-orange-50 to-orange-100'
          }
        ].map((stat, index) => (
          <div key={index} className={`bg-gradient-to-br ${stat.bgColor} rounded-lg p-2.5 sm:p-3 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className={`p-1.5 rounded-md bg-gradient-to-r ${stat.color} shadow-sm`}>
                <stat.icon className="h-3 w-3 text-white" />
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-2.5 w-2.5 text-green-600" />
                  <span className="text-xs font-medium text-green-700">{stat.change}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5">{stat.value}</p>
              <p className="text-xs text-gray-600 font-medium">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filter Section - Compact */}
      <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Role Filter */}
            <div className="sm:w-32">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="chapter_admin">Chapter Admins</option>
                <option value="platform_admin">Platform Admins</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="sm:w-28">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center">
            <XCircle className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 text-lg">
            ×
          </button>
        </div>
      )}

      {/* Create User Form - Compact */}
      {showCreateForm && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <UserPlus className="h-4 w-4 mr-1.5 text-blue-600" />
              Create New User
            </h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors text-lg"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleCreateUser} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={newUser.firstName}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={newUser.lastName}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={newUser.password}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                  placeholder="Set password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Chapter</label>
                <select
                  name="chapter"
                  value={newUser.chapter}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.name}>{ch.location}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="chapter_admin">Chapter Admin</option>
                  {isPlatformAdmin && <option value="platform_admin">Platform Admin</option>}
                </select>
              </div>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="submit"
                disabled={actionLoading === 'create'}
                className="flex items-center px-4 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'create' ? (
                  <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3 w-3 mr-1.5" />
                )}
                Create User
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Display - Card Grid */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredUsers.map((user) => (
            <div 
              key={user.id} 
              className={`relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 ${
                selectedUsers.includes(user.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
            >
              {/* Selection Checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers([...selectedUsers, user.id]);
                    } else {
                      setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* User Header */}
              <div className={`bg-gradient-to-r ${
                user.role === 'platform_admin' ? 'from-purple-500 to-purple-600' :
                user.role === 'chapter_admin' ? 'from-blue-500 to-blue-600' :
                user.role === 'teacher' ? 'from-green-500 to-green-600' :
                'from-gray-500 to-gray-600'
              } p-4 text-white`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center flex-1">
                    <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold truncate">{user.firstName} {user.lastName}</h3>
                      <p className="text-white/80 text-xs truncate flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors" title="View User">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors" title="Edit User">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="p-4">
                {/* Role and Status */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Role</p>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={actionLoading === user.id || String(user.id) === String(currentUser?.id)}
                      className={`w-full text-xs px-2 py-1 rounded-md border ${getRoleColor(user.role)} focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50`}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="chapter_admin">Chapter Admin</option>
                      {isPlatformAdmin && <option value="platform_admin">Platform Admin</option>}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <button
                      onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                      disabled={actionLoading === user.id}
                      className={`w-full flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 disabled:opacity-50 ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                      }`}
                    >
                      {user.isActive ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {user.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Chapter:</span>
                    <span className="font-medium capitalize">
                      {typeof user.chapter === 'string' 
                        ? user.chapter.replace(/-/g, ' ') 
                        : user.chapter || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Joined:</span>
                    <span className="font-medium flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(user.createdAt)}
                    </span>
                  </div>
                  {user.lastLogin && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Last Login:</span>
                      <span className="font-medium">{getTimeAgo(user.lastLogin)}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200">
                  <button className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </button>
                  <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors" title="Edit">
                    <Edit className="h-3 w-3" />
                  </button>
                  <button className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 transition-colors" title="Delete">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-6 sm:p-8 text-center shadow-sm">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {users.length === 0 ? 'No users yet' : 'No users found'}
          </h3>
          <p className="text-gray-600 text-sm mb-4 max-w-lg mx-auto">
            {users.length === 0 
              ? 'Create your first user to start managing platform access.'
              : 'Try adjusting your search or filter criteria to find what you\'re looking for.'
            }
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create First User
          </button>
        </div>
      )}
    </div>
  );
};

export default UserManagement;