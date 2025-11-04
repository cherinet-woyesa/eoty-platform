/**
 * Security Event Monitoring Service
 * 
 * Monitors authentication events for suspicious patterns and security threats.
 * Works in conjunction with authLogger to detect and respond to security issues.
 * 
 * Requirements: 14.5
 */

const authLogger = require('./authLogger');

class SecurityMonitor {
  constructor() {
    // In-memory tracking for suspicious activity detection
    // In production, this should use Redis or similar for distributed systems
    this.failedAttempts = new Map(); // Track failed login attempts by IP
    this.rateLimitViolations = new Map(); // Track rate limit violations
    this.suspiciousIPs = new Set(); // Track IPs with suspicious behavior
    
    // Configuration thresholds
    this.config = {
      maxFailedAttempts: 5,
      failedAttemptsWindow: 15 * 60 * 1000, // 15 minutes
      maxRateLimitViolations: 3,
      rateLimitViolationWindow: 60 * 60 * 1000, // 1 hour
      suspiciousActivityThreshold: 10,
    };

    // Clean up old entries periodically
    this._startCleanupInterval();
  }

  /**
   * Start periodic cleanup of old tracking data
   * @private
   */
  _startCleanupInterval() {
    setInterval(() => {
      this._cleanupOldEntries();
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Clean up old tracking entries
   * @private
   */
  _cleanupOldEntries() {
    const now = Date.now();

    // Clean up failed attempts
    for (const [key, data] of this.failedAttempts.entries()) {
      if (now - data.firstAttempt > this.config.failedAttemptsWindow) {
        this.failedAttempts.delete(key);
      }
    }

    // Clean up rate limit violations
    for (const [key, data] of this.rateLimitViolations.entries()) {
      if (now - data.firstViolation > this.config.rateLimitViolationWindow) {
        this.rateLimitViolations.delete(key);
      }
    }
  }

  /**
   * Get IP address from request
   * @private
   */
  _getIPAddress(req) {
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  /**
   * Track failed login attempt
   * Detects brute force attacks and credential stuffing
   * 
   * Requirements: 14.5
   */
  trackFailedLogin(email, req, reason) {
    const ip = this._getIPAddress(req);
    const key = `${ip}:${email}`;
    const now = Date.now();

    // Get or create tracking entry
    let tracking = this.failedAttempts.get(key);
    
    if (!tracking) {
      tracking = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now,
        email,
        ip,
      };
    }

    // Check if we're within the time window
    if (now - tracking.firstAttempt > this.config.failedAttemptsWindow) {
      // Reset if outside window
      tracking = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        email,
        ip,
      };
    } else {
      tracking.count++;
      tracking.lastAttempt = now;
    }

    this.failedAttempts.set(key, tracking);

    // Check if threshold exceeded
    if (tracking.count >= this.config.maxFailedAttempts) {
      this._handleSuspiciousActivity(
        `Multiple failed login attempts detected (${tracking.count} attempts)`,
        req,
        {
          email,
          attempt_count: tracking.count,
          time_window: Math.floor((now - tracking.firstAttempt) / 1000),
          pattern: 'brute_force',
        }
      );
      
      // Mark IP as suspicious
      this.suspiciousIPs.add(ip);
    }

    // Log the failed attempt
    authLogger.logLoginFailure(email, reason, req, {
      failed_attempt_count: tracking.count,
    });
  }

  /**
   * Track rate limit violation
   * Detects automated attacks and abuse
   * 
   * Requirements: 14.5
   */
  trackRateLimitViolation(endpoint, req) {
    const ip = this._getIPAddress(req);
    const key = `${ip}:${endpoint}`;
    const now = Date.now();

    // Get or create tracking entry
    let tracking = this.rateLimitViolations.get(key);
    
    if (!tracking) {
      tracking = {
        count: 0,
        firstViolation: now,
        lastViolation: now,
        endpoint,
        ip,
      };
    }

    // Check if we're within the time window
    if (now - tracking.firstViolation > this.config.rateLimitViolationWindow) {
      // Reset if outside window
      tracking = {
        count: 1,
        firstViolation: now,
        lastViolation: now,
        endpoint,
        ip,
      };
    } else {
      tracking.count++;
      tracking.lastViolation = now;
    }

    this.rateLimitViolations.set(key, tracking);

    // Check if threshold exceeded
    if (tracking.count >= this.config.maxRateLimitViolations) {
      this._handleSuspiciousActivity(
        `Repeated rate limit violations detected (${tracking.count} violations)`,
        req,
        {
          endpoint,
          violation_count: tracking.count,
          time_window: Math.floor((now - tracking.firstViolation) / 1000),
          pattern: 'rate_limit_abuse',
        }
      );
      
      // Mark IP as suspicious
      this.suspiciousIPs.add(ip);
    }

    // Log the rate limit violation
    authLogger.logRateLimitExceeded(endpoint, req, {
      violation_count: tracking.count,
    });
  }

  /**
   * Track failed 2FA attempt
   * Detects 2FA bypass attempts
   * 
   * Requirements: 14.5
   */
  trackFailed2FA(userId, email, req, reason) {
    const ip = this._getIPAddress(req);
    const key = `2fa:${ip}:${userId}`;
    const now = Date.now();

    // Get or create tracking entry
    let tracking = this.failedAttempts.get(key);
    
    if (!tracking) {
      tracking = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now,
        userId,
        email,
        ip,
      };
    }

    // Check if we're within the time window
    if (now - tracking.firstAttempt > this.config.failedAttemptsWindow) {
      // Reset if outside window
      tracking = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        userId,
        email,
        ip,
      };
    } else {
      tracking.count++;
      tracking.lastAttempt = now;
    }

    this.failedAttempts.set(key, tracking);

    // Check if threshold exceeded (lower threshold for 2FA)
    if (tracking.count >= 3) {
      this._handleSuspiciousActivity(
        `Multiple failed 2FA attempts detected (${tracking.count} attempts)`,
        req,
        {
          user_id: userId,
          email,
          attempt_count: tracking.count,
          time_window: Math.floor((now - tracking.firstAttempt) / 1000),
          pattern: '2fa_bypass_attempt',
        }
      );
      
      // Mark IP as suspicious
      this.suspiciousIPs.add(ip);
    }

    // Log the failed 2FA attempt
    authLogger.log2FAFailure(userId, email, reason, req, {
      failed_attempt_count: tracking.count,
    });
  }

