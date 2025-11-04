const express = require('express');
const legacyUserMigration = require('../services/legacyUserMigration');
const { auth } = require('../lib/auth');
const { isLegacyMigrationEnabled } = require('../utils/featureFlags');
const authMetrics = require('../services/authMetrics');
const securityMonitor = require('../services/securityMonitor');

const router = express.Router();

/**
 * Legacy User Migration Endpoint
 * 
 * This endpoint provides transparent migration for legacy users.
 * When a legacy user attempts to login, this endpoint:
 * 1. Verifies their credentials against the legacy system
 * 2. Migrates them to Better Auth if not already migrated
 * 3. Creates a Better Auth session and returns it
 * 
 * This allows existing users to seamlessly transition to Better Auth
 * without requiring password resets or re-registration.
 * 
 * Requirements: 3.1, 3.2
 */

/**
 * POST /api/auth/migrate-login
 * 
 * Authenticate and migrate a legacy user to Better Auth
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "userpassword"
 * }
 * 
 * Response on success:
 * {
 *   "success": true,
 *   "migrated": true,
 *   "message": "User successfully migrated to Better Auth",
 *   "user": { ... },
 *   "session": { ... }
 * }
 * 
 * Response on error:
 * {
 *   "success": false,
 *   "error": "Error message",
 *   "code": "ERROR_CODE"
 * }
 */
