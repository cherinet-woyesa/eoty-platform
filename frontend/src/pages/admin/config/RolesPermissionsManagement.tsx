import React, { useState, useEffect } from 'react';
import { Shield, Users, Settings, Eye, Edit, Trash2, Plus, Save, X } from 'lucide-react';
import { adminApi } from '@/services/api/admin';
import { useNotification } from '@/context/NotificationContext';
import LoadingButton from '@/components/shared/auth/LoadingButton';
import FormError from '@/components/shared/auth/FormError';

interface Permission {
  id: number;
  permission_key: string;
  name: string;
  description: string;
  category: string;
}

interface RolePermission {
  id: number;
  role: string;
  permission_id: number;
  permission_key: string;
  name: string;
  description: string;
}

const RolesPermissionsManagement: React.FC = () => {
  const { showNotification } = useNotification();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<{[role: string]: RolePermission[]}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const roles = ['admin', 'regional_coordinator', 'chapter_admin', 'teacher', 'student'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load all permissions and role permissions
      const [permissionsRes, rolesRes] = await Promise.all([
        adminApi.getPermissions(),
        adminApi.getRolePermissions()
      ]);

      if (permissionsRes.success) {
        setPermissions(permissionsRes.data.permissions);
      }

      if (rolesRes.success) {
        // Group permissions by role
        const grouped: {[role: string]: RolePermission[]} = {};
        roles.forEach(role => {
          grouped[role] = rolesRes.data.filter((rp: RolePermission) => rp.role === role);
        });
        setRolePermissions(grouped);
      }
    } catch (err: any) {
      console.error('Error loading roles and permissions:', err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load roles and permissions data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = async (role: string, permissionId: number, hasPermission: boolean) => {
    try {
      setError(null);

      if (hasPermission) {
        // Remove permission
        await adminApi.removeRolePermission(role, permissionId);
      } else {
        // Add permission
        await adminApi.addRolePermission(role, permissionId);
      }

      showNotification({
        type: 'success',
        title: 'Success',
        message: `Permission ${hasPermission ? 'removed' : 'granted'} successfully`
      });

      // Reload data
      await loadData();
    } catch (err: any) {
      console.error('Error updating permission:', err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update permission'
      });
    }
  };

  const getPermissionCategories = () => {
    const categories = [...new Set(permissions.map(p => p.category))];
    return categories;
  };

  const getPermissionsByCategory = (category: string) => {
    return permissions.filter(p => p.category === category);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-8 h-8 border-t-2 border-[#27AE60] border-solid rounded-full animate-spin"></div>
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Loading Permissions</h3>
          <p className="text-gray-600">Fetching role and permission data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Roles & Permissions</h2>
          <p className="text-gray-600 mt-1">Manage user roles and access permissions</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#219150] transition-colors whitespace-nowrap"
        >
          <Settings className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <FormError
          type="error"
          message={error}
          dismissible={true}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Guide Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Settings className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900">How to Manage Permissions</h3>
            <p className="text-sm text-blue-700 mt-1">
              This matrix allows you to control what each user role can do in the system.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700 list-disc list-inside">
              <li><strong>Rows</strong> represent specific actions (e.g., "Create Course").</li>
              <li><strong>Columns</strong> represent user roles (e.g., "Teacher").</li>
              <li>Click the toggle switch to <strong>Grant</strong> (Green) or <strong>Revoke</strong> (Gray) a permission.</li>
              <li>Some permissions are locked (e.g., Admin always has full access) to prevent system lockouts.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Permission Matrix</h3>
              <p className="text-gray-600 mt-1">Configure which permissions each role has access to</p>
            </div>
            <div className="text-sm text-gray-500 text-right">
              <div>Permissions: {permissions.length}</div>
              <div>Role Assignments: {Object.values(rolePermissions).reduce((sum, perms) => sum + perms.length, 0)}</div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          {permissions.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Permissions Found</h3>
              <p className="text-gray-600">Unable to load permissions data. Please check your connection and try again.</p>
              <button
                onClick={loadData}
                className="mt-4 px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#219150] transition-colors"
              >
                Retry Loading
              </button>
            </div>
          ) : (
            <div className="min-w-max">
              <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                  Permission
                </th>
                {roles.map(role => (
                  <th key={role} className="px-2 sm:px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[120px] bg-gray-100 border-x border-gray-200">
                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                      {role === 'admin' && <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-[#27AE60]" />}
                      {role === 'teacher' && <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />}
                      {role === 'student' && <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />}
                      <span className="font-bold text-gray-800">{role.replace('_', ' ').toUpperCase()}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getPermissionCategories().map(category => (
                <React.Fragment key={category}>
                  {/* Category Header */}
                  <tr className="bg-gray-100">
                    <td colSpan={roles.length + 1} className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-[#27AE60]" />
                        <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                          {category.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Category Permissions */}
                  {getPermissionsByCategory(category).map(permission => (
                    <tr key={permission.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 min-w-[300px]">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900 break-words">
                            {permission.name}
                          </div>
                          <div className="text-sm text-gray-500 leading-relaxed break-words">
                            {permission.description}
                          </div>
                        </div>
                      </td>
                      {roles.map(role => {
                        const hasPermission = rolePermissions[role]?.some(rp => rp.permission_id === permission.id);
                        const isDisabled = role === 'admin' && permission.permission_key === 'system:admin';

                        return (
                          <td key={role} className="px-2 sm:px-6 py-4 text-center min-w-[120px]">
                            <button
                              onClick={() => !isDisabled && togglePermission(role, permission.id, hasPermission)}
                              disabled={isDisabled}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:ring-offset-2 ${
                                hasPermission ? 'bg-[#27AE60]' : 'bg-gray-200'
                              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={`${hasPermission ? 'Revoke' : 'Grant'} ${permission.name} permission for ${role}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  hasPermission ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Helper Text */}
      <div className="md:hidden bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Eye className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Tip: Scroll horizontally</h4>
            <p className="text-sm text-blue-700 mt-1">
              Swipe left/right to view all role permissions and manage access controls.
            </p>
          </div>
        </div>
      </div>

      {/* Debug Panel - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">Debug Information</h4>
          <div className="text-xs text-yellow-800 space-y-1">
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
            <div>Permissions Count: {permissions.length}</div>
            <div>Role Permissions: {Object.keys(rolePermissions).length} roles loaded</div>
            <div>Admin Permissions: {rolePermissions.admin?.length || 0}</div>
            <div>Teacher Permissions: {rolePermissions.teacher?.length || 0}</div>
            <div>User Permissions: {rolePermissions.user?.length || 0}</div>
            {error && <div className="text-red-600">Error: {error}</div>}
          </div>
        </div>
      )}

      {/* Role Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.map(role => (
          <div key={role} className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              {role === 'admin' && <Shield className="h-8 w-8 text-[#27AE60]" />}
              {role === 'teacher' && <Users className="h-8 w-8 text-blue-600" />}
              {(role === 'user' || role === 'student') && <Eye className="h-8 w-8 text-green-600" />}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {role === 'student' ? 'member' : role === 'user' ? 'member' : role.replace(/_/g, ' ')}
                </h3>
                <p className="text-sm text-gray-600">
                  {role === 'admin' && 'Full system access and management'}
                  {role === 'teacher' && 'Course creation and member management'}
                  {(role === 'user' || role === 'student') && 'Access to courses and learning materials'}
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <strong>{rolePermissions[role]?.length || 0}</strong> permissions assigned
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RolesPermissionsManagement;
