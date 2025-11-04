# Implementation Plan

- [x] 1. Install Better Auth dependencies and setup project structure





  - Install `better-auth` package in backend
  - Install `better-auth` React client in frontend
  - Install required peer dependencies (pg adapter, nodemailer)
  - Create directory structure for auth configuration files
  - _Requirements: 1.1, 1.2_

- [x] 2. Configure Better Auth server




  - [x] 2.1 Create Better Auth configuration file with PostgreSQL adapter


    - Create `backend/lib/auth.ts` with Better Auth initialization
    - Configure database connection using existing PostgreSQL credentials
    - Set up email/password authentication provider
    - Configure Google OAuth provider with client ID and secret
    - Define custom user fields (role, chapter_id, first_name, last_name, profile_picture, is_active)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 8.1_

  - [x] 2.2 Configure session management settings


    - Set session expiration to 7 days
    - Enable session refresh mechanism
    - Configure secure HTTP-only cookies
    - Set up session cookie cache (5 minutes)
    - _Requirements: 1.5, 7.1, 7.2, 7.3_

  - [x] 2.3 Configure rate limiting and security settings


    - Enable rate limiting (5 attempts per 15 minutes for login)
    - Configure CSRF protection
    - Set secure cookies for production environment
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 3. Create database migrations for Better Auth




  - [x] 3.1 Create migration for Better Auth tables


    - Create migration file `backend/migrations/017_better_auth_setup.js`
    - Add `session` table with proper schema and indexes
    - Add `account` table for OAuth providers
    - Add `verification` table for email verification tokens
    - Create indexes on session.user_id, session.token, account.user_id
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 3.2 Create migration to modify existing users table


    - Add `email_verified` column (boolean, default false)
    - Add `two_factor_enabled` column (boolean, default false)
    - Add `two_factor_secret` column (text, nullable)
    - Add `migrated_to_better_auth` column (boolean, default false)
    - _Requirements: 2.2, 2.3, 3.2, 3.3, 3.4_

  - [x] 3.3 Create rollback migration script

    - Create down migration to remove Better Auth tables
    - Create down migration to remove new columns from users table
    - Test rollback functionality
    - _Requirements: 2.5, 17.2, 17.4_

  - [x] 3.4 Run migrations and verify database schema



    - Execute migrations on development database
    - Verify all tables and columns created correctly
    - Check indexes are in place
    - Validate data integrity of existing users
    - _Requirements: 2.5_

- [x] 4. Implement Better Auth routes and middleware





  - [x] 4.1 Create Better Auth route handler



    - Create `backend/routes/betterAuth.ts` file
    - Mount Better Auth handler at `/api/auth/*`
    - Export router for Express app integration
    - _Requirements: 13.1, 13.2_

  - [x] 4.2 Create session authentication middleware


    - Create `backend/middleware/betterAuthMiddleware.ts`
    - Implement `requireAuth` middleware to validate sessions
    - Implement `optionalAuth` middleware for public endpoints
    - Add user and session data to request object
    - Check user is_active status
    - _Requirements: 13.1, 13.4, 13.5_

  - [x] 4.3 Create RBAC middleware for Better Auth



    - Create `backend/middleware/rbacMiddleware.ts`
    - Implement `requireRole` middleware for role-based access
    - Implement `requirePermission` middleware for permission checks
    - Implement `requireChapter` middleware for chapter validation
    - Integrate with existing permission map
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 4.4 Update Express app to use Better Auth routes


    - Import Better Auth router in main app file
    - Mount Better Auth routes before other routes
    - Update CORS configuration for Better Auth
    - _Requirements: 1.1, 13.1_

- [x] 5. Implement legacy user migration service







  - [x] 5.1 Create legacy user migration service


    - Create `backend/services/legacyUserMigration.ts`
    - Implement method to check if user is legacy user
    - Implement method to verify legacy password hash
    - Implement method to create Better Auth user from legacy user
    - Mark legacy user as migrated after successful migration
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.2 Create migration endpoint for transparent migration


    - Create custom endpoint `/api/auth/migrate-login`
    - Check if user exists in legacy system
    - Verify password with legacy bcrypt hash
    - Migrate user to Better Auth if not already migrated
    - Return Better Auth session on successful migration
    - _Requirements: 3.1, 3.2_

  - [x] 5.3 Add feature flag for migration control


    - Add `ENABLE_LEGACY_MIGRATION` environment variable
    - Implement feature flag check in migration endpoint
    - Allow toggling between legacy and Better Auth systems
    - _Requirements: 17.1, 17.3_

