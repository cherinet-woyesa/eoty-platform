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
      // Base role generalized from 'student' to 'user'
      role: userData.role || 'user',
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

  // Get user permissions based on role from database
  async getPermissions(userId) {
    try {
      const user = await db('users')
        .where({ id: userId })
        .select('role')
        .first();

      if (!user) return [];

      // Admins have system:admin which grants all permissions
      if (user.role === 'admin') {
        // For admins, return all permissions
        const allPermissions = await db('user_permissions')
          .select('permission_key');
        return allPermissions.map(p => p.permission_key);
      }

      // For other roles, fetch role-specific permissions from database
      const userPermissions = await db('role_permissions as rp')
        .join('user_permissions as up', 'rp.permission_id', 'up.id')
        .where('rp.role', user.role)
        .select('up.permission_key');

      return userPermissions.map(p => p.permission_key);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      // Fallback to empty array on error
      return [];
    }
  }
};

module.exports = User;