router.post('/migrate-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if legacy migration is enabled via feature flag
    if (!isLegacyMigrationEnabled()) {
      return res.status(403).json({
        success: false,
        error: 'Legacy migration is not enabled',
        code: 'MIGRATION_DISABLED'
      });
    }

    // Attempt to migrate the user
    const migrationResult = await legacyUserMigration.migrateUserOnLogin(email, password);

    if (!migrationResult.success) {
      // Return appropriate status code based on error
      const statusCode = migrationResult.code === 'INVALID_PASSWORD' ? 401 :
                        migrationResult.code === 'USER_NOT_FOUND' ? 401 :
                        migrationResult.code === 'ACCOUNT_DISABLED' ? 403 : 500;

      return res.status(statusCode).json({
        success: false,
        error: migrationResult.error,
        code: migrationResult.code
      });
    }

    // If user was already migrated, they should use the regular Better Auth login
    if (migrationResult.alreadyMigrated) {
      return res.status(200).json({
        success: true,
        alreadyMigrated: true,
        message: 'User already migrated. Please use the standard login endpoint.',
        redirectTo: '/api/auth/sign-in/email'
      });
    }

    // User successfully migrated, now create a Better Auth session
    try {
      // Sign in the user with Better Auth to create a session
      const signInResult = await auth.api.signInEmail({
        body: {
          email: email,
          password: password,
        },
        headers: req.headers,
      });

      if (!signInResult) {
        throw new Error('Failed to create session after migration');
      }

      // Set the session cookie in the response
      if (signInResult.headers) {
        const setCookieHeader = signInResult.headers.get('set-cookie');
        if (setCookieHeader) {
          res.setHeader('set-cookie', setCookieHeader);
        }
      }

      // Return success response with user data and session
      return res.status(200).json({
        success: true,
        migrated: true,
        message: 'User successfully migrated and logged in',
        user: migrationResult.user,
        session: signInResult.session || null,
      });
    } catch (sessionError) {
      console.error('Error creating session after migration:', sessionError);
      
      // Migration succeeded but session creation failed
      // User can still login normally next time
      return res.status(200).json({
        success: true,
        migrated: true,
        message: 'User migrated successfully. Please login again.',
        user: migrationResult.user,
        requiresLogin: true
      });
    }
  } catch (error) {
    console.error('Migration endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during migration',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/migration-status
 * 
 * Check if a user has been migrated to Better Auth
 * 
 * Query parameters:
 * - email: User's email address
 * 
 * Response:
 * {
 *   "success": true,
 *   "migrated": true/false,
 *   "email": "user@example.com"
 * }
 */
router.get('/migration-status', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }

    const isMigrated = await legacyUserMigration.isMigrated(email);
    const isLegacy = await legacyUserMigration.isLegacyUser(email);

    return res.status(200).json({
      success: true,
      migrated: isMigrated,
      isLegacyUser: !!isLegacy,
      email: email.toLowerCase()
    });
  } catch (error) {
    console.error('Migration status check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check migration status',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/feature-flags
 * 
 * Get the current status of authentication feature flags
 * Useful for debugging and monitoring the migration process
 * 
 * Response:
 * {
 *   "success": true,
 *   "flags": {
 *     "legacyMigration": true/false,
 *     "betterAuth": true/false
 *   }
 * }
 */
router.get('/feature-flags', (req, res) => {
  try {
    const { getAllFeatureFlags, validateFeatureFlags } = require('../utils/featureFlags');
    const flags = getAllFeatureFlags();
    const validation = validateFeatureFlags();

    return res.status(200).json({
      success: true,
      flags,
      validation
    });
  } catch (error) {
    console.error('Feature flags check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check feature flags',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/metrics
 * 
 * Get authentication metrics for monitoring and analytics
 * Returns current metrics snapshot with calculated rates
 * 
 * Requirements: 14.1, 14.2, 14.3
 * 
 * Response:
 * {
 *   "success": true,
 *   "metrics": {
 *     "timestamp": "2024-11-04T12:00:00.000Z",
 *     "authentication": { ... },
 *     "registration": { ... },
 *     "passwordReset": { ... },
 *     "twoFactor": { ... },
 *     "sessions": { ... },
 *     "security": { ... },
 *     "legacyMigration": { ... }
 *   }
 * }
 */
router.get('/metrics', (req, res) => {
  try {
    const summary = authMetrics.getMetricsSummary();
    
    return res.status(200).json({
      success: true,
      metrics: summary
    });
  } catch (error) {
    console.error('Metrics retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/metrics/detailed
 * 
 * Get detailed authentication metrics including raw counts
 * 
 * Requirements: 14.1, 14.2, 14.3
 * 
 * Response:
 * {
 *   "success": true,
 *   "metrics": { ... all raw metrics and calculated rates ... }
 * }
 */
router.get('/metrics/detailed', (req, res) => {
  try {
    const detailed = authMetrics.getCalculatedMetrics();
    
    return res.status(200).json({
      success: true,
      metrics: detailed
    });
  } catch (error) {
    console.error('Detailed metrics retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve detailed metrics',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/metrics/timeseries
 * 
 * Get time-series metrics for trend analysis
 * 
 * Query parameters:
 * - hours: Number of hours to look back (default: 24)
 * 
 * Requirements: 14.1, 14.2, 14.3
 * 
 * Response:
 * {
 *   "success": true,
 *   "timeSeries": [
 *     { "timestamp": "2024-11-04T10:00:00.000Z", "login": {...}, ... },
 *     { "timestamp": "2024-11-04T11:00:00.000Z", "login": {...}, ... }
 *   ]
 * }
 */
router.get('/metrics/timeseries', (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const timeSeries = authMetrics.getTimeSeriesMetrics(hours);
    
    return res.status(200).json({
      success: true,
      timeSeries,
      hoursBack: hours
    });
  } catch (error) {
    console.error('Time-series metrics retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve time-series metrics',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/security/stats
 * 
 * Get security monitoring statistics
 * 
 * Requirements: 14.5
 * 
 * Response:
 * {
 *   "success": true,
 *   "stats": {
 *     "suspicious_ips": 5,
 *     "tracked_failed_attempts": 12,
 *     "tracked_rate_limit_violations": 3,
 *     "timestamp": "2024-11-04T12:00:00.000Z"
 *   }
 * }
 */
router.get('/security/stats', (req, res) => {
  try {
    const stats = securityMonitor.getSecurityStats();
    
    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Security stats retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve security stats',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
