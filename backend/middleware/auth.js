const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const db = require('../config/database');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, authConfig.jwtSecret, async (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    try {
      // Verify user still exists and is active
      const dbUser = await db('users')
        .where({ id: user.userId })
        .select('id', 'is_active', 'role')
        .first();

      if (!dbUser) {
        return res.status(401).json({
          success: false,
          message: 'User account no longer exists'
        });
      }

      if (!dbUser.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Update user role from DB in case it changed
      user.role = dbUser.role;
      req.user = user;
      next();
    } catch (dbError) {
      console.error('Auth middleware error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, authConfig.jwtSecret, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }

  next();
};

module.exports = { authenticateToken, optionalAuth };