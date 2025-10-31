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
      ]).then(() => console.log('[SEED] user_permissions inserted.'));
    })
    .then(async () => {
      // Fetch permission IDs dynamically
      const getPermissionId = async (key) => {
        const permission = await knex('user_permissions').where({ permission_key: key }).first();
        console.log(`[SEED] Fetched permission ID for ${key}: ${permission?.id}`);
        return permission ? permission.id : null;
      };

      const courseViewId = await getPermissionId('course:view');
      const courseCreateId = await getPermissionId('course:create');
      const courseEditOwnId = await getPermissionId('course:edit_own');
      const courseEditAnyId = await getPermissionId('course:edit_any');
      const courseDeleteOwnId = await getPermissionId('course:delete_own');
      const courseDeleteAnyId = await getPermissionId('course:delete_any');
      const lessonViewId = await getPermissionId('lesson:view');
      const lessonCreateId = await getPermissionId('lesson:create');
      const lessonEditOwnId = await getPermissionId('lesson:edit_own');
      const lessonEditAnyId = await getPermissionId('lesson:edit_any');
      const lessonDeleteOwnId = await getPermissionId('lesson:delete_own');
      const lessonDeleteAnyId = await getPermissionId('lesson:delete_any');
      const videoUploadId = await getPermissionId('video:upload');
      const videoDeleteOwnId = await getPermissionId('video:delete_own');
      const videoDeleteAnyId = await getPermissionId('video:delete_any');
      const quizTakeId = await getPermissionId('quiz:take');
      const quizCreateId = await getPermissionId('quiz:create');
      const quizEditOwnId = await getPermissionId('quiz:edit_own');
      const quizEditAnyId = await getPermissionId('quiz:edit_any');
      const discussionViewId = await getPermissionId('discussion:view');
      const discussionCreateId = await getPermissionId('discussion:create');
      const discussionModerateId = await getPermissionId('discussion:moderate');
      const discussionDeleteAnyId = await getPermissionId('discussion:delete_any');
      const userViewId = await getPermissionId('user:view');
      const userEditOwnId = await getPermissionId('user:edit_own');
      const userEditAnyId = await getPermissionId('user:edit_any');
      const userManageRolesId = await getPermissionId('user:manage_roles');
      const chapterViewId = await getPermissionId('chapter:view');
      const chapterManageId = await getPermissionId('chapter:manage');
      const analyticsViewId = await getPermissionId('analytics:view');
      const systemAdminId = await getPermissionId('system:admin');

      // Map permissions to roles
      return knex('role_permissions').insert([
        // Student permissions
        { role: 'student', permission_id: courseViewId },
        { role: 'student', permission_id: lessonViewId },
        { role: 'student', permission_id: quizTakeId },
        { role: 'student', permission_id: discussionViewId },
        { role: 'student', permission_id: discussionCreateId },
        { role: 'student', permission_id: userEditOwnId },
        { role: 'student', permission_id: chapterViewId },
        
        // Teacher permissions (includes all student permissions + more)
        { role: 'teacher', permission_id: courseViewId },
        { role: 'teacher', permission_id: courseCreateId },
        { role: 'teacher', permission_id: courseEditOwnId },
        { role: 'teacher', permission_id: courseDeleteOwnId },
        { role: 'teacher', permission_id: lessonCreateId },
        { role: 'teacher', permission_id: lessonEditOwnId },
        { role: 'teacher', permission_id: lessonDeleteOwnId },
        { role: 'teacher', permission_id: videoUploadId },
        { role: 'teacher', permission_id: videoDeleteOwnId },
        { role: 'teacher', permission_id: quizCreateId },
        { role: 'teacher', permission_id: quizEditOwnId },
        
        // Chapter Admin permissions (includes all teacher permissions + more)
        { role: 'chapter_admin', permission_id: courseEditAnyId },
        { role: 'chapter_admin', permission_id: courseDeleteAnyId },
        { role: 'chapter_admin', permission_id: lessonEditAnyId },
        { role: 'chapter_admin', permission_id: lessonDeleteAnyId },
        { role: 'chapter_admin', permission_id: videoDeleteAnyId },
        { role: 'chapter_admin', permission_id: quizEditAnyId },
        { role: 'chapter_admin', permission_id: discussionModerateId },
        { role: 'chapter_admin', permission_id: discussionDeleteAnyId },
        { role: 'chapter_admin', permission_id: userViewId },
        { role: 'chapter_admin', permission_id: userEditAnyId },
        { role: 'chapter_admin', permission_id: chapterManageId },
        { role: 'chapter_admin', permission_id: analyticsViewId },
        
        // Platform Admin permissions (full access)
        { role: 'platform_admin', permission_id: userManageRolesId },
        { role: 'platform_admin', permission_id: systemAdminId }
      ]);
    });
};