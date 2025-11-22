import React, { useState, useEffect } from 'react';
import { Shield, Users, Settings, Eye, Edit, Trash2, Plus, Save, X } from 'lucide-react';
import { adminApi } from '@/services/api/admin';
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
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<{[role: string]: RolePermission[]}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const roles = ['admin', 'teacher', 'user'];

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
      setError('Failed to load roles and permissions data');
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

      // Reload data
      await loadData();
    } catch (err: any) {
      console.error('Error updating permission:', err);
      setError('Failed to update permission');
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
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-t-2 border-[#E74C3C] border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Roles & Permissions</h2>
          <p className="text-gray-600 mt-1">Manage user roles and access permissions</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-[#E74C3C] text-white rounded-lg hover:bg-[#c0392b] transition-colors"
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

      {/* Permissions Matrix */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Permission Matrix</h3>
          <p className="text-gray-600 mt-1">Configure which permissions each role has access to</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permission
                </th>
                {roles.map(role => (
                  <th key={role} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-2">
                      {role === 'admin' && <Shield className="h-4 w-4" />}
                      {role === 'teacher' && <Users className="h-4 w-4" />}
                      {role === 'user' && <Eye className="h-4 w-4" />}
                      {role.charAt(0).toUpperCase() + role.slice(1)}
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
                        <Settings className="h-4 w-4 text-[#E74C3C]" />
                        <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                          {category.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Category Permissions */}
                  {getPermissionsByCategory(category).map(permission => (
                    <tr key={permission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {permission.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {permission.description}
                          </div>
                          <div className="text-xs text-gray-400 font-mono mt-1">
                            {permission.permission_key}
                          </div>
                        </div>
                      </td>
                      {roles.map(role => {
                        const hasPermission = rolePermissions[role]?.some(rp => rp.permission_id === permission.id);
                        const isDisabled = role === 'admin' && permission.permission_key === 'system:admin';

                        return (
                          <td key={role} className="px-6 py-4 text-center">
                            <button
                              onClick={() => !isDisabled && togglePermission(role, permission.id, hasPermission)}
                              disabled={isDisabled}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                                hasPermission
                                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              } ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            >
                              {hasPermission ? (
                                <Shield className="h-4 w-4" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
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
      </div>

      {/* Role Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.map(role => (
          <div key={role} className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              {role === 'admin' && <Shield className="h-8 w-8 text-[#E74C3C]" />}
              {role === 'teacher' && <Users className="h-8 w-8 text-blue-600" />}
              {role === 'user' && <Eye className="h-8 w-8 text-green-600" />}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">{role}</h3>
                <p className="text-sm text-gray-600">
                  {role === 'admin' && 'Full system access and management'}
                  {role === 'teacher' && 'Course creation and student management'}
                  {role === 'user' && 'Access to courses and learning materials'}
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