- [x] 6. Implement email verification flow






  - [x] 6.1 Create email service for sending verification emails

    - Create `backend/services/emailService.ts`
    - Configure nodemailer with SMTP settings
    - Implement method to send verification email with token
    - Implement method to send password reset email
    - Create email templates for verification and reset
    - _Requirements: 5.1, 5.2, 6.1, 6.2_


  - [x] 6.2 Configure Better Auth email verification

    - Enable email verification in Better Auth config
    - Set verification token expiration to 24 hours
    - Configure email sending callback
    - _Requirements: 5.1, 5.3, 5.4_


  - [x] 6.3 Create email verification UI components

    - Create verification success page component
    - Create resend verification email component
    - Add verification status indicator to user profile
    - _Requirements: 5.5_

- [x] 7. Implement password reset flow





  - [x] 7.1 Configure Better Auth password reset


    - Enable password reset in Better Auth config
    - Set reset token expiration to 1 hour
    - Configure single-use token validation
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 7.2 Create password reset UI components


    - Create forgot password page component
    - Create reset password page component
    - Add password strength indicator
    - Add success/error feedback messages
    - _Requirements: 6.4, 15.1, 15.3_


  - [x] 7.3 Implement session invalidation on password reset

    - Configure Better Auth to invalidate all sessions on password change
    - Test that user must re-login after password reset
    - _Requirements: 6.5_

- [ ] 8. Implement two-factor authentication (2FA)
  - [ ] 8.1 Configure Better Auth 2FA with TOTP
    - Enable 2FA in Better Auth configuration
    - Configure TOTP secret generation
    - Set up backup codes generation
    - _Requirements: 10.1, 10.3_

  - [ ] 8.2 Create 2FA setup UI components
    - Create 2FA setup page with QR code display
    - Create backup codes display component
    - Add 2FA enable/disable toggle in user settings
    - _Requirements: 10.1, 10.5_

  - [ ] 8.3 Create 2FA verification UI components
    - Create 2FA code input component for login
    - Add 2FA verification step to login flow
    - Display backup code option
    - _Requirements: 10.2, 10.4_

- [x] 9. Setup frontend Better Auth client




  - [x] 9.1 Create Better Auth client configuration


    - Create `frontend/src/lib/auth-client.ts`
    - Initialize Better Auth React client with base URL
    - Export auth methods (signIn, signUp, signOut, useSession)
    - _Requirements: 12.1_

  - [x] 9.2 Create Better Auth context provider


    - Create `frontend/src/context/BetterAuthContext.tsx`
    - Implement context using Better Auth useSession hook
    - Add hasRole and hasPermission helper methods
    - Add loading state handling
    - _Requirements: 12.2, 12.4_

  - [x] 9.3 Update App.tsx to use Better Auth provider


    - Wrap app with BetterAuthProvider
    - Remove old AuthContext provider
    - Update imports throughout the app
    - _Requirements: 12.1, 12.2_

- [x] 10. Update authentication UI components




  - [x] 10.1 Create new login form with Better Auth


    - Create `frontend/src/components/auth/BetterAuthLoginForm.tsx`
    - Implement email/password login using Better Auth client
    - Add Google OAuth login button
    - Add error handling and validation
    - Add loading states
    - _Requirements: 4.1, 4.2, 8.2, 8.3, 15.1, 15.2_

  - [x] 10.2 Create new registration form with Better Auth


    - Create `frontend/src/components/auth/BetterAuthRegisterForm.tsx`
    - Implement email/password registration using Better Auth client
    - Add chapter selection dropdown
    - Enforce password requirements (8 chars, complexity)
    - Add password strength indicator
    - Add Google OAuth registration button
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 10.3 Update social login buttons component


    - Update `frontend/src/components/auth/SocialLoginButtons.tsx`
    - Use Better Auth Google OAuth method
    - Handle OAuth callback and errors
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_


  - [x] 10.4 Create feature flag toggle for UI

    - Add environment variable to toggle between old and new auth UI
    - Conditionally render old or new auth components
    - Test both UIs work correctly
    - _Requirements: 17.1, 17.3_

