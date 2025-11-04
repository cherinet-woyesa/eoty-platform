const express = require('express');
const { auth } = require('../lib/auth');
const { toNodeHandler } = require('better-auth/node');

const router = express.Router();

/**
 * Better Auth Route Handler
 * 
 * This router mounts the Better Auth handler at /api/auth/*
 * Better Auth automatically provides the following endpoints:
 * 
 * - POST /api/auth/sign-up/email - Email/password registration
 * - POST /api/auth/sign-in/email - Email/password login
 * - POST /api/auth/sign-out - Logout
 * - GET /api/auth/session - Get current session
 * - POST /api/auth/forget-password - Request password reset
 * - POST /api/auth/reset-password - Reset password with token
 * - POST /api/auth/verify-email - Verify email with token
 * - GET /api/auth/oauth/google - Google OAuth initiation
 * - GET /api/auth/oauth/google/callback - Google OAuth callback
 * - POST /api/auth/two-factor/enable - Enable 2FA
 * - POST /api/auth/two-factor/verify - Verify 2FA code
 * - POST /api/auth/two-factor/disable - Disable 2FA
 * 
 * Requirements: 13.1, 13.2
 */

/**
 * Legacy endpoint compatibility layer
 * Maps old frontend endpoints to Better Auth endpoints
 */

// POST /api/auth/register -> Custom registration with Better Auth password hashing
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    
    const bcrypt = require('bcryptjs');
    const { pgPool } = require('../lib/auth');
    
    // Hash the password
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    
    // Insert user directly into database
    const result = await pgPool.query(
      `INSERT INTO users (
        first_name, last_name, email, password_hash, name, role, chapter_id, 
        profile_picture, email_verified, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id, email, first_name, last_name, name, role, chapter_id, profile_picture, email_verified, is_active, created_at`,
      [
        req.body.firstName,
        req.body.lastName,
        req.body.email.toLowerCase(),
        passwordHash,
        `${req.body.firstName} ${req.body.lastName}`,
        req.body.role || 'student',
        req.body.chapter || req.body.chapterId || null,
        req.body.profilePicture || null,
        false, // email_verified
        true,  // is_active
      ]
    );

    const user = result.rows[0];
    console.log('Registration successful:', user);

    // Generate JWT token for automatic login
    const jwt = require('jsonwebtoken');
    const authConfig = require('../config/auth');
    
    const userData = {
      id: String(user.id),
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      name: user.name,
      role: user.role,
      chapter: String(user.chapter_id),
      chapterId: user.chapter_id,
      profilePicture: user.profile_picture,
      emailVerified: user.email_verified,
      isActive: user.is_active,
    };

    const token = jwt.sign(
      userData,
      authConfig.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      user: userData,
      token: token,
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate email error
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }
    
    return res.status(400).json({
      success: false,
      message: error.message || 'Registration failed',
    });
  }
});

// POST /api/auth/login -> Custom login with session creation
router.post('/login', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { pgPool } = require('../lib/auth');
    const crypto = require('crypto');
    
    // Find user by email
    const userResult = await pgPool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [req.body.email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(req.body.password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Create JWT token instead of session token
    const jwt = require('jsonwebtoken');
    const authConfig = require('../config/auth');
    
    const userData = {
      id: String(user.id),
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      name: user.name,
      role: user.role,
      chapter: String(user.chapter_id),
      chapterId: user.chapter_id,
      profilePicture: user.profile_picture,
      emailVerified: user.email_verified,
      isActive: user.is_active,
    };

    // Generate JWT token
    const token = jwt.sign(
      userData,
      authConfig.jwtSecret,
      { expiresIn: '7d' }
    );

    // Update last login
    await pgPool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    console.log('Login successful for user:', user.email);

    return res.status(200).json({
      success: true,
      data: {
        user: userData,
        token: token,
      },
      // Also include at root level for backward compatibility
      user: userData,
      token: token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
});

// GET /api/auth/me -> GET /api/auth/session
router.get('/me', async (req, res) => {
  try {
    const result = await auth.api.getSession({
      headers: req.headers,
    });

    if (!result || !result.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    return res.status(200).json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
  }
});

// GET /api/auth/permissions -> Get user permissions based on role
router.get('/permissions', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const { pgPool } = require('../lib/auth');
    
    // Find session and user
    const sessionResult = await pgPool.query(
      'SELECT user_id FROM session_table WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
      });
    }

    const userId = sessionResult.rows[0].user_id;
    
    // Get user role
    const userResult = await pgPool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    const role = userResult.rows[0].role;
    
    // Get permissions from RBAC middleware
    const { PERMISSION_MAP } = require('../middleware/rbacMiddleware');
    const permissions = PERMISSION_MAP[role] || [];

    return res.status(200).json({
      success: true,
      data: {
        permissions,
        role,
      },
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load permissions',
    });
  }
});

// Mount Better Auth handler for all other /auth/* routes
router.all('/*', toNodeHandler(auth));

module.exports = router;
