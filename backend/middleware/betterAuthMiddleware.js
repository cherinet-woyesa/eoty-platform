const { auth } = require('../lib/auth');

/**
 * Better Auth Session Middleware
 * 
 * This middleware validates Better Auth sessions and adds user/session data to the request object.
 * It replaces the legacy JWT-based authentication middleware.
 * 
 * Requirements: 13.1, 13.4, 13.5
 */

/**
 * Require authentication middleware
 * 
 * Validates that a user has a valid Better Auth session.
 * If the session is invalid or missing, returns 401 Unauthorized.
 * If the user account is deactivated, returns 403 Forbidden.
 * 
 * Adds the following to the request object:
 * - req.user: User object with id, email, role, chapter_id, etc.
 * - req.session: Session object with id, userId, expiresAt, etc.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get session from Better Auth using request headers
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    // Check if session exists
    if (!session || !session.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: {
          code: 'SESSION_REQUIRED',
          message: 'You must be logged in to access this resource',
        },
      });
    }

    // Check if user account is active
    if (session.user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been deactivated. Please contact support.',
        },
      });
    }

    // Add user and session data to request object
    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      chapter_id: session.user.chapter_id,
      first_name: session.user.first_name,
      last_name: session.user.last_name,
      profile_picture: session.user.profile_picture,
      emailVerified: session.user.emailVerified,
      is_active: session.user.is_active,
    };

    req.session = {
      id: session.session.id,
      userId: session.session.userId,
      expiresAt: session.session.expiresAt,
    };

    next();
  } catch (error) {
    console.error('Better Auth middleware error:', error);
    
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session',
      error: {
        code: 'SESSION_INVALID',
        message: 'Your session is invalid or has expired. Please log in again.',
      },
    });
  }
};

/**
 * Optional authentication middleware
 * 
 * Attempts to validate a Better Auth session, but does not require it.
 * If a valid session exists, adds user/session data to the request object.
 * If no session or invalid session, continues without adding user data.
 * 
 * Useful for endpoints that have different behavior for authenticated vs. unauthenticated users.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Attempt to get session from Better Auth
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    // If session exists and user is active, add to request
    if (session && session.user && session.user.is_active !== false) {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        chapter_id: session.user.chapter_id,
        first_name: session.user.first_name,
        last_name: session.user.last_name,
        profile_picture: session.user.profile_picture,
        emailVerified: session.user.emailVerified,
        is_active: session.user.is_active,
      };

      req.session = {
        id: session.session.id,
        userId: session.session.userId,
        expiresAt: session.session.expiresAt,
      };
    }

    // Continue regardless of session validity
    next();
  } catch (error) {
    // Silently fail for optional auth - just continue without user data
    next();
  }
};

module.exports = {
  requireAuth,
  optionalAuth,
};
