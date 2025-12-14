import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '@/services/api';
import { chaptersApi } from '@/services/api/chapters';
import { useAuth } from '@/context/AuthContext';
import { brandColors } from '@/theme/brand';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Shield,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Plus,
  TrendingUp,
  UserCheck,
  UserX,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  chapter: string | number;
  chapterId?: number;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  profilePicture?: string;
}

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  const [searchParams] = useSearchParams();
  
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [timeFilter, setTimeFilter] = useState(searchParams.get('time') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'name');
  const [chapterFilter, setChapterFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Sync state with URL params
  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setStatusFilter(status);
    
    const time = searchParams.get('time');
    if (time) setTimeFilter(time);
    
    const sort = searchParams.get('sort');
    if (sort) setSortBy(sort);
  }, [searchParams]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [chapters, setChapters] = useState<{id: number, name: string, location: string}[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState<{ total: number; totalPages: number; page: number; limit: number }>({
    total: 0,
    totalPages: 1,
    page: 1,
    limit: 20,
  });
  const [counts, setCounts] = useState<{ total: number; active: number; inactive: number }>({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // New user form
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    chapter: '', // Will be set when chapters are loaded
    role: 'student'
  });

  // Fetch users
  const fetchUsers = useCallback(async (pageOverride?: number) => {
    const pageToLoad = pageOverride ?? currentPage;
    try {
      setLoading(users.length === 0);
      setIsInitialLoading(users.length === 0);
      setIsRefreshing(users.length > 0);
      setError(null);
      const payload = await adminApi.getUsers({
        page: pageToLoad,
        limit: itemsPerPage,
        search: searchTerm.trim() || undefined,
        role: roleFilter,
        status: statusFilter,
        chapter: chapterFilter !== 'all' ? chapterFilter : undefined,
        sortBy,
        sortOrder,
      });
      if (payload?.success && payload.data?.users) {
        setUsers(payload.data.users);
        const paginationData = payload.data.pagination || { total: payload.data.users.length, totalPages: 1, page: pageToLoad, limit: itemsPerPage };
        setPagination(paginationData);
        // Set immediate counts from current payload as fallback
        const activeLocal = payload.data.users.filter((u: any) => u.isActive).length;
        const inactiveLocal = payload.data.users.filter((u: any) => !u.isActive).length;
        const totalLocal = paginationData.total ?? payload.data.users.length ?? 0;
        setCounts({
          total: totalLocal,
          active: activeLocal,
          inactive: inactiveLocal,
        });
        // Refresh aggregated counts from server (may include full dataset)
        fetchCounts();
        setLastUpdated(new Date().toISOString());
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err?.response?.data?.message || 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setIsInitialLoading(false);
    }
  }, [currentPage, itemsPerPage, roleFilter, searchTerm, sortBy, statusFilter, users.length]);

  // Fetch chapters
  const fetchChapters = useCallback(async () => {
    try {
      const response = await chaptersApi.getChapters();
      if (response.success && response.data?.chapters) {
        setChapters(response.data.chapters);
        // Set default chapter to first available chapter
        if (response.data.chapters.length > 0 && !newUser.chapter) {
          setNewUser(prev => ({ ...prev, chapter: response.data.chapters[0].id.toString() }));
        }
      } else {
        console.warn('Failed to fetch chapters, using empty list');
        setChapters([]);
      }
    } catch (err) {
      console.error('Error fetching chapters:', err);
      setChapters([]);
    }
  }, [newUser.chapter]);

  const fetchCounts = useCallback(async () => {
    try {
      const unpack = (res: any) => {
        const base = res?.data ?? res;
        const data = base?.data ?? base;
        return {
          pagination: data?.pagination,
          users: data?.users || [],
        };
      };

      const baseParams = {
        limit: 1,
        page: 1,
        search: searchTerm.trim() || undefined,
        role: roleFilter,
        chapter: chapterFilter !== 'all' ? chapterFilter : undefined,
        sortBy,
        sortOrder,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };

      const [totalRes, activeRes, inactiveRes] = await Promise.all([
        adminApi.getUsers(baseParams),
        adminApi.getUsers({ ...baseParams, status: 'active' }),
        adminApi.getUsers({ ...baseParams, status: 'inactive' }),
      ]);

      const totalPayload = unpack(totalRes);
      const activePayload = unpack(activeRes);
      const inactivePayload = unpack(inactiveRes);

      setCounts({
        total: totalPayload.pagination?.total ?? totalPayload.users.length ?? 0,
        active: activePayload.pagination?.total ?? activePayload.users.length ?? 0,
        inactive: inactivePayload.pagination?.total ?? inactivePayload.users.length ?? 0,
      });
    } catch (err) {
      console.error('Failed to fetch counts', err);
    }
  }, [roleFilter, searchTerm, statusFilter, chapterFilter, sortBy, sortOrder]);

  // Debounce search/filters before firing fetch
  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers(1);
      fetchCounts();
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm, roleFilter, statusFilter, timeFilter, sortBy, sortOrder, chapterFilter, itemsPerPage, fetchUsers, fetchCounts]);

  useEffect(() => {
    fetchUsers();
    fetchChapters();
    fetchCounts();
  }, [fetchUsers, fetchChapters, fetchCounts]);

  // Server-paginated users
  const paginatedUsers = useMemo(() => users, [users]);
  const totalPages = pagination.totalPages || 1;
  const startIndex = users.length === 0 ? 0 : (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + paginatedUsers.length;

  // Stats (server-backed counts)
  const stats = useMemo(() => ({
    total: counts.total,
    active: counts.active,
    inactive: counts.inactive,
    activeToday: null,
    newThisWeek: null,
    admins: null,
  }), [counts]);

  // Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');
    try {
      await adminApi.createUser(newUser);
      // Reset form with first available chapter or empty
      const firstChapterId = chapters.length > 0 ? chapters[0].id.toString() : '';
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        chapter: firstChapterId,
        role: 'student'
      });
      setShowCreateForm(false);
      await fetchUsers();
      // Show success notification
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'User created successfully',
      });
    } catch (err: any) {
      console.error('Failed to create user:', err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.message || 'Failed to create user',
      });
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
      setError(err.response?.data?.message || 'Failed to update user role');
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
      setError(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const ok = await confirm({
      title: t('admin.users.delete_confirm_title'),
      message: t('admin.users.delete_confirm_body'),
      confirmLabel: t('admin.users.delete_confirm_cta'),
      cancelLabel: t('common.cancel'),
      variant: 'danger'
    });
    if (!ok) return;
    
    setActionLoading(userId);
    try {
      await adminApi.deleteUser(userId);
      await fetchUsers();
      // Show success notification
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'User deleted successfully',
      });
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.message || 'Failed to delete user',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setActionLoading('edit');
    try {
      await adminApi.updateUser({
        userId: editingUser.id,
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        role: editingUser.role,
        chapter: editingUser.chapterId || editingUser.chapter,
        isActive: editingUser.isActive
      });
      setShowEditModal(false);
      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Failed to update user:', err);
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser({...user});
    setShowEditModal(true);
  };

  const handleBulkStatusChange = async (isActive: boolean) => {
    if (selectedUsers.length === 0) return;
    const confirmed = window.confirm(`Are you sure you want to ${isActive ? 'activate' : 'deactivate'} ${selectedUsers.length} user(s)?`);
    if (!confirmed) return;
    setActionLoading('bulk');
    try {
      await Promise.all(
        selectedUsers.map(userId => 
          adminApi.updateUserStatus(userId, isActive)
        )
      );
      setSelectedUsers([]);
      await fetchUsers();
    } catch (err: any) {
      console.error('Failed to update users:', err);
      setError('Failed to update users');
    } finally {
      setActionLoading(null);
    }
  };

  const exportCsv = async () => {
    try {
      setActionLoading('export');
      const payload = await adminApi.getUsers({
        page: 1,
        limit: 1000,
        search: searchTerm.trim() || undefined,
        role: roleFilter,
        status: statusFilter,
        chapter: chapterFilter !== 'all' ? chapterFilter : undefined,
        sortBy,
        sortOrder,
      });
      const data = payload?.data?.users || [];
      const header = ['First Name', 'Last Name', 'Email', 'Role', 'Chapter', 'Active', 'Created At', 'Last Login'];
      const rows = data.map((u: any) => [
        u.firstName || '',
        u.lastName || '',
        u.email || '',
        u.role || '',
        u.chapter || '',
        u.isActive ? 'Active' : 'Inactive',
        u.createdAt || '',
        u.lastLogin || '',
      ]);
      const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'users.csv';
      link.click();
      URL.revokeObjectURL(url);
      setActionLoading(null);
    } catch (err) {
      console.error('Failed to export CSV', err);
      setError('Failed to export CSV. Please try again.');
      setActionLoading(null);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
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
    return formatDate(userDate.toString());
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'regional_coordinator':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'chapter_admin':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'teacher':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'student':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Platform Admin';
      case 'regional_coordinator':
        return 'Regional Coordinator';
      case 'chapter_admin':
        return 'Chapter Admin';
      case 'teacher':
        return 'Teacher';
      case 'student':
        return 'Student';
      default:
        return role;
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 p-4 space-y-4">
        <div className="h-10 bg-white border border-stone-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-24 bg-white border border-stone-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse mb-3" />
          <div className="grid gap-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-12 bg-gray-100 rounded-md animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        {/* Compact Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-stone-600">
              {stats.total} total users • {stats.active} active • {stats.inactive} inactive
            </span>
            {lastUpdated && (
              <span className="text-xs px-2 py-1 rounded-full border border-stone-200 bg-white text-stone-600">
                Last updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchUsers}
              disabled={loading || isRefreshing}
              className="inline-flex items-center px-3 py-1.5 bg-white/90 backdrop-blur-sm hover:bg-white text-stone-800 text-xs font-medium rounded-md transition-all border shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-40 disabled:opacity-50"
              style={{ 
                borderColor: `${brandColors.primaryHex}40`,
                '--tw-ring-color': brandColors.primaryHex 
              } as React.CSSProperties}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} style={{ color: brandColors.primaryHex }} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center px-3 py-1.5 text-white text-xs font-medium rounded-md transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-40"
              style={{ 
                backgroundColor: brandColors.primaryHex,
                '--tw-ring-color': brandColors.primaryHex 
              } as React.CSSProperties}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New User
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Total', value: stats.total, icon: Users, textColor: 'text-[#1F7A4C]', bgColor: 'bg-[#1F7A4C]/10', borderColor: 'border-[#1F7A4C]/25', glowColor: 'bg-[#1F7A4C]/15' },
            { name: 'Active', value: stats.active, icon: CheckCircle, textColor: 'text-[#0EA5E9]', bgColor: 'bg-[#0EA5E9]/10', borderColor: 'border-[#0EA5E9]/25', glowColor: 'bg-[#0EA5E9]/15' },
            { name: 'Inactive', value: stats.inactive, icon: XCircle, textColor: 'text-[#E53935]', bgColor: 'bg-[#E53935]/10', borderColor: 'border-[#E53935]/25', glowColor: 'bg-[#E53935]/15' },
          ].filter(stat => stat.value !== null && stat.value !== undefined).map((stat, index) => (
            <div key={index} className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-4 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className={`relative ${stat.textColor}`} style={stat.name === 'Total' || stat.name === 'Admins' ? { color: brandColors.primaryHex } : undefined}>
                  <div className={`absolute inset-0 ${stat.glowColor} rounded-lg blur-md`} style={stat.name === 'Total' || stat.name === 'Admins' ? { backgroundColor: `${brandColors.primaryHex}26` } : undefined}></div>
                  <div className={`relative p-2 ${stat.bgColor} rounded-lg border ${stat.borderColor}`} style={stat.name === 'Total' || stat.name === 'Admins' ? { backgroundColor: `${brandColors.primaryHex}1A`, borderColor: `${brandColors.primaryHex}40` } : undefined}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold text-stone-800">{stat.value}</p>
              <p className="text-xs text-stone-600 font-medium">{stat.name}</p>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 bg-white/90 backdrop-blur-sm"
                  style={{ 
                    '--tw-ring-color': brandColors.primaryHex,
                    borderColor: searchTerm ? brandColors.primaryHex : undefined
                  } as React.CSSProperties}
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 bg-white/90 backdrop-blur-sm"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="chapter_admin">Chapter Admins</option>
                  <option value="regional_coordinator">Regional Coordinators</option>
                  <option value="admin">Platform Admins</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 bg-white/90 backdrop-blur-sm"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <select
                  value={chapterFilter}
                  onChange={(e) => {
                    setChapterFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 bg-white/90 backdrop-blur-sm"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                >
                  <option value="all">All Chapters</option>
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name || c.location || `Chapter ${c.id}`}</option>
                  ))}
                </select>

                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-2 ${viewMode === 'table' ? 'text-white font-semibold' : 'bg-white/90 text-stone-700 hover:bg-stone-50'}`}
                    style={viewMode === 'table' ? { backgroundColor: brandColors.primaryHex } : undefined}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 border-l border-stone-300 ${viewMode === 'grid' ? 'text-white font-semibold' : 'bg-white/90 text-stone-700 hover:bg-stone-50'}`}
                    style={viewMode === 'grid' ? { backgroundColor: brandColors.primaryHex } : undefined}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Actions row */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={fetchUsers}
                  disabled={loading || isRefreshing}
                  className="inline-flex items-center px-3 py-1.5 bg-white/90 backdrop-blur-sm hover:bg-white text-stone-800 text-xs font-medium rounded-md transition-all border shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-40 disabled:opacity-50"
                  style={{ 
                    borderColor: `${brandColors.primaryHex}40`,
                    '--tw-ring-color': brandColors.primaryHex 
                  } as React.CSSProperties}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} style={{ color: brandColors.primaryHex }} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center px-3 py-1.5 bg-white text-stone-800 text-xs font-medium rounded-md border border-stone-300 hover:bg-stone-50"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="inline-flex items-center px-3 py-1.5 text-white text-xs font-medium rounded-md transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-40"
                  style={{ 
                    backgroundColor: brandColors.primaryHex,
                    '--tw-ring-color': brandColors.primaryHex 
                  } as React.CSSProperties}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New User
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              className="px-3 py-1.5 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-40"
              style={{ 
                backgroundColor: brandColors.primaryHex,
                '--tw-ring-color': brandColors.primaryHex 
              } as React.CSSProperties}
            >
              Retry
            </button>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-white border rounded-lg p-4 flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2" style={{ borderColor: brandColors.primaryHex }}>
          <div className="flex items-center space-x-4">
            <span className="font-bold" style={{ color: brandColors.primaryHex }}>
              {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkStatusChange(true)}
                disabled={actionLoading === 'bulk'}
                className="inline-flex items-center px-3 py-1.5 text-white text-sm font-semibold rounded-lg disabled:opacity-50 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-40"
                style={{ 
                  backgroundColor: brandColors.primaryHex,
                  '--tw-ring-color': brandColors.primaryHex 
                } as React.CSSProperties}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Activate
              </button>
              <button
                onClick={() => handleBulkStatusChange(false)}
                disabled={actionLoading === 'bulk'}
                className="inline-flex items-center px-3 py-1.5 bg-white text-red-600 border border-red-200 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 shadow-sm transition-colors"
              >
                <UserX className="h-4 w-4 mr-1" />
                Deactivate
              </button>
            </div>
          </div>
          <button
            onClick={() => setSelectedUsers([])}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-stone-800 flex items-center">
              <UserPlus className="h-5 w-5 mr-2" style={{ color: brandColors.secondaryHex }} />
              Create New User
            </h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-stone-400 hover:text-stone-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                <select
                  name="chapter"
                  value={newUser.chapter}
                  onChange={(e) => setNewUser({...newUser, chapter: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-40"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                >
                  <option value="">Select Chapter</option>
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} - {ch.location || 'No location'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-40"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="chapter_admin">Chapter Admin</option>
                  <option value="regional_coordinator">Regional Coordinator</option>
                  <option value="admin">Platform Admin</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="submit"
                disabled={actionLoading === 'create'}
                className="flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-opacity-40"
                style={{ 
                  backgroundColor: brandColors.primaryHex,
                  '--tw-ring-color': brandColors.primaryHex 
                } as React.CSSProperties}
              >
                {actionLoading === 'create' ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Create User
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Display */}
      {isInitialLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="animate-pulse grid grid-cols-6 gap-3 text-left text-xs text-gray-500">
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-1 h-4 bg-gray-200 rounded" />
                <div className="col-span-1 h-4 bg-gray-200 rounded" />
                <div className="col-span-1 h-4 bg-gray-200 rounded" />
                <div className="col-span-1 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : paginatedUsers.length > 0 ? (
        <>
          {viewMode === 'table' ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto relative">
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] animate-pulse pointer-events-none z-10" />
                )}
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                          style={{ color: brandColors.primaryHex, '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Chapter</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Joined</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Login</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="rounded border-gray-300"
                            style={{ color: brandColors.primaryHex, '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div 
                              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold mr-3"
                              style={{ background: `linear-gradient(to right, ${brandColors.primaryHex}, ${brandColors.secondaryHex})` }}
                            >
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            disabled={actionLoading === user.id || String(user.id) === String(currentUser?.id)}
                            className={`text-xs px-2 py-1 rounded-md border ${getRoleColor(user.role)} focus:ring-2 focus:border-transparent disabled:opacity-50`}
                            style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                          >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="chapter_admin">Chapter Admin</option>
                            <option value="regional_coordinator">Regional Coordinator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-900 capitalize">
                            {typeof user.chapter === 'string' 
                              ? user.chapter.replace(/-/g, ' ') 
                              : chapters.find(c => c.id === user.chapter)?.location || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                            disabled={actionLoading === user.id}
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-50 hover:opacity-80 ${
                              user.isActive
                                ? ''
                                : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                            }`}
                            style={user.isActive ? {
                              backgroundColor: `${brandColors.primaryHex}1A`,
                              color: brandColors.primaryHex,
                              borderColor: `${brandColors.primaryHex}33`
                            } : undefined}
                          >
                            {user.isActive ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {user.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {user.lastLogin ? getTimeAgo(user.lastLogin) : 'Never'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserModal(true);
                              }}
                              className="p-1.5 text-gray-600 hover:text-[#27AE60] hover:bg-[#27AE60]/10 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={actionLoading === user.id || String(user.id) === String(currentUser?.id)}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    Showing {paginatedUsers.length === 0 ? 0 : startIndex + 1} to {endIndex} of {pagination.total} users
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all relative"
                >
                  {isRefreshing && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] animate-pulse pointer-events-none z-10" />
                  )}
                  <div className="p-4 text-white" style={{ backgroundColor: brandColors.primaryHex }}>
                    <div className="flex items-center justify-between">
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
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Role</p>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={actionLoading === user.id || String(user.id) === String(currentUser?.id)}
                          className={`w-full text-xs px-2 py-1 rounded-md border ${getRoleColor(user.role)} focus:ring-2 focus:ring-opacity-50 disabled:opacity-50`}
                          style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="chapter_admin">Chapter Admin</option>
                          <option value="regional_coordinator">Regional Coordinator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <button
                          onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                          disabled={actionLoading === user.id}
                          className={`w-full flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-50 ${
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

                    <div className="space-y-2 text-xs text-gray-600 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Chapter:</span>
                        <span className="font-medium capitalize">
                          {typeof user.chapter === 'string' 
                            ? user.chapter.replace(/-/g, ' ') 
                            : chapters.find(c => c.id === user.chapter)?.location || 'N/A'}
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

                    <div className="flex space-x-2 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                        className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white transition-colors"
                        style={{ backgroundColor: brandColors.secondaryHex }}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </button>
                      <button 
                        onClick={() => openEditModal(user)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={actionLoading === user.id || String(user.id) === String(currentUser?.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-200 text-xs font-medium rounded-lg text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {users.length === 0 ? 'No users yet' : 'No users found'}
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {users.length === 0 
              ? 'Create your first user to start managing platform access.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {users.length === 0 && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First User
            </button>
          )}
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="h-20 w-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mr-4" style={{ background: `linear-gradient(to right, ${brandColors.primaryHex}, ${brandColors.secondaryHex})` }}>
                  {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</h4>
                  <p className="text-gray-600 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Role</p>
                  <p className="text-base font-medium text-gray-900">{getRoleBadge(selectedUser.role)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <p className={`text-base font-medium ${selectedUser.isActive ? '' : 'text-red-600'}`} style={selectedUser.isActive ? { color: brandColors.secondaryHex } : undefined}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Chapter</p>
                  <p className="text-base font-medium text-gray-900 capitalize">
                    {typeof selectedUser.chapter === 'string' 
                      ? selectedUser.chapter.replace(/-/g, ' ') 
                      : chapters.find(c => c.id === selectedUser.chapter)?.location || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Joined</p>
                  <p className="text-base font-medium text-gray-900">{formatDate(selectedUser.createdAt)}</p>
                </div>
                {selectedUser.lastLogin && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Last Login</p>
                    <p className="text-base font-medium text-gray-900">{getTimeAgo(selectedUser.lastLogin)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Edit className="h-5 w-5 mr-2" style={{ color: brandColors.secondaryHex }} />
                Edit User
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditUser} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-40"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                    disabled={String(editingUser.id) === String(currentUser?.id)}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="chapter_admin">Chapter Admin</option>
                    <option value="regional_coordinator">Regional Coordinator</option>
                    <option value="admin">Platform Admin</option>
                  </select>
                  {String(editingUser.id) === String(currentUser?.id) && (
                    <p className="text-xs text-gray-500 mt-1">You cannot change your own role</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                  <select
                    value={editingUser.chapterId || editingUser.chapter}
                    onChange={(e) => setEditingUser({...editingUser, chapterId: parseInt(e.target.value), chapter: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-40"
                    style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  >
                    {chapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>{ch.location}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingUser.isActive}
                      onChange={(e) => setEditingUser({...editingUser, isActive: e.target.checked})}
                      className="rounded border-gray-300 focus:ring-opacity-50 mr-2"
                      style={{ color: brandColors.secondaryHex, '--tw-ring-color': brandColors.secondaryHex } as React.CSSProperties}
                    />
                    <span className="text-sm font-medium text-gray-700">Active Account</span>
                  </label>
                </div>
              </div>
              <div className="flex space-x-2 pt-4 mt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={actionLoading === 'edit'}
                  className="flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: brandColors.primaryHex }}
                >
                  {actionLoading === 'edit' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Edit className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
