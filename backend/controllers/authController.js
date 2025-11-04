const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const authConfig = require('../config/auth');

const authController = {
  async register(req, res) {
    try {
      const { firstName, lastName, email, password, chapter, role = 'student' } = req.body;

      console.log('Registration attempt:', { firstName, lastName, email, chapter, role });

      // Validate required fields
      if (!firstName || !lastName || !email || !password || !chapter) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // For public registration, only allow 'student' role
      // Other roles must be assigned by admins
      const userRole = role === 'student' ? 'student' : 'student';

      // Check if user already exists
      const existingUser = await db('users').where({ email }).first();
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Validate chapter ID exists in database
      const chapterId = parseInt(chapter);
      if (isNaN(chapterId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid chapter selection'
        });
      }

      const validChapter = await db('chapters').where({ id: chapterId, is_active: true }).first();
      if (!validChapter) {
        return res.status(400).json({
          success: false,
          message: 'Selected chapter is not valid or active'
        });
      }

      // Hash password
      const saltRounds = authConfig.bcryptRounds;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user data
      const userData = {
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: userRole,
        chapter_id: chapterId, // Use validated chapter ID
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      // FIXED: Insert user and get the ID (PostgreSQL compatible)
      const result = await db('users').insert(userData).returning('id');
      const userId = result[0].id;

      console.log('User created with ID:', userId, 'Role:', userRole);

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId, 
          email: email.toLowerCase(), 
          role: userRole,
          firstName,
          lastName,
          chapter: chapterId // Include chapter ID in token
        },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      // Get the created user without password
      const user = await db('users')
        .where({ id: userId })
        .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active')
        .first();

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active
          },
          token
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration'
      });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      console.log('Login attempt for:', email);
      console.log('Request body:', req.body);

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user
      const user = await db('users')
        .where({ email: email.toLowerCase() })
        .first();

      if (!user) {
        console.log('User not found:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact administrator.'
        });
      }

      console.log('User found in database:', {
        id: user.id,
        email: user.email,
        role: user.role
      });

      // Verify password
      console.log('Password verification - comparing with hash:', user.password_hash);
      console.log('Password provided:', password);
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      console.log('Password validation result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('Invalid password for:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Update last login
      await db('users')
        .where({ id: user.id })
        .update({ last_login_at: new Date() });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          chapter: user.chapter_id
        },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      console.log('Login successful for:', email, 'Role:', user.role);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active
          },
          token
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  },

  // Google OAuth login
  async googleLogin(req, res) {
    try {
      const { googleId, email, firstName, lastName, profilePicture } = req.body;

      // Validate required fields
      if (!googleId || !email || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Google ID, email, first name, and last name are required'
        });
      }

      // Check if user exists with this Google ID
      let user = await db('users')
        .where({ google_id: googleId })
        .first();

      // If user doesn't exist with Google ID, check if they exist with email
      if (!user) {
        user = await db('users')
          .where({ email: email.toLowerCase() })
          .first();
        
        // If user exists with email but not Google ID, update their Google ID
        if (user) {
          await db('users')
            .where({ id: user.id })
            .update({ google_id: googleId, updated_at: new Date() });
        }
      }

      let token;
      
      // If user doesn't exist at all, create a new user
      if (!user) {
        // Get default chapter (first active chapter) for new users
        const defaultChapter = await db('chapters')
          .where({ is_active: true })
          .orderBy('id', 'asc')
          .first();

        if (!defaultChapter) {
          return res.status(500).json({
            success: false,
            message: 'No active chapters found. Please contact administrator.'
          });
        }

        const userData = {
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
          google_id: googleId,
          profile_picture: profilePicture,
          role: 'student', // Default role for Google signups
          chapter_id: defaultChapter.id, // Use valid chapter ID
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        };

        // Insert new user
        const result = await db('users').insert(userData).returning('id');
        const userId = result[0].id;

        // Get the created user
        user = await db('users')
          .where({ id: userId })
          .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture')
          .first();
      } else {
        // Update last login and profile picture if it exists
        await db('users')
          .where({ id: user.id })
          .update({ 
            last_login_at: new Date(),
            profile_picture: profilePicture || user.profile_picture,
            updated_at: new Date()
          });
        
        // Refresh user data
        user = await db('users')
          .where({ id: user.id })
          .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture')
          .first();
      }

      // Generate JWT token
      token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          chapter: user.chapter_id
        },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      console.log('Google login successful for:', email);

      res.json({
        success: true,
        message: 'Google login successful',
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active,
            profilePicture: user.profile_picture
          },
          token
        }
      });

    } catch (error) {
      console.error('Google login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during Google login'
      });
    }
  },

  async getCurrentUser(req, res) {
    try {
      const user = await db('users')
        .where({ id: req.user.id })
        .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'last_login_at', 'profile_picture')
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active,
            lastLoginAt: user.last_login_at,
            profilePicture: user.profile_picture
          }
        }
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  async getUserPermissions(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await db('users')
        .where({ id: userId })
        .select('role')
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const permissionMap = {
        student: [
          'course:view', 'lesson:view', 'quiz:take', 
          'discussion:view', 'discussion:create', 'user:edit_own',
          'progress:view', 'notes:create', 'notes:view_own'
        ],
        teacher: [
          'course:view', 'course:create', 'course:edit_own', 'course:delete_own',
          'lesson:view', 'lesson:create', 'lesson:edit_own', 'lesson:delete_own',
          'video:upload', 'video:delete_own',
          'quiz:take', 'quiz:create', 'quiz:edit_own',
          'discussion:view', 'discussion:create',
          'user:edit_own', 'analytics:view_own'
        ],
        chapter_admin: [
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

      const permissions = permissionMap[user.role] || permissionMap.student;

      res.json({
        success: true,
        data: {
          permissions,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Get user permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user permissions'
      });
    }
  }
};

module.exports = authController;