- [x] 11. Update API endpoints to use Better Auth middleware





  - [x] 11.1 Update course routes to use Better Auth middleware


    - Replace `authenticateToken` with `requireAuth` in course routes
    - Update request type to use AuthRequest
    - Test all course endpoints work with Better Auth sessions
    - _Requirements: 13.1, 13.2, 13.4_

  - [x] 11.2 Update lesson routes to use Better Auth middleware


    - Replace `authenticateToken` with `requireAuth` in lesson routes
    - Add role-based access control using `requireRole`
    - Test all lesson endpoints work with Better Auth sessions
    - _Requirements: 13.1, 13.2, 13.4_


  - [x] 11.3 Update user routes to use Better Auth middleware

    - Replace `authenticateToken` with `requireAuth` in user routes
    - Update permission checks to use Better Auth session data
    - Test all user endpoints work with Better Auth sessions
    - _Requirements: 13.1, 13.2, 13.4_


  - [x] 11.4 Update all remaining protected routes

    - Audit all routes using old auth middleware
    - Replace with Better Auth middleware
    - Update role and permission checks
    - Test all endpoints work correctly
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 12. Implement logging and monitoring











  - [x] 12.1 Create authentication event logger

    - Create `backend/services/authLogger.ts`
    - Implement structured logging for auth events
    - Log login attempts (success and failure)
    - Log registration events
    - Log password reset requests
    - Log email verification events
    - Log session creation and invalidation
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 12.2 Implement security event monitoring


    - Log rate limit violations
    - Log suspicious activity patterns
    - Log failed 2FA attempts
    - Ensure no sensitive data (passwords, tokens) in logs
    - _Requirements: 14.5_

  - [x] 12.3 Add metrics collection



    - Track authentication success/failure rates
    - Track registration rates
    - Track password reset requests
    - Track 2FA adoption rate
    - Track session duration metrics
    - _Requirements: 14.1, 14.2, 14.3_

- [ ] 13. Write comprehensive tests
  - [ ] 13.1 Write unit tests for Better Auth configuration
    - Test Better Auth initializes correctly
    - Test custom field configuration
    - Test rate limiting configuration
    - Test session configuration
    - _Requirements: 16.1_

  - [ ] 13.2 Write unit tests for middleware
    - Test requireAuth with valid and invalid sessions
    - Test requireRole with different roles
    - Test requirePermission with different permissions
    - Test requireChapter middleware
    - _Requirements: 16.1_

  - [ ] 13.3 Write unit tests for legacy migration service
    - Test legacy user detection
    - Test password verification
    - Test user migration logic
    - Test duplicate migration prevention
    - _Requirements: 16.2_

  - [ ] 13.4 Write integration tests for authentication flows
    - Test email/password registration flow
    - Test email verification flow
    - Test email/password login flow
    - Test Google OAuth login flow
    - Test legacy user migration on login
    - Test password reset flow
    - Test 2FA setup and login flow
    - _Requirements: 16.1, 16.2, 16.4, 16.5_

  - [ ] 13.5 Write integration tests for session management
    - Test session creation on login
    - Test session refresh mechanism
    - Test session invalidation on logout
    - Test concurrent sessions
    - Test session expiration
    - _Requirements: 16.4_

  - [ ] 13.6 Write integration tests for rate limiting
    - Test login rate limiting (5 attempts per 15 min)
    - Test registration rate limiting (3 attempts per hour)
    - Test password reset rate limiting (3 per hour)
    - Test rate limit response format
    - _Requirements: 16.3_

  - [ ] 13.7 Write integration tests for RBAC
    - Test role-based access control for each role
    - Test permission checks for different endpoints
    - Test chapter-based access control
    - _Requirements: 16.5_

  - [ ] 13.8 Write end-to-end tests
    - Test complete registration to login journey
    - Test Google OAuth complete flow
    - Test password reset complete flow
    - Test legacy user migration complete flow
    - Test 2FA setup and login complete flow
    - _Requirements: 16.1, 16.2, 16.4, 16.5_

- [ ] 14. Update environment configuration
  - [ ] 14.1 Add Better Auth environment variables
    - Add SMTP configuration (host, port, user, password, from)
    - Add Google OAuth credentials (client ID, client secret)
    - Add feature flags (ENABLE_LEGACY_MIGRATION, ENABLE_BETTER_AUTH)
    - Add frontend URL for email links
    - Update .env.example with new variables
    - _Requirements: 1.3, 1.4, 5.1, 17.1_

  - [ ] 14.2 Update deployment configuration
    - Update Docker configuration if applicable
    - Update CI/CD pipeline for new environment variables
    - Document required environment variables
    - _Requirements: 17.1, 17.2_

