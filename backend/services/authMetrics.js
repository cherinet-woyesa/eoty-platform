/**
 * Authentication Metrics Service
 * 
 * Tracks and calculates authentication-related metrics for monitoring
 * and analytics purposes.
 * 
 * Requirements: 14.1, 14.2, 14.3
 */

class AuthMetrics {
  constructor() {
    this.metrics = {
      login: {
        success: 0,
        failure: 0,
      },
      registration: {
        success: 0,
        failure: 0,
      },
      passwordReset: {
        requests: 0,
        success: 0,
      },
      emailVerification: {
        sent: 0,
        success: 0,
      },
      twoFactor: {
        enabled: 0,
        verificationSuccess: 0,
        verificationFailure: 0,
      },
      oauth: {
        google: { success: 0, failure: 0 },
        github: { success: 0, failure: 0 },
      },
      sessions: {
        created: 0,
        invalidated: 0,
        expired: 0,
        totalDuration: 0,
      },
      legacyMigration: {
        pending: 0,
        success: 0,
        failure: 0,
      },
      security: {
        rateLimitViolations: 0,
        suspiciousActivity: 0,
        blockedIPs: 0,
      },
      totalUsers: 0,
      timestamp: new Date().toISOString(),
    };

    this.timeSeries = [];
    this.maxTimeSeriesPoints = 168; // 7 days of hourly data
  }

  // Login metrics
  trackLoginSuccess() {
    this.metrics.login.success++;
    this.updateTimestamp();
  }

  trackLoginFailure() {
    this.metrics.login.failure++;
    this.updateTimestamp();
  }

  // Registration metrics
  trackRegistrationSuccess() {
    this.metrics.registration.success++;
    this.updateTimestamp();
  }

  trackRegistrationFailure() {
    this.metrics.registration.failure++;
    this.updateTimestamp();
  }

  // Password reset metrics
  trackPasswordResetRequest() {
    this.metrics.passwordReset.requests++;
    this.updateTimestamp();
  }

  trackPasswordResetSuccess() {
    this.metrics.passwordReset.success++;
    this.updateTimestamp();
  }

  // Email verification metrics
  trackEmailVerificationSent() {
    this.metrics.emailVerification.sent++;
    this.updateTimestamp();
  }

  trackEmailVerificationSuccess() {
    this.metrics.emailVerification.success++;
    this.updateTimestamp();
  }

  // 2FA metrics
  track2FAEnabled() {
    this.metrics.twoFactor.enabled++;
    this.updateTimestamp();
  }

  track2FAVerificationSuccess() {
    this.metrics.twoFactor.verificationSuccess++;
    this.updateTimestamp();
  }

  track2FAVerificationFailure() {
    this.metrics.twoFactor.verificationFailure++;
    this.updateTimestamp();
  }

  // OAuth metrics
  trackOAuthSuccess(provider) {
    if (this.metrics.oauth[provider]) {
      this.metrics.oauth[provider].success++;
      this.updateTimestamp();
    }
  }

  trackOAuthFailure(provider) {
    if (this.metrics.oauth[provider]) {
      this.metrics.oauth[provider].failure++;
      this.updateTimestamp();
    }
  }

  // Session metrics
  trackSessionCreated() {
    this.metrics.sessions.created++;
    this.updateTimestamp();
  }

  trackSessionInvalidated(durationSeconds) {
    this.metrics.sessions.invalidated++;
    if (durationSeconds) {
      this.metrics.sessions.totalDuration += durationSeconds;
    }
    this.updateTimestamp();
  }

  trackSessionExpired(durationSeconds) {
    this.metrics.sessions.expired++;
    if (durationSeconds) {
      this.metrics.sessions.totalDuration += durationSeconds;
    }
    this.updateTimestamp();
  }

  // Legacy migration metrics
  setPendingLegacyMigrations(count) {
    this.metrics.legacyMigration.pending = count;
    this.updateTimestamp();
  }

  trackLegacyMigrationSuccess() {
    this.metrics.legacyMigration.success++;
    if (this.metrics.legacyMigration.pending > 0) {
      this.metrics.legacyMigration.pending--;
    }
    this.updateTimestamp();
  }

  trackLegacyMigrationFailure() {
    this.metrics.legacyMigration.failure++;
    this.updateTimestamp();
  }

  // Security metrics
  trackRateLimitViolation() {
    this.metrics.security.rateLimitViolations++;
    this.updateTimestamp();
  }

  trackSuspiciousActivity() {
    this.metrics.security.suspiciousActivity++;
    this.updateTimestamp();
  }

  trackBlockedIP() {
    this.metrics.security.blockedIPs++;
    this.updateTimestamp();
  }

  // User count
  setTotalUserCount(count) {
    this.metrics.totalUsers = count;
    this.updateTimestamp();
  }

