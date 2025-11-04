const fs = require('fs');

const code = `class AuthMetrics {
  constructor() {
    this.metrics = {
      login: { success: 0, failure: 0, total: 0 },
      registration: { success: 0, failure: 0, total: 0 },
      passwordReset: { requests: 0, success: 0, failure: 0 },
      emailVerification: { sent: 0, success: 0, failure: 0 },
      twoFactor: { enabled: 0, disabled: 0, totalUsers: 0, adoptionRate: 0, verificationSuccess: 0, verificationFailure: 0 },
      oauth: { google: { success: 0, failure: 0 } },
      sessions: { created: 0, invalidated: 0, expired: 0, active: 0, averageDuration: 0 },
      legacyMigration: { success: 0, failure: 0, pending: 0 },
      security: { rateLimitViolations: 0, suspiciousActivity: 0, blockedIPs: 0 }
    };
    this.sessionDurations = [];
    this.maxSessionDurationsTracked = 1000;
    this.timeSeriesMetrics = new Map();
    this.currentHourBucket = this._getCurrentHourBucket();
    this._startPeriodicAggregation();
  }
  _getCurrentHourBucket() { const n = new Date(); n.setMinutes(0, 0, 0); return n.toISOString(); }
  _startPeriodicAggregation() {
    setInterval(() => { const b = this._getCurrentHourBucket(); if (b !== this.currentHourBucket) { this._archiveCurrentMetrics(); this.currentHourBucket = b; } }, 60000);
    setInterval(() => { this._cleanupOldTimeSeries(); }, 3600000);
  }
  _archiveCurrentMetrics() { const s = JSON.parse(JSON.stringify(this.metrics)); s.timestamp = this.currentHourBucket; this.timeSeriesMetrics.set(this.currentHourBucket, s); }
  _cleanupOldTimeSeries() { const c = new Date(); c.setHours(c.getHours() - 24); const iso = c.toISOString(); for (const [ts] of this.timeSeriesMetrics) { if (ts < iso) this.timeSeriesMetrics.delete(ts); } }
  trackLoginSuccess() { this.metrics.login.success++; this.metrics.login.total++; }
  trackLoginFailure() { this.metrics.login.failure++; this.metrics.login.total++; }
  trackRegistrationSuccess() { this.metrics.registration.success++; this.metrics.registration.total++; }
  trackRegistrationFailure() { this.metrics.registration.failure++; this.metrics.registration.total++; }
  trackPasswordResetRequest() { this.metrics.passwordReset.requests++; }
  trackPasswordResetSuccess() { this.metrics.passwordReset.success++; }
  trackPasswordResetFailure() { this.metrics.passwordReset.failure++; }
  trackEmailVerificationSent() { this.metrics.emailVerification.sent++; }
  trackEmailVerificationSuccess() { this.metrics.emailVerification.success++; }
  trackEmailVerificationFailure() { this.metrics.emailVerification.failure++; }
  track2FAEnabled() { this.metrics.twoFactor.enabled++; this._update2FAAdoptionRate(); }
  track2FADisabled() { this.metrics.twoFactor.disabled++; this._update2FAAdoptionRate(); }
  track2FAVerificationSuccess() { this.metrics.twoFactor.verificationSuccess++; }
  track2FAVerificationFailure() { this.metrics.twoFactor.verificationFailure++; }
  _update2FAAdoptionRate() { const e = this.metrics.twoFactor.enabled - this.metrics.twoFactor.disabled; const u = this.metrics.twoFactor.totalUsers || 1; this.metrics.twoFactor.adoptionRate = (e / u) * 100; }
  setTotalUserCount(c) { this.metrics.twoFactor.totalUsers = c; this._update2FAAdoptionRate(); }
  trackOAuthSuccess(p = 'google') { if (this.metrics.oauth[p]) this.metrics.oauth[p].success++; }
  trackOAuthFailure(p = 'google') { if (this.metrics.oauth[p]) this.metrics.oauth[p].failure++; }
  trackSessionCreated() { this.metrics.sessions.created++; this.metrics.sessions.active++; }
  trackSessionInvalidated(d) { this.metrics.sessions.invalidated++; this.metrics.sessions.active = Math.max(0, this.metrics.sessions.active - 1); if (d) this._trackSessionDuration(d); }
  trackSessionExpired(d) { this.metrics.sessions.expired++; this.metrics.sessions.active = Math.max(0, this.metrics.sessions.active - 1); if (d) this._trackSessionDuration(d); }
  _trackSessionDuration(d) { this.sessionDurations.push(d); if (this.sessionDurations.length > this.maxSessionDurationsTracked) this.sessionDurations.shift(); const sum = this.sessionDurations.reduce((a, v) => a + v, 0); this.metrics.sessions.averageDuration = Math.round(sum / this.sessionDurations.length); }
  trackLegacyMigrationSuccess() { this.metrics.legacyMigration.success++; this.metrics.legacyMigration.pending = Math.max(0, this.metrics.legacyMigration.pending - 1); }
  trackLegacyMigrationFailure() { this.metrics.legacyMigration.failure++; }
  setPendingLegacyMigrations(c) { this.metrics.legacyMigration.pending = c; }
  trackRateLimitViolation() { this.metrics.security.rateLimitViolations++; }
  trackSuspiciousActivity() { this.metrics.security.suspiciousActivity++; }
  trackBlockedIP() { this.metrics.security.blockedIPs++; }
  getMetrics() { return JSON.parse(JSON.stringify(this.metrics)); }
  getCalculatedMetrics() {
    const m = this.getMetrics();
    return {
      loginSuccessRate: m.login.total > 0 ? ((m.login.success / m.login.total) * 100).toFixed(2) : 0,
      loginFailureRate: m.login.total > 0 ? ((m.login.failure / m.login.total) * 100).toFixed(2) : 0,
      registrationSuccessRate: m.registration.total > 0 ? ((m.registration.success / m.registration.total) * 100).toFixed(2) : 0,
      passwordResetSuccessRate: m.passwordReset.requests > 0 ? ((m.passwordReset.success / m.passwordReset.requests) * 100).toFixed(2) : 0,
      emailVerificationSuccessRate: m.emailVerification.sent > 0 ? ((m.emailVerification.success / m.emailVerification.sent) * 100).toFixed(2) : 0,
      twoFactorAdoptionRate: m.twoFactor.adoptionRate.toFixed(2),
      twoFactorVerificationSuccessRate: (m.twoFactor.verificationSuccess + m.twoFactor.verificationFailure) > 0 ? ((m.twoFactor.verificationSuccess / (m.twoFactor.verificationSuccess + m.twoFactor.verificationFailure)) * 100).toFixed(2) : 0,
      oauthGoogleSuccessRate: (m.oauth.google.success + m.oauth.google.failure) > 0 ? ((m.oauth.google.success / (m.oauth.google.success + m.oauth.google.failure)) * 100).toFixed(2) : 0,
      legacyMigrationSuccessRate: (m.legacyMigration.success + m.legacyMigration.failure) > 0 ? ((m.legacyMigration.success / (m.legacyMigration.success + m.legacyMigration.failure)) * 100).toFixed(2) : 0,
      averageSessionDurationHours: (m.sessions.averageDuration / 3600).toFixed(2),
      activeSessions: m.sessions.active,
      ...m
    };
  }
  getTimeSeriesMetrics(h = 24) {
    const c = new Date(); c.setHours(c.getHours() - h); const iso = c.toISOString(); const ts = [];
    for (const [timestamp, metrics] of this.timeSeriesMetrics) { if (timestamp >= iso) ts.push({ timestamp, ...metrics }); }
    ts.sort((a, b) => a.timestamp.localeCompare(b.timestamp)); return ts;
  }
  getMetricsSummary() {
    const c = this.getCalculatedMetrics();
    return {
      timestamp: new Date().toISOString(),
      authentication: { totalLogins: c.login.total, successRate: c.loginSuccessRate + '%', failureRate: c.loginFailureRate + '%' },
      registration: { totalRegistrations: c.registration.total, successRate: c.registrationSuccessRate + '%' },
      passwordReset: { totalRequests: c.passwordReset.requests, successRate: c.passwordResetSuccessRate + '%' },
      twoFactor: { adoptionRate: c.twoFactorAdoptionRate + '%', verificationSuccessRate: c.twoFactorVerificationSuccessRate + '%', totalEnabled: c.twoFactor.enabled - c.twoFactor.disabled },
      sessions: { active: c.activeSessions, averageDuration: c.averageSessionDurationHours + ' hours', totalCreated: c.sessions.created },
      security: { rateLimitViolations: c.security.rateLimitViolations, suspiciousActivity: c.security.suspiciousActivity, blockedIPs: c.security.blockedIPs },
      legacyMigration: { completed: c.legacyMigration.success, pending: c.legacyMigration.pending, successRate: c.legacyMigrationSuccessRate + '%' }
    };
  }
  reset() {
    this.metrics = { login: { success: 0, failure: 0, total: 0 }, registration: { success: 0, failure: 0, total: 0 }, passwordReset: { requests: 0, success: 0, failure: 0 }, emailVerification: { sent: 0, success: 0, failure: 0 }, twoFactor: { enabled: 0, disabled: 0, totalUsers: 0, adoptionRate: 0, verificationSuccess: 0, verificationFailure: 0 }, oauth: { google: { success: 0, failure: 0 } }, sessions: { created: 0, invalidated: 0, expired: 0, active: 0, averageDuration: 0 }, legacyMigration: { success: 0, failure: 0, pending: 0 }, security: { rateLimitViolations: 0, suspiciousActivity: 0, blockedIPs: 0 } };
    this.sessionDurations = [];
    this.timeSeriesMetrics.clear();
  }
}
module.exports = new AuthMetrics();`;

fs.writeFileSync('services/authMetrics.js', code, 'utf8');
console.log('✓ authMetrics.js created successfully');
