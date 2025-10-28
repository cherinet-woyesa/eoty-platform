exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('role_permissions').del()
    .then(() => {
      // Get all permissions with their IDs
      return knex('user_permissions').select('id', 'permission_key');
    })
    .then(permissions => {
      // Create a map of permission keys to IDs
      const permissionMap = {};
      permissions.forEach(p => {
        permissionMap[p.permission_key] = p.id;
      });
      
      // Map permissions to roles using actual permission IDs
      const rolePermissions = [
        // Student permissions
        { role: 'student', permission_id: permissionMap['course:view'] },
        { role: 'student', permission_id: permissionMap['lesson:view'] },
        { role: 'student', permission_id: permissionMap['quiz:take'] },
        { role: 'student', permission_id: permissionMap['discussion:view'] },
        { role: 'student', permission_id: permissionMap['discussion:create'] },
        { role: 'student', permission_id: permissionMap['user:edit_own'] },
        { role: 'student', permission_id: permissionMap['chapter:view'] },
        
        // Teacher permissions (includes all student permissions + more)
        { role: 'teacher', permission_id: permissionMap['course:view'] },
        { role: 'teacher', permission_id: permissionMap['course:create'] },
        { role: 'teacher', permission_id: permissionMap['course:edit_own'] },
        { role: 'teacher', permission_id: permissionMap['course:delete_own'] },
        { role: 'teacher', permission_id: permissionMap['lesson:view'] },
        { role: 'teacher', permission_id: permissionMap['lesson:create'] },
        { role: 'teacher', permission_id: permissionMap['lesson:edit_own'] },
        { role: 'teacher', permission_id: permissionMap['lesson:delete_own'] },
        { role: 'teacher', permission_id: permissionMap['video:upload'] },
        { role: 'teacher', permission_id: permissionMap['video:delete_own'] },
        { role: 'teacher', permission_id: permissionMap['quiz:take'] },
        { role: 'teacher', permission_id: permissionMap['quiz:create'] },
        { role: 'teacher', permission_id: permissionMap['quiz:edit_own'] },
        { role: 'teacher', permission_id: permissionMap['discussion:view'] },
        { role: 'teacher', permission_id: permissionMap['discussion:create'] },
        { role: 'teacher', permission_id: permissionMap['user:edit_own'] },
        // Note: 'analytics:view_own' permission doesn't exist in our current permissions list
        // Using 'analytics:view' instead for teachers
        { role: 'teacher', permission_id: permissionMap['analytics:view'] },
        
        // Chapter Admin permissions (includes all teacher permissions + more)
        { role: 'chapter_admin', permission_id: permissionMap['course:edit_any'] },
        { role: 'chapter_admin', permission_id: permissionMap['course:delete_any'] },
        { role: 'chapter_admin', permission_id: permissionMap['lesson:edit_any'] },
        { role: 'chapter_admin', permission_id: permissionMap['lesson:delete_any'] },
        { role: 'chapter_admin', permission_id: permissionMap['video:delete_any'] },
        { role: 'chapter_admin', permission_id: permissionMap['quiz:edit_any'] },
        { role: 'chapter_admin', permission_id: permissionMap['discussion:moderate'] },
        { role: 'chapter_admin', permission_id: permissionMap['discussion:delete_any'] },
        { role: 'chapter_admin', permission_id: permissionMap['user:view'] },
        { role: 'chapter_admin', permission_id: permissionMap['user:edit_any'] },
        { role: 'chapter_admin', permission_id: permissionMap['chapter:manage'] },
        { role: 'chapter_admin', permission_id: permissionMap['analytics:view'] },
        
        // Platform Admin permissions (full access)
        { role: 'platform_admin', permission_id: permissionMap['user:manage_roles'] },
        { role: 'platform_admin', permission_id: permissionMap['system:admin'] }
      ].filter(rp => rp.permission_id); // Filter out any undefined permission IDs
      
      // Insert role permissions
      return knex('role_permissions').insert(rolePermissions);
    });
};