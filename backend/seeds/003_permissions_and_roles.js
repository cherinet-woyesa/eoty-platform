exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('role_permissions').del()
    .then(() => knex('user_permissions').del())
    .then(function () {
      // Inserts permission entries
      return knex('user_permissions').insert([
        // Course permissions
        { permission_key: 'course:view', description: 'View courses' },
        { permission_key: 'course:create', description: 'Create new courses' },
        { permission_key: 'course:edit_own', description: 'Edit own courses' },
        { permission_key: 'course:edit_any', description: 'Edit any courses' },
        { permission_key: 'course:delete_own', description: 'Delete own courses' },
        { permission_key: 'course:delete_any', description: 'Delete any courses' },
        
        // Lesson permissions
        { permission_key: 'lesson:view', description: 'View lessons' },
        { permission_key: 'lesson:create', description: 'Create lessons' },
        { permission_key: 'lesson:edit_own', description: 'Edit own lessons' },
        { permission_key: 'lesson:edit_any', description: 'Edit any lessons' },
        { permission_key: 'lesson:delete_own', description: 'Delete own lessons' },
        { permission_key: 'lesson:delete_any', description: 'Delete any lessons' },
        
        // Video permissions
        { permission_key: 'video:upload', description: 'Upload videos' },
        { permission_key: 'video:delete_own', description: 'Delete own videos' },
        { permission_key: 'video:delete_any', description: 'Delete any videos' },
        
        // Quiz permissions
        { permission_key: 'quiz:take', description: 'Take quizzes' },
        { permission_key: 'quiz:create', description: 'Create quizzes' },
        { permission_key: 'quiz:edit_own', description: 'Edit own quizzes' },
        { permission_key: 'quiz:edit_any', description: 'Edit any quizzes' },
        
        // Discussion permissions
        { permission_key: 'discussion:view', description: 'View discussions' },
        { permission_key: 'discussion:create', description: 'Create discussions' },
        { permission_key: 'discussion:moderate', description: 'Moderate discussions' },
        { permission_key: 'discussion:delete_any', description: 'Delete any discussions' },
        
        // User management permissions
        { permission_key: 'user:view', description: 'View users' },
        { permission_key: 'user:edit_own', description: 'Edit own profile' },
        { permission_key: 'user:edit_any', description: 'Edit any user' },
        { permission_key: 'user:manage_roles', description: 'Manage user roles' },
        
        // Chapter permissions
        { permission_key: 'chapter:view', description: 'View chapters' },
        { permission_key: 'chapter:manage', description: 'Manage chapters' },
        
        // Analytics permissions
        { permission_key: 'analytics:view', description: 'View analytics' },
        
        // System permissions
        { permission_key: 'system:admin', description: 'Full system access' }
      ]);
    })
    .then(() => {
      // Map permissions to roles
      return knex('role_permissions').insert([
        // Student permissions
        { role: 'student', permission_id: 1 }, // course:view
        { role: 'student', permission_id: 7 }, // lesson:view
        { role: 'student', permission_id: 13 }, // quiz:take
        { role: 'student', permission_id: 16 }, // discussion:view
        { role: 'student', permission_id: 17 }, // discussion:create
        { role: 'student', permission_id: 21 }, // user:edit_own
        { role: 'student', permission_id: 24 }, // chapter:view
        
        // Teacher permissions (includes all student permissions + more)
        { role: 'teacher', permission_id: 2 }, // course:create
        { role: 'teacher', permission_id: 3 }, // course:edit_own
        { role: 'teacher', permission_id: 5 }, // course:delete_own
        { role: 'teacher', permission_id: 8 }, // lesson:create
        { role: 'teacher', permission_id: 9 }, // lesson:edit_own
        { role: 'teacher', permission_id: 11 }, // lesson:delete_own
        { role: 'teacher', permission_id: 12 }, // video:upload
        { role: 'teacher', permission_id: 13 }, // video:delete_own
        { role: 'teacher', permission_id: 14 }, // quiz:create
        { role: 'teacher', permission_id: 15 }, // quiz:edit_own
        
        // Chapter Admin permissions (includes all teacher permissions + more)
        { role: 'chapter_admin', permission_id: 4 }, // course:edit_any (in chapter)
        { role: 'chapter_admin', permission_id: 6 }, // course:delete_any (in chapter)
        { role: 'chapter_admin', permission_id: 10 }, // lesson:edit_any (in chapter)
        { role: 'chapter_admin', permission_id: 12 }, // lesson:delete_any (in chapter)
        { role: 'chapter_admin', permission_id: 14 }, // video:delete_any (in chapter)
        { role: 'chapter_admin', permission_id: 16 }, // quiz:edit_any (in chapter)
        { role: 'chapter_admin', permission_id: 18 }, // discussion:moderate
        { role: 'chapter_admin', permission_id: 19 }, // discussion:delete_any
        { role: 'chapter_admin', permission_id: 20 }, // user:view
        { role: 'chapter_admin', permission_id: 22 }, // user:edit_any (in chapter)
        { role: 'chapter_admin', permission_id: 25 }, // chapter:manage (own chapter)
        { role: 'chapter_admin', permission_id: 26 }, // analytics:view (chapter)
        
        // Platform Admin permissions (full access)
        { role: 'platform_admin', permission_id: 23 }, // user:manage_roles
        { role: 'platform_admin', permission_id: 27 }  // system:admin
      ]);
    });
};