- [ ] 15. Create deployment and rollback procedures
  - [ ] 15.1 Create deployment checklist
    - Document pre-deployment steps
    - Document database backup procedure
    - Document migration execution steps
    - Document post-deployment verification steps
    - _Requirements: 17.1, 17.2, 17.3_

  - [ ] 15.2 Create rollback procedure documentation
    - Document how to toggle feature flag for immediate rollback
    - Document database rollback steps
    - Document code rollback steps
    - Test rollback procedure in staging
    - _Requirements: 17.2, 17.4, 17.5_

  - [ ] 15.3 Create monitoring and alerting setup
    - Set up alerts for authentication failures
    - Set up alerts for rate limit violations
    - Set up alerts for migration errors
    - Create dashboard for authentication metrics
    - _Requirements: 14.1, 14.2, 14.3_

- [ ] 16. Deploy to staging and test
  - [ ] 16.1 Deploy Better Auth to staging environment
    - Run database migrations on staging
    - Deploy backend with Better Auth
    - Deploy frontend with Better Auth client
    - Enable feature flag for staging
    - _Requirements: 17.1_

  - [ ] 16.2 Perform manual QA testing
    - Test all authentication flows manually
    - Test legacy user migration
    - Test error scenarios
    - Test on different browsers and devices
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ] 16.3 Perform security audit
    - Review rate limiting effectiveness
    - Review session security
    - Review CSRF protection
    - Review password security
    - Test for common vulnerabilities
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 16.4 Perform load testing
    - Test authentication endpoints under load
    - Test session validation performance
    - Test database query performance
    - Identify and fix performance bottlenecks
    - _Requirements: 2.4_

  - [ ] 16.5 Fix issues found in testing
    - Address bugs found during QA
    - Address security issues found in audit
    - Address performance issues found in load testing
    - Re-test after fixes
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 17. Deploy to production with gradual rollout
  - [ ] 17.1 Deploy to production with feature flag OFF
    - Deploy backend with Better Auth (feature flag OFF)
    - Deploy frontend with Better Auth client (feature flag OFF)
    - Run database migrations on production
    - Verify deployment successful
    - Monitor logs for errors
    - _Requirements: 17.1, 17.3_

  - [ ] 17.2 Enable Better Auth for internal team
    - Enable feature flag for internal team users only
    - Internal team tests all flows in production
    - Monitor logs and metrics closely
    - Fix any issues immediately
    - _Requirements: 17.1, 17.3_

  - [ ] 17.3 Gradual rollout to users
    - Enable Better Auth for 10% of users
    - Monitor for 48 hours
    - If stable, increase to 50% of users
    - Monitor for 48 hours
    - If stable, enable for 100% of users
    - _Requirements: 17.1, 17.3_

  - [ ] 17.4 Monitor and optimize
    - Monitor authentication metrics daily
    - Monitor error rates and logs
    - Optimize performance based on metrics
    - Address user feedback
    - _Requirements: 14.1, 14.2, 14.3_

- [ ] 18. Deprecate legacy authentication system
  - [ ] 18.1 Migrate remaining legacy users
    - Identify users who haven't logged in since migration
    - Send email notification about migration
    - Provide migration instructions
    - Offer support for migration issues
    - _Requirements: 3.1, 3.2_

  - [ ] 18.2 Disable legacy authentication endpoints
    - Remove old auth routes from Express app
    - Remove old auth middleware
    - Remove old auth controller
    - Update API documentation
    - _Requirements: 13.1, 13.2_

  - [ ] 18.3 Clean up legacy authentication code
    - Remove old AuthContext from frontend
    - Remove old login/register components
    - Remove old JWT utilities
    - Remove unused dependencies
    - _Requirements: 12.2, 12.3_

  - [ ] 18.4 Update documentation
    - Update API documentation with Better Auth endpoints
    - Update developer guide with Better Auth usage
    - Update user guide with new auth features
    - Document migration process for future reference
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 19. Post-deployment validation and optimization
  - [ ] 19.1 Validate all users migrated successfully
    - Query database for unmigrated users
    - Verify all users can authenticate
    - Address any migration issues
    - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 19.2 Optimize database performance
    - Analyze slow queries
    - Add additional indexes if needed
    - Optimize session validation queries
    - _Requirements: 2.4_

  - [ ] 19.3 Review and optimize security settings
    - Review rate limiting effectiveness
    - Adjust rate limits if needed
    - Review session expiration settings
    - Review CSRF protection
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 19.4 Gather user feedback and iterate
    - Collect user feedback on new auth experience
    - Identify pain points
    - Implement improvements based on feedback
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