  /**
   * Check if IP is suspicious
   * Can be used to add additional security measures
   */
  isSuspiciousIP(req) {
    const ip = this._getIPAddress(req);
    return this.suspiciousIPs.has(ip);
  }

  /**
   * Clear suspicious IP status
   * Can be called after manual review or timeout
   */
  clearSuspiciousIP(ip) {
    this.suspiciousIPs.delete(ip);
  }

  /**
   * Get failed attempt count for an IP/email combination
   */
  getFailedAttemptCount(email, req) {
    const ip = this._getIPAddress(req);
    const key = `${ip}:${email}`;
    const tracking = this.failedAttempts.get(key);
    return tracking ? tracking.count : 0;
  }

  /**
   * Handle suspicious activity detection
   * @private
   */
  _handleSuspiciousActivity(description, req, additionalData = {}) {
    // Log the suspicious activity
    authLogger.logSuspiciousActivity(description, req, additionalData);

    // In production, you might want to:
    // 1. Send alerts to security team
    // 2. Temporarily block the IP
    // 3. Trigger additional verification steps
    // 4. Update WAF rules
    // 5. Store in security incident database
  }

  /**
   * Track successful login (to reset failed attempts)
   */
  trackSuccessfulLogin(email, req) {
    const ip = this._getIPAddress(req);
    const key = `${ip}:${email}`;
    
    // Clear failed attempts for this IP/email combination
    this.failedAttempts.delete(key);
  }

  /**
   * Detect account enumeration attempts
   * Monitors patterns that suggest attackers are trying to discover valid accounts
   */
  detectAccountEnumeration(req) {
    const ip = this._getIPAddress(req);
    const userAgent = req.get('user-agent');
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      // Automated tools often have specific user agents
      /curl|wget|python|scanner|bot/i,
      // Missing or generic user agents
      /^$/,
    ];

    const isSuspiciousUserAgent = suspiciousPatterns.some(pattern => 
      pattern.test(userAgent || '')
    );

    if (isSuspiciousUserAgent) {
      this._handleSuspiciousActivity(
        'Potential account enumeration attempt detected',
        req,
        {
          pattern: 'account_enumeration',
          user_agent: userAgent,
        }
      );
    }

    return isSuspiciousUserAgent;
  }

  /**
   * Get security statistics
   * Useful for monitoring dashboards
   */
  getSecurityStats() {
    return {
      suspicious_ips: this.suspiciousIPs.size,
      tracked_failed_attempts: this.failedAttempts.size,
      tracked_rate_limit_violations: this.rateLimitViolations.size,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
module.exports = new SecurityMonitor();
