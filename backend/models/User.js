const db = require('../config/database');

const User = {
  // Create a new user
  async create(userData) {
    const [id] = await db('users').insert({
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email.toLowerCase(),
      password_hash: userData.passwordHash || null,
      google_id: userData.googleId || null,
      profile_picture: userData.profilePicture || null,
      role: userData.role || 'student',
      chapter_id: userData.chapterId,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return id;
  },

  // Find user by email
  async findByEmail(email) {
    return await db('users')
      .where({ email: email.toLowerCase() })
      .first();
  },

  // Find user by Google ID
  async findByGoogleId(googleId) {
    return await db('users')
      .where({ google_id: googleId })
      .first();
  },

  // Find user by ID
  async findById(id) {
    return await db('users')
      .where({ id })
      .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'last_login_at', 'profile_picture')
      .first();
  },

  // Update last login timestamp
  async updateLastLogin(userId) {
    return await db('users')
      .where({ id: userId })
      .update({ 
        last_login_at: new Date(),
        updated_at: new Date()
      });
  },

  // Link Google account to existing user
  async linkGoogleAccount(userId, googleId, profilePicture = null) {
    return await db('users')
      .where({ id: userId })
      .update({ 
        google_id: googleId,
        profile_picture: profilePicture || undefined,
        updated_at: new Date()
      });
  },

  // Get user permissions based on role
  async getPermissions(userId) {
    const user = await db('users')
      .where({ id: userId })
      .select('role')
      .first();

    if (!user) return [];

    const permissionMap = {
      guest: [
        'course:view', // Limited view-only access
        'lesson:view'
      ],
      youth: [
        'course:view', 'lesson:view', 'quiz:take', 
        'discussion:view', 'discussion:create', 'user:edit_own',
        'progress:view', 'notes:create', 'notes:view_own'
      ],
      student: [
        'course:view', 'lesson:view', 'quiz:take', 
        'discussion:view', 'discussion:create', 'user:edit_own',
        'progress:view', 'notes:create', 'notes:view_own'
      ],
      moderator: [
        'course:view', 'lesson:view', 'quiz:take',
        'discussion:view', 'discussion:create', 'discussion:moderate', 'discussion:delete_any',
        'content:moderate', 'content:flag', 'content:review',
        'user:view', 'user:edit_own',
        'analytics:view_own'
      ],
      teacher: [
        'course:view', 'course:create', 'course:edit_own', 'course:delete_own',
        'lesson:view', 'lesson:create', 'lesson:edit_own', 'lesson:delete_own',
        'video:upload', 'video:delete_own',
        'quiz:take', 'quiz:create', 'quiz:edit_own',
        'discussion:view', 'discussion:create',
        'user:edit_own', 'analytics:view_own'
      ],
      admin: [
        'course:view', 'course:create', 'course:edit_own', 'course:edit_any', 'course:delete_own', 'course:delete_any',
        'lesson:view', 'lesson:create', 'lesson:edit_own', 'lesson:edit_any', 'lesson:delete_own', 'lesson:delete_any',
        'video:upload', 'video:delete_own', 'video:delete_any',
        'quiz:take', 'quiz:create', 'quiz:edit_own', 'quiz:edit_any',
        'discussion:view', 'discussion:create', 'discussion:moderate', 'discussion:delete_any',
        'user:view', 'user:edit_own', 'user:edit_any',
        'chapter:view', 'chapter:manage',
        'analytics:view'
      ],
      platform_admin: ['system:admin']
    };

    return permissionMap[user.role] || permissionMap.student;
  }
};

module.exports = User;
