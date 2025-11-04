/**
 * Authentication Event Logger Service
 * 
 * Provides structured logging for all authentication-related events.
 * Implements security best practices by never logging sensitive data
 * (passwords, tokens, etc.) and providing detailed audit trails.
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

const authMetrics = require('./authMetrics');

class AuthLogger {
  /**
   * Log levels for different event types
   */
  static LEVELS = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    SECURITY: 'security',
  };

  /**
   * Event types for authentication events
   */
  static EVENTS = {
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILURE: 'login_failure',
    REGISTRATION_SUCCESS: 'registration_success',
    REGISTRATION_FAILURE: 'registration_failure',
    PASSWORD_RESET_REQUEST: 'password_reset_request',
    PASSWORD_RESET_SUCCESS: 'password_reset_success',
    PASSWORD_RESET_FAILURE: 'password_reset_failure',
    EMAIL_VERIFICATION_SENT: 'email_verification_sent',
    EMAIL_VERIFICATION_SUCCESS: 'email_verification_success',
    EMAIL_VERIFICATION_FAILURE: 'email_verification_failure',
    SESSION_CREATED: 'session_created',
    SESSION_INVALIDATED: 'session_invalidated',
    SESSION_EXPIRED: 'session_expired',
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    TWO_FACTOR_ENABLED: '2fa_enabled',
    TWO_FACTOR_DISABLED: '2fa_disabled',
    TWO_FACTOR_SUCCESS: '2fa_success',
    TWO_FACTOR_FAILURE: '2fa_failure',
    OAUTH_SUCCESS: 'oauth_success',
    OAUTH_FAILURE: 'oauth_failure',
    LEGACY_MIGRATION_SUCCESS: 'legacy_migration_success',
    LEGACY_MIGRATION_FAILURE: 'legacy_migration_failure',
  };

  /**
   * Create a structured log entry
   * @private
   */
  _createLogEntry(level, event, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...data,
    };

    // Ensure no sensitive data is logged
    this._sanitizeLogEntry(logEntry);

    return logEntry;
  }

  /**
   * Sanitize log entry to remove sensitive data
   * @private
   */
  _sanitizeLogEntry(logEntry) {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'accessToken',
      'refreshToken',
      'twoFactorSecret',
      'backupCodes',
    ];

    // Remove sensitive fields
    sensitiveFields.forEach(field => {
      if (logEntry[field]) {
        delete logEntry[field];
      }
    });

    // Mask partial email for privacy (keep domain visible)
    if (logEntry.email) {
      const [localPart, domain] = logEntry.email.split('@');
      if (localPart && domain) {
        const maskedLocal = localPart.length > 2 
          ? localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1]
          : localPart[0] + '*';
        logEntry.email = `${maskedLocal}@${domain}`;
      }
    }

    return logEntry;
  }

  /**
   * Format and output log entry
   * @private
   */
  _outputLog(logEntry) {
    const logString = JSON.stringify(logEntry);

    switch (logEntry.level) {
      case AuthLogger.LEVELS.ERROR:
      case AuthLogger.LEVELS.SECURITY:
        console.error(logString);
        break;
      case AuthLogger.LEVELS.WARN:
        console.warn(logString);
        break;
      default:
        console.log(logString);
    }
  }

  /**
   * Extract request metadata for logging
   * @private
   */
  _extractRequestMetadata(req) {
    return {
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('user-agent'),
      method: req.method,
      path: req.path,
    };
  }

  /**
   * Log login attempt (success)
   * Requirements: 14.1, 14.2
   */
  logLoginSuccess(userId, email, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.LOGIN_SUCCESS,
      {
        user_id: userId,
        email,
        success: true,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackLoginSuccess();
  }

  /**
   * Log login attempt (failure)
   * Requirements: 14.1, 14.2
   */
  logLoginFailure(email, reason, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.WARN,
      AuthLogger.EVENTS.LOGIN_FAILURE,
      {
        email,
        success: false,
        reason,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackLoginFailure();
  }

  /**
   * Log registration event (success)
   * Requirements: 14.1, 14.2
   */
  logRegistrationSuccess(userId, email, role, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.REGISTRATION_SUCCESS,
      {
        user_id: userId,
        email,
        role,
        success: true,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackRegistrationSuccess();
  }

  /**
   * Log registration event (failure)
   * Requirements: 14.1, 14.2
   */
  logRegistrationFailure(email, reason, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.WARN,
      AuthLogger.EVENTS.REGISTRATION_FAILURE,
      {
        email,
        success: false,
        reason,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackRegistrationFailure();
  }

  /**
   * Log password reset request
   * Requirements: 14.1, 14.3
   */
  logPasswordResetRequest(email, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.PASSWORD_RESET_REQUEST,
      {
        email,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackPasswordResetRequest();
  }

  /**
   * Log password reset success
   * Requirements: 14.1, 14.3
   */
  logPasswordResetSuccess(userId, email, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.PASSWORD_RESET_SUCCESS,
      {
        user_id: userId,
        email,
        success: true,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackPasswordResetSuccess();
  }

  /**
   * Log password reset failure
   * Requirements: 14.1, 14.3
   */
  logPasswordResetFailure(email, reason, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.WARN,
      AuthLogger.EVENTS.PASSWORD_RESET_FAILURE,
      {
        email,
        success: false,
        reason,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackPasswordResetFailure();
  }

  /**
   * Log email verification sent
   * Requirements: 14.1, 14.4
   */
  logEmailVerificationSent(userId, email, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.EMAIL_VERIFICATION_SENT,
      {
        user_id: userId,
        email,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackEmailVerificationSent();
  }

  /**
   * Log email verification success
   * Requirements: 14.1, 14.4
   */
  logEmailVerificationSuccess(userId, email, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.EMAIL_VERIFICATION_SUCCESS,
      {
        user_id: userId,
        email,
        success: true,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackEmailVerificationSuccess();
  }

  /**
   * Log email verification failure
   * Requirements: 14.1, 14.4
   */
  logEmailVerificationFailure(email, reason, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.WARN,
      AuthLogger.EVENTS.EMAIL_VERIFICATION_FAILURE,
      {
        email,
        success: false,
        reason,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackEmailVerificationFailure();
  }

  /**
   * Log session creation
   * Requirements: 14.1, 14.5
   */
  logSessionCreated(userId, sessionId, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.SESSION_CREATED,
      {
        user_id: userId,
        session_id: sessionId,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackSessionCreated();
  }

  /**
   * Log session invalidation (logout)
   * Requirements: 14.1, 14.5
   */
  logSessionInvalidated(userId, sessionId, reason = 'logout', req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.SESSION_INVALIDATED,
      {
        user_id: userId,
        session_id: sessionId,
        reason,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackSessionInvalidated(additionalData.durationSeconds);
  }

  /**
   * Log session expiration
   * Requirements: 14.1, 14.5
   */
  logSessionExpired(userId, sessionId, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.SESSION_EXPIRED,
      {
        user_id: userId,
        session_id: sessionId,
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackSessionExpired(additionalData.durationSeconds);
  }

  /**
   * Log rate limit violation
   * Requirements: 14.5
   */
  logRateLimitExceeded(endpoint, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.SECURITY,
      AuthLogger.EVENTS.RATE_LIMIT_EXCEEDED,
      {
        endpoint,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackRateLimitViolation();
  }

  /**
   * Log suspicious activity
   * Requirements: 14.5
   */
  logSuspiciousActivity(description, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.SECURITY,
      AuthLogger.EVENTS.SUSPICIOUS_ACTIVITY,
      {
        description,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackSuspiciousActivity();
  }

  /**
   * Log 2FA enabled
   * Requirements: 14.1
   */
  log2FAEnabled(userId, email, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.TWO_FACTOR_ENABLED,
      {
        user_id: userId,
        email,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.track2FAEnabled();
  }

  /**
   * Log 2FA disabled
   * Requirements: 14.1
   */
  log2FADisabled(userId, email, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.TWO_FACTOR_DISABLED,
      {
        user_id: userId,
        email,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.track2FADisabled();
  }

  /**
   * Log 2FA verification success
   * Requirements: 14.1
   */
  log2FASuccess(userId, email, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.TWO_FACTOR_SUCCESS,
      {
        user_id: userId,
        email,
        success: true,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.track2FAVerificationSuccess();
  }

  /**
   * Log 2FA verification failure
   * Requirements: 14.1, 14.5
   */
  log2FAFailure(userId, email, reason, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.WARN,
      AuthLogger.EVENTS.TWO_FACTOR_FAILURE,
      {
        user_id: userId,
        email,
        success: false,
        reason,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.track2FAVerificationFailure();
  }

  /**
   * Log OAuth authentication success
   * Requirements: 14.1, 14.2
   */
  logOAuthSuccess(userId, email, provider, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.OAUTH_SUCCESS,
      {
        user_id: userId,
        email,
        provider,
        success: true,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackOAuthSuccess(provider);
  }

  /**
   * Log OAuth authentication failure
   * Requirements: 14.1, 14.2
   */
  logOAuthFailure(email, provider, reason, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.WARN,
      AuthLogger.EVENTS.OAUTH_FAILURE,
      {
        email,
        provider,
        success: false,
        reason,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackOAuthFailure(provider);
  }

  /**
   * Log legacy user migration success
   * Requirements: 14.1, 14.2
   */
  logLegacyMigrationSuccess(userId, email, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.INFO,
      AuthLogger.EVENTS.LEGACY_MIGRATION_SUCCESS,
      {
        user_id: userId,
        email,
        success: true,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackLegacyMigrationSuccess();
  }

  /**
   * Log legacy user migration failure
   * Requirements: 14.1, 14.2
   */
  logLegacyMigrationFailure(email, reason, req, additionalData = {}) {
    const logEntry = this._createLogEntry(
      AuthLogger.LEVELS.WARN,
      AuthLogger.EVENTS.LEGACY_MIGRATION_FAILURE,
      {
        email,
        success: false,
        reason,
        ...this._extractRequestMetadata(req),
        ...additionalData,
      }
    );

    this._outputLog(logEntry);
    authMetrics.trackLegacyMigrationFailure();
  }
}

// Export singleton instance
module.exports = new AuthLogger();
