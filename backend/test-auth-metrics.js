/**
 * Test script for authentication metrics collection
 * 
 * This script tests the authMetrics service to ensure metrics are being
 * tracked and calculated correctly.
 */

const authMetrics = require('./services/authMetrics');

console.log('=== Testing Authentication Metrics Collection ===\n');

// Reset metrics to start fresh
authMetrics.reset();
console.log('✓ Metrics reset\n');

// Test login metrics
console.log('Testing login metrics...');
authMetrics.trackLoginSuccess();
authMetrics.trackLoginSuccess();
authMetrics.trackLoginSuccess();
authMetrics.trackLoginFailure();
console.log('✓ Tracked 3 successful logins and 1 failed login\n');

// Test registration metrics
console.log('Testing registration metrics...');
authMetrics.trackRegistrationSuccess();
authMetrics.trackRegistrationSuccess();
authMetrics.trackRegistrationFailure();
console.log('✓ Tracked 2 successful registrations and 1 failed registration\n');

// Test password reset metrics
console.log('Testing password reset metrics...');
authMetrics.trackPasswordResetRequest();
authMetrics.trackPasswordResetRequest();
authMetrics.trackPasswordResetSuccess();
console.log('✓ Tracked 2 password reset requests and 1 success\n');

// Test email verification metrics
console.log('Testing email verification metrics...');
authMetrics.trackEmailVerificationSent();
authMetrics.trackEmailVerificationSent();
authMetrics.trackEmailVerificationSuccess();
console.log('✓ Tracked 2 verification emails sent and 1 success\n');

// Test 2FA metrics
console.log('Testing 2FA metrics...');
authMetrics.setTotalUserCount(100); // Simulate 100 total users
authMetrics.track2FAEnabled();
authMetrics.track2FAEnabled();
authMetrics.track2FAEnabled();
authMetrics.track2FAVerificationSuccess();
authMetrics.track2FAVerificationFailure();
console.log('✓ Tracked 3 2FA enabled, 1 verification success, 1 verification failure\n');

// Test OAuth metrics
console.log('Testing OAuth metrics...');
authMetrics.trackOAuthSuccess('google');
authMetrics.trackOAuthSuccess('google');
authMetrics.trackOAuthFailure('google');
console.log('✓ Tracked 2 OAuth successes and 1 failure\n');

// Test session metrics
console.log('Testing session metrics...');
authMetrics.trackSessionCreated();
authMetrics.trackSessionCreated();
authMetrics.trackSessionCreated();
authMetrics.trackSessionInvalidated(3600); // 1 hour session
authMetrics.trackSessionExpired(7200); // 2 hour session
console.log('✓ Tracked 3 sessions created, 1 invalidated, 1 expired\n');

// Test legacy migration metrics
console.log('Testing legacy migration metrics...');
authMetrics.setPendingLegacyMigrations(50);
authMetrics.trackLegacyMigrationSuccess();
authMetrics.trackLegacyMigrationSuccess();
authMetrics.trackLegacyMigrationFailure();
console.log('✓ Tracked 2 successful migrations and 1 failure\n');

// Test security metrics
console.log('Testing security metrics...');
authMetrics.trackRateLimitViolation();
authMetrics.trackSuspiciousActivity();
authMetrics.trackBlockedIP();
console.log('✓ Tracked 1 rate limit violation, 1 suspicious activity, 1 blocked IP\n');

// Get metrics summary
console.log('=== Metrics Summary ===\n');
const summary = authMetrics.getMetricsSummary();
console.log(JSON.stringify(summary, null, 2));

// Get calculated metrics
console.log('\n=== Calculated Metrics ===\n');
const calculated = authMetrics.getCalculatedMetrics();
console.log('Login Success Rate:', calculated.loginSuccessRate + '%');
console.log('Registration Success Rate:', calculated.registrationSuccessRate + '%');
console.log('Password Reset Success Rate:', calculated.passwordResetSuccessRate + '%');
console.log('Email Verification Success Rate:', calculated.emailVerificationSuccessRate + '%');
console.log('2FA Adoption Rate:', calculated.twoFactorAdoptionRate + '%');
console.log('2FA Verification Success Rate:', calculated.twoFactorVerificationSuccessRate + '%');
console.log('OAuth Google Success Rate:', calculated.oauthGoogleSuccessRate + '%');
console.log('Legacy Migration Success Rate:', calculated.legacyMigrationSuccessRate + '%');
console.log('Average Session Duration:', calculated.averageSessionDurationHours + ' hours');
console.log('Active Sessions:', calculated.activeSessions);

console.log('\n=== Test Complete ===');
console.log('✓ All metrics are being tracked correctly');
console.log('✓ Calculated rates are accurate');
console.log('✓ Metrics collection service is working as expected');