  // Calculated metrics
  getCalculatedMetrics() {
    const loginTotal = this.metrics.login.success + this.metrics.login.failure;
    const registrationTotal = this.metrics.registration.success + this.metrics.registration.failure;
    const passwordResetTotal = this.metrics.passwordReset.requests;
    const emailVerificationTotal = this.metrics.emailVerification.sent;
    const twoFactorVerificationTotal = this.metrics.twoFactor.verificationSuccess + this.metrics.twoFactor.verificationFailure;
    const oauthGoogleTotal = this.metrics.oauth.google.success + this.metrics.oauth.google.failure;
    const legacyMigrationTotal = this.metrics.legacyMigration.success + this.metrics.legacyMigration.failure;
    const sessionEndedTotal = this.metrics.sessions.invalidated + this.metrics.sessions.expired;

    return {
      loginSuccessRate: loginTotal > 0 ? ((this.metrics.login.success / loginTotal) * 100).toFixed(2) : '0.00',
      registrationSuccessRate: registrationTotal > 0 ? ((this.metrics.registration.success / registrationTotal) * 100).toFixed(2) : '0.00',
      passwordResetSuccessRate: passwordResetTotal > 0 ? ((this.metrics.passwordReset.success / passwordResetTotal) * 100).toFixed(2) : '0.00',
      emailVerificationSuccessRate: emailVerificationTotal > 0 ? ((this.metrics.emailVerification.success / emailVerificationTotal) * 100).toFixed(2) : '0.00',
      twoFactorAdoptionRate: this.metrics.totalUsers > 0 ? ((this.metrics.twoFactor.enabled / this.metrics.totalUsers) * 100).toFixed(2) : '0.00',
      twoFactorVerificationSuccessRate: twoFactorVerificationTotal > 0 ? ((this.metrics.twoFactor.verificationSuccess / twoFactorVerificationTotal) * 100).toFixed(2) : '0.00',
      oauthGoogleSuccessRate: oauthGoogleTotal > 0 ? ((this.metrics.oauth.google.success / oauthGoogleTotal) * 100).toFixed(2) : '0.00',
      legacyMigrationSuccessRate: legacyMigrationTotal > 0 ? ((this.metrics.legacyMigration.success / legacyMigrationTotal) * 100).toFixed(2) : '0.00',
      averageSessionDurationHours: sessionEndedTotal > 0 ? ((this.metrics.sessions.totalDuration / sessionEndedTotal) / 3600).toFixed(2) : '0.00',
      activeSessions: this.metrics.sessions.created - this.metrics.sessions.invalidated - this.metrics.sessions.expired,
    };
  }

  // Get metrics summary
  getMetricsSummary() {
    return {
      timestamp: this.metrics.timestamp,
      authentication: {
        loginSuccess: this.metrics.login.success,
        loginFailure: this.metrics.login.failure,
        loginSuccessRate: this.getCalculatedMetrics().loginSuccessRate + '%',
      },
      registration: {
        success: this.metrics.registration.success,
        failure: this.metrics.registration.failure,
        successRate: this.getCalculatedMetrics().registrationSuccessRate + '%',
      },
      passwordReset: {
        requests: this.metrics.passwordReset.requests,
        success: this.metrics.passwordReset.success,
        successRate: this.getCalculatedMetrics().passwordResetSuccessRate + '%',
      },
      emailVerification: {
        sent: this.metrics.emailVerification.sent,
        success: this.metrics.emailVerification.success,
        successRate: this.getCalculatedMetrics().emailVerificationSuccessRate + '%',
      },
      twoFactor: {
        enabled: this.metrics.twoFactor.enabled,
        adoptionRate: this.getCalculatedMetrics().twoFactorAdoptionRate + '%',
        verificationSuccess: this.metrics.twoFactor.verificationSuccess,
        verificationFailure: this.metrics.twoFactor.verificationFailure,
        verificationSuccessRate: this.getCalculatedMetrics().twoFactorVerificationSuccessRate + '%',
      },
      oauth: {
        google: {
          success: this.metrics.oauth.google.success,
          failure: this.metrics.oauth.google.failure,
          successRate: this.getCalculatedMetrics().oauthGoogleSuccessRate + '%',
        },
      },
      sessions: {
        created: this.metrics.sessions.created,
        active: this.getCalculatedMetrics().activeSessions,
        invalidated: this.metrics.sessions.invalidated,
        expired: this.metrics.sessions.expired,
        averageDurationHours: this.getCalculatedMetrics().averageSessionDurationHours,
      },
      legacyMigration: {
        pending: this.metrics.legacyMigration.pending,
        success: this.metrics.legacyMigration.success,
        failure: this.metrics.legacyMigration.failure,
        successRate: this.getCalculatedMetrics().legacyMigrationSuccessRate + '%',
      },
      security: {
        rateLimitViolations: this.metrics.security.rateLimitViolations,
        suspiciousActivity: this.metrics.security.suspiciousActivity,
        blockedIPs: this.metrics.security.blockedIPs,
      },
    };
  }

  // Time series tracking
  captureSnapshot() {
    const snapshot = {
      timestamp: new Date().toISOString(),
      ...this.getMetricsSummary(),
    };

    this.timeSeries.push(snapshot);

    // Keep only the most recent data points
    if (this.timeSeries.length > this.maxTimeSeriesPoints) {
      this.timeSeries.shift();
    }

    return snapshot;
  }

  getTimeSeriesMetrics(hoursBack = 24) {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return this.timeSeries.filter(point => new Date(point.timestamp) >= cutoffTime);
  }

  // Reset metrics (for testing)
  reset() {
    this.metrics = {
      login: { success: 0, failure: 0 },
      registration: { success: 0, failure: 0 },
      passwordReset: { requests: 0, success: 0 },
      emailVerification: { sent: 0, success: 0 },
      twoFactor: { enabled: 0, verificationSuccess: 0, verificationFailure: 0 },
      oauth: {
        google: { success: 0, failure: 0 },
        github: { success: 0, failure: 0 },
      },
      sessions: { created: 0, invalidated: 0, expired: 0, totalDuration: 0 },
      legacyMigration: { pending: 0, success: 0, failure: 0 },
      security: { rateLimitViolations: 0, suspiciousActivity: 0, blockedIPs: 0 },
      totalUsers: 0,
      timestamp: new Date().toISOString(),
    };
    this.timeSeries = [];
  }

  updateTimestamp() {
    this.metrics.timestamp = new Date().toISOString();
  }
}

// Export singleton instance
const authMetrics = new AuthMetrics();

// Capture snapshots every hour
setInterval(() => {
  authMetrics.captureSnapshot();
}, 60 * 60 * 1000);

module.exports = authMetrics;
