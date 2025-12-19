import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, UserCheck, UserX, Mail, MoreVertical, Eye, Edit, Shield } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'chapter_admin' | 'admin';
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  joinDate: string;
  lastActive: string;
  coursesEnrolled?: number;
  coursesCreated?: number;
  avatar?: string;
}

interface UserManagementPreviewProps {
  users?: User[];
  compact?: boolean;
}

const UserManagementPreview: React.FC<UserManagementPreviewProps> = ({
  users = [],
  compact = false
}) => {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'chapter_admin':
        return 'bg-blue-100 text-blue-800';
      case 'teacher':
        return 'bg-green-100 text-green-800';
      case 'student':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'chapter_admin':
        return <Shield className="h-3 w-3" />;
      case 'teacher':
        return <UserCheck className="h-3 w-3" />;
      case 'student':
        return <Users className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const lastActive = new Date(timestamp);
    const diff = now.getTime() - lastActive.getTime();

    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const handleUserAction = useCallback((userId: string, action: string) => {
    // Action handling would be implemented here
    // In development, we can log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[UserManagementPreview] Action ${action} on user ${userId}`);
    }
  }, []);

  const pendingUsers = users.filter(user => user.status === 'pending');
  const recentUsers = users
    .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())
    .slice(0, compact ? 4 : 6);

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
          <Link
            to="/admin/all-users"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage All
          </Link>
        </div>

        {/* Pending Users Alert */}
        {pendingUsers.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {pendingUsers.length} users pending approval
              </span>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="space-y-3">
          {recentUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs text-white font-medium">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {user.name}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="ml-1">{user.role.replace('_', ' ')}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{user.email}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(user.lastActive)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                  {user.status}
                </span>
                <button
                  onClick={() => handleUserAction(user.id, 'view')}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No users available</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">{users.length}</div>
            <div className="text-xs text-gray-500">Total Users</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">{pendingUsers.length}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage platform users and permissions</p>
        </div>
        <Link
          to="/admin/all-users"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Manage Users
        </Link>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{users.length}</div>
          <div className="text-sm text-blue-700">Total Users</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {users.filter(user => user.status === 'active').length}
          </div>
          <div className="text-sm text-green-700">Active</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {users.filter(user => user.status === 'pending').length}
          </div>
          <div className="text-sm text-yellow-700">Pending</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {users.filter(user => user.status === 'suspended').length}
          </div>
          <div className="text-sm text-red-700">Suspended</div>
        </div>
      </div>

      {/* Role Distribution */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {['student', 'teacher', 'chapter_admin', 'admin'].map((role) => {
          const count = users.filter(user => user.role === role).length;
          return (
            <div key={role} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-600 capitalize">{role.replace('_', ' ')}s</div>
            </div>
          );
        })}
      </div>

      {/* Recent Users */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Recent Users</h3>
        {recentUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-sm text-white font-medium">
                  {user.name.charAt(0)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {user.name}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                    {getRoleIcon(user.role)}
                    <span className="ml-1">{user.role.replace('_', ' ')}</span>
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2 truncate">
                  {user.email}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Joined {formatDate(user.joinDate)}</span>
                  <span>•</span>
                  <span>Last active {formatTimeAgo(user.lastActive)}</span>
                  {user.coursesEnrolled !== undefined && (
                    <>
                      <span>•</span>
                      <span>{user.coursesEnrolled} courses</span>
                    </>
                  )}
                  {user.coursesCreated !== undefined && (
                    <>
                      <span>•</span>
                      <span>{user.coursesCreated} created</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => handleUserAction(user.id, 'view')}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="View user"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleUserAction(user.id, 'edit')}
                className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                title="Edit user"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleUserAction(user.id, 'more')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No users yet</h3>
          <p className="text-gray-600">
            User management data will appear here once users register on the platform.
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 flex items-center space-x-3">
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </button>
        <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
          <Mail className="h-4 w-4 mr-2" />
          Send Invites
        </button>
        <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
          <UserCheck className="h-4 w-4 mr-2" />
          Approve Pending
        </button>
      </div>
    </div>
  );
};

export default React.memo(UserManagementPreview);