/**
 * Feature Flags Utility
 * 
 * Centralized feature flag management for the EOTY Platform.
 * This module provides a clean interface for checking feature flags
 * throughout the application.
 * 
 * Requirements: 17.1, 17.3
 */

/**
 * Check if legacy user migration is enabled
 * @returns {boolean} True if legacy migration is enabled
 */
function isLegacyMigrationEnabled() {
  return process.env.ENABLE_LEGACY_MIGRATION === 'true';
}

/**
 * Check if Better Auth is enabled
 * @returns {boolean} True if Better Auth is enabled
 */
function isBetterAuthEnabled() {
  return process.env.ENABLE_BETTER_AUTH === 'true';
}

/**
 * Get all feature flags status
 * @returns {Object} Object containing all feature flag states
 */
function getAllFeatureFlags() {
  return {
    legacyMigration: isLegacyMigrationEnabled(),
    betterAuth: isBetterAuthEnabled(),
  };
}

/**
 * Validate feature flag configuration
 * Ensures that feature flags are in a valid state
 * @returns {Object} Validation result with any warnings
 */
function validateFeatureFlags() {
  const warnings = [];
  
  // If Better Auth is enabled but legacy migration is disabled,
  // existing users won't be able to migrate
  if (isBetterAuthEnabled() && !isLegacyMigrationEnabled()) {
    warnings.push(
      'Better Auth is enabled but legacy migration is disabled. ' +
      'Existing users will not be able to migrate automatically.'
    );
  }
  
  // If both are disabled, authentication won't work
  if (!isBetterAuthEnabled() && !isLegacyMigrationEnabled()) {
    warnings.push(
      'Both Better Auth and legacy migration are disabled. ' +
      'Users may not be able to authenticate.'
    );
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
  };
}

module.exports = {
  isLegacyMigrationEnabled,
  isBetterAuthEnabled,
  getAllFeatureFlags,
  validateFeatureFlags,
};
