const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const authConfig = require('../config/auth');
const emailService = require('../services/emailService');
const gcsService = require('../services/gcsService');

// NOTE: In production we might not have the newest lockout columns yet.
// To keep login robust, we avoid hard dependencies on those columns.

// Runtime feature detection for lockout-related columns so login works
// even if the latest migration hasn't been applied yet.
let lockoutColumnsChecked = false;
let hasLockoutColumns = false;

async function ensureLockoutColumns() {
  if (lockoutColumnsChecked) return;
  try {
    const hasFailed = await db.schema.hasColumn('users', 'failed_login_attempts');
    const hasLocked = await db.schema.hasColumn('users', 'account_locked_until');
    hasLockoutColumns = hasFailed && hasLocked;
    if (!hasLockoutColumns) {
      console.warn(
        '[auth] Lockout columns missing on users table; login will work but without lockout tracking.'
      );
    }
  } catch (err) {
    console.error('[auth] Error checking lockout columns:', err);
    hasLockoutColumns = false;
  } finally {
    lockoutColumnsChecked = true;
  }
}

// Runtime feature detection for 2FA column
let twoFAColumnChecked = false;
let has2FAColumn = false;

async function ensure2FAColumn() {
  if (twoFAColumnChecked) return;
  try {
    has2FAColumn = await db.schema.hasColumn('users', 'is_2fa_enabled');
    if (!has2FAColumn) {
      console.warn('[auth] is_2fa_enabled column missing; 2FA will be disabled.');
    }
  } catch (err) {
    console.error('[auth] Error checking 2FA column:', err);
    has2FAColumn = false;
  } finally {
    twoFAColumnChecked = true;
  }
}

// Minimal cookie parser (avoid extra deps)
function getCookie(req, name) {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const c of cookies) {
    const [k, v] = c.split('=');
    if (k === name) return decodeURIComponent(v || '');
  }
  return null;
}

// Helper function to convert relative profile picture path to full URL
function getProfilePictureUrl(relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${baseUrl}${relativePath}`;
}

const authController = {
  async register(req, res) {
    try {
      const { 
        firstName, 
        lastName, 
        email, 
        password, 
        chapter, 
        // NOTE: Base role has been generalized from 'student' to 'user'
        role = 'user',
        // Teacher application fields
        applicationText,
        qualifications,
        experience,
        subjectAreas,
        // Teacher Profile fields (Banking & ID)
        bankName,
        accountNumber,
        routingNumber,
        idDocumentUrl,
        // Location fields
        address,
        city,
        state,
        country,
        zipCode,
        latitude,
        longitude,
        // New fields
        phoneNumber,
        dateOfBirth
      } = req.body;

      console.log('Registration attempt:', { firstName, lastName, email, chapter, role });

      // Validate required fields
      if (!firstName || !lastName || !email || !password || !chapter) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      // Validate age (must be numeric and provided)
      if (dateOfBirth) {
        const birthDate = new Date(dateOfBirth);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs); // miliseconds from epoch
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        
        if (isNaN(age)) {
           return res.status(400).json({
            success: false,
            message: 'Invalid date of birth'
          });
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Validate role - base role is now 'user' (generic member)
      const validRoles = ['user', 'teacher'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }

      // Role assignment
      // - Base members are 'user'
      // - Teachers are fully self-service (no pending_teacher gating)
      const userRole = role === 'teacher' ? 'teacher' : 'user';

      // Check if user already exists
      const existingUser = await db('users').where({ email }).first();
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Validate chapter ID exists in database
      const chapterId = parseInt(chapter);
      if (isNaN(chapterId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid chapter selection'
        });
      }

      const validChapter = await db('chapters').where({ id: chapterId, is_active: true }).first();
      if (!validChapter) {
        return res.status(400).json({
          success: false,
          message: 'Selected chapter is not valid or active'
        });
      }

      // Hash password
      const saltRounds = authConfig.bcryptRounds;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user data
      const userData = {
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: userRole,
        chapter_id: chapterId, // Use validated chapter ID
        is_active: true,
        // Location data
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
        zip_code: zipCode || null,
        latitude: latitude || null,
        longitude: longitude || null,
        phone_number: phoneNumber || null,
        date_of_birth: dateOfBirth || null,
        created_at: new Date(),
        updated_at: new Date()
      };

      console.log('Attempting to insert user:', { ...userData, password_hash: '***' });

      // FIXED: Insert user and get the ID (PostgreSQL compatible)
      const result = await db('users').insert(userData).returning('id');
      const userId = result[0].id;

      console.log('User created with ID:', userId, 'Role:', userRole, 'Chapter:', chapterId);

      // Create Teacher Profile if role is teacher
      if (role === 'teacher') {
        try {
          await db('teacher_profiles').insert({
            user_id: userId,
            bank_name: bankName || null,
            account_number: accountNumber || null,
            routing_number: routingNumber || null,
            id_document_url: idDocumentUrl || null,
            id_verification_status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
          });
        } catch (profileError) {
          console.error('Error creating teacher profile:', profileError);
          // Continue, but log error
        }
      }

      // If teacher application details are provided, create application record
      if (role === 'teacher' && applicationText && qualifications) {
        try {
          // Parse subject_areas if it's a string, otherwise use as-is
          let subjectAreasJson = null;
          if (subjectAreas) {
            if (typeof subjectAreas === 'string') {
              // If it's a comma-separated string, convert to array
              subjectAreasJson = subjectAreas.includes(',') 
                ? subjectAreas.split(',').map(s => s.trim()).filter(s => s)
                : [subjectAreas.trim()];
            } else if (Array.isArray(subjectAreas)) {
              subjectAreasJson = subjectAreas;
            }
          }
          
          await db('teacher_applications').insert({
            user_id: userId,
            application_text: applicationText,
            qualifications: qualifications,
            experience: experience || null,
            subject_areas: subjectAreasJson,
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
          });
          console.log('Teacher application created for user:', userId);
        } catch (appError) {
          console.error('Error creating teacher application:', appError);
          // Don't fail registration if application creation fails
          // User is still created and can reapply later
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId, 
          email: email.toLowerCase(), 
          role: userRole,
          firstName,
          lastName,
          chapter: chapterId // Include chapter ID in token
        },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      // Get the created user without password
      const user = await db('users')
        .where({ id: userId })
        .select('id', 'first_name', 'last_name', 'email', 'role', 'role_requested', 'chapter_id', 'is_active')
        .first();

      // Initialize onboarding for new user (REQUIREMENT: 100% new users see guided onboarding)
      try {
        const onboardingService = require('../services/onboardingService');
        await onboardingService.initializeOnboardingForUser(userId, userRole);
        console.log(`Onboarding initialized for new user ${userId}`);
      } catch (onboardingError) {
        console.error('Failed to initialize onboarding (non-critical):', onboardingError);
        // Don't fail registration if onboarding initialization fails
      }

      // Enable 2FA for new user
      await db('users').where({ id: userId }).update({ is_2fa_enabled: true });

      // Generate 2FA code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store code in two_factor_codes table
      await db('two_factor_codes').insert({
        user_id: userId,
        code: codeHash,
        expires_at: expiresAt,
        created_at: new Date()
      });

      // Send 2FA email
      try {
        await emailService.send2FACodeEmail(email.toLowerCase(), code);
        console.log(`2FA code sent to ${email.toLowerCase()}`);
      } catch (emailError) {
        console.error('Failed to send 2FA email:', emailError);
        // Don't fail registration if email fails
      }

      // Send a welcome email immediately after successful signup
      try {
        await emailService.sendWelcomeEmail(email.toLowerCase(), firstName || 'User');
        console.log(`Welcome email sent to ${email.toLowerCase()}`);
      } catch (welcomeError) {
        console.error('Failed to send welcome email after signup:', welcomeError);
        // Continue without failing the registration flow
      }

      const responseMessage = role === 'teacher' 
        ? 'Teacher account created successfully! Please check your email for the verification code.'
        : 'Account created successfully! Please check your email for the verification code.';

      res.status(201).json({
        success: true,
        requires2FA: true,
        message: responseMessage,
        data: {
          userId: userId,
          email: email.toLowerCase()
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration'
      });
    }
  },

  async login(req, res) {
    const activityLogService = require('../services/activityLogService');
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    try {
      const { email, password } = req.body;

      console.log('Login attempt for:', email);

      // Validate required fields
      if (!email || !password) {
        await activityLogService.logActivity({
          activityType: 'failed_login',
          ipAddress,
          userAgent,
          success: false,
          failureReason: 'Missing email or password'
        });

        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      await ensure2FAColumn();

      const selectFields = [
        'id',
        'first_name',
        'last_name',
        'email',
        'password_hash',
        'role',
        'chapter_id',
        'is_active',
        'profile_picture'
      ];

      if (has2FAColumn) {
        selectFields.push('is_2fa_enabled');
      }

      // Find user (include profile_picture)
      const user = await db('users')
        .where({ email: email.toLowerCase() })
        .select(selectFields)
        .first();

      if (!user) {
        console.log('User not found:', email);
        await activityLogService.logActivity({
          activityType: 'failed_login',
          ipAddress,
          userAgent,
          success: false,
          failureReason: 'User not found'
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // NOTE: Account lockout is disabled for now in production environments
      // where the lockout columns may not exist yet.

      // Check if user is active
      if (!user.is_active) {
        await activityLogService.logActivity({
          userId: user.id,
          activityType: 'failed_login',
          ipAddress,
          userAgent,
          success: false,
          failureReason: 'Account deactivated'
        });

        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact administrator.'
        });
      }

      // Check if user has a password (not a Google-only account)
      if (!user.password_hash) {
        await activityLogService.logActivity({
          userId: user.id,
          activityType: 'failed_login',
          ipAddress,
          userAgent,
          success: false,
          failureReason: 'Google account - no password login'
        });

        return res.status(401).json({
          success: false,
          message: 'This account was created with Google. To sign in with a password, please use the "Forgot Password" link to set one.',
          code: 'GOOGLE_ACCOUNT_NO_PASSWORD'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        // Simplified failed-login handling: log the attempt, but no DB lockout logic
        await activityLogService.logActivity({
          userId: user.id,
          activityType: 'failed_login',
          ipAddress,
          userAgent,
          success: false,
          failureReason: 'Invalid password'
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check for 2FA
      const is2FAEnabled = has2FAColumn && user.is_2fa_enabled;
      console.log(`[DEBUG] Checking 2FA for user ${user.id}: ${is2FAEnabled}`);
      
      // Remember-device: if cookie is valid, skip 2FA prompt
      if (is2FAEnabled) {
        const rememberCookie = getCookie(req, 'remember_device');
        if (rememberCookie) {
          try {
            const decoded = jwt.verify(rememberCookie, authConfig.jwtSecret);
            if (decoded.userId === user.id) {
              console.log('[DEBUG] Remember device token valid; skipping 2FA.');
              
              await db('users')
                .where({ id: user.id })
                .update({ last_login_at: new Date() });

              try {
                await activityLogService.logActivity({
                  userId: user.id,
                  activityType: 'login',
                  ipAddress,
                  userAgent,
                  success: true
                });
              } catch (logError) {
                console.error('Failed to log login activity (non-critical):', logError.message);
              }

              const token = jwt.sign(
                { 
                  userId: user.id, 
                  email: user.email, 
                  role: user.role,
                  firstName: user.first_name,
                  lastName: user.last_name,
                  chapter: user.chapter_id
                },
                authConfig.jwtSecret,
                { expiresIn: authConfig.jwtExpiresIn }
              );

              return res.json({
                success: true,
                message: 'Login successful',
                data: {
                  user: {
                    id: user.id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    role: user.role,
                    chapter: user.chapter_id,
                    isActive: user.is_active,
                    profilePicture: getProfilePictureUrl(user.profile_picture)
                  },
                  token
                }
              });
            }
          } catch (rememberErr) {
            console.warn('Remember device token invalid or expired, ignoring cookie:', rememberErr.message);
          }
        }
      }
      
      if (is2FAEnabled) {
        console.log('[DEBUG] 2FA is enabled, generating code...');
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store code in two_factor_codes table
        await db('two_factor_codes').insert({
          user_id: user.id,
          code: codeHash,
          expires_at: expiresAt,
          created_at: new Date()
        });

        // Send 2FA email
        try {
          await emailService.send2FACodeEmail(user.email, code);
        } catch (emailError) {
          console.error('Failed to send 2FA email:', emailError);
          return res.status(500).json({
            success: false,
            message: 'Failed to send verification code'
          });
        }

        return res.json({
          success: true,
          requires2FA: true,
          message: 'Verification code sent to your email',
          data: {
            userId: user.id,
            email: user.email
          }
        });
      }
      
      console.log('[DEBUG] 2FA check passed (not enabled), generating token...');

      // Successful login - update last login
      await db('users')
        .where({ id: user.id })
        .update({
          last_login_at: new Date()
        });

      // Log successful login (REQUIREMENT: Login history)
      try {
        await activityLogService.logActivity({
          userId: user.id,
          activityType: 'login',
          ipAddress,
          userAgent,
          success: true
        });
      } catch (logError) {
        console.error('Failed to log login activity (non-critical):', logError.message);
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          chapter: user.chapter_id
        },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      console.log('Login successful for:', email, 'Role:', user.role);

      // Set remember-device cookie to skip 2FA on this device for 30 days
      if (is2FAEnabled) {
        const rememberToken = jwt.sign(
          { userId: user.id },
          authConfig.jwtSecret,
          { expiresIn: '30d' }
        );
        res.cookie('remember_device', rememberToken, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          path: '/'
        });
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active,
            profilePicture: getProfilePictureUrl(user.profile_picture)
          },
          token
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      
      // Log the full error stack for debugging
      console.error(error.stack);

      try {
        await activityLogService.logActivity({
          activityType: 'failed_login',
          ipAddress,
          userAgent,
          success: false,
          failureReason: 'Internal server error: ' + error.message
        });
      } catch (logError) {
        console.error('Failed to log activity during login error:', logError);
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error during login',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Logout (REQUIREMENT: Activity logs)
  async verify2FA(req, res) {
    const activityLogService = require('../services/activityLogService');
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    try {
      const { userId, code } = req.body;

      if (!userId || !code) {
        return res.status(400).json({
          success: false,
          message: 'User ID and code are required'
        });
      }

      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      // Find valid verification code
      const verificationRecord = await db('two_factor_codes')
        .where({
          user_id: userId,
          code: codeHash
        })
        .where('expires_at', '>', new Date())
        .orderBy('created_at', 'desc')
        .first();

      if (!verificationRecord) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code'
        });
      }

      // Delete used code (or mark as used if we had a used column, but deleting is fine for OTP)
      await db('two_factor_codes')
        .where({ id: verificationRecord.id })
        .del();

      // Get user details
      const user = await db('users')
        .where({ id: userId })
        .select(
          'id',
          'first_name',
          'last_name',
          'email',
          'role',
          'chapter_id',
          'is_active',
          'profile_picture'
        )
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Successful login - update last login
      await db('users')
        .where({ id: user.id })
        .update({
          last_login_at: new Date()
        });

      // Log successful login
      await activityLogService.logActivity({
        userId: user.id,
        activityType: 'login_2fa',
        ipAddress,
        userAgent,
        success: true
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          chapter: user.chapter_id
        },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      // Set remember-device cookie after successful 2FA (30 days)
      const rememberToken = jwt.sign(
        { userId: user.id },
        authConfig.jwtSecret,
        { expiresIn: '30d' }
      );
      res.cookie('remember_device', rememberToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/'
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active,
            profilePicture: getProfilePictureUrl(user.profile_picture)
          },
          token
        }
      });

    } catch (error) {
      console.error('2FA verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during verification'
      });
    }
  },

  async logout(req, res) {
    const activityLogService = require('../services/activityLogService');
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    try {
      const userId = req.user?.userId;

      if (userId) {
        // Log logout activity (REQUIREMENT: Login history)
        await activityLogService.logActivity({
          userId,
          activityType: 'logout',
          ipAddress,
          userAgent,
          success: true
        });
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during logout'
      });
    }
  },

  // Get user activity logs (REQUIREMENT: Login history)
  async getActivityLogs(req, res) {
    const activityLogService = require('../services/activityLogService');
    
    try {
      const userId = req.user.userId;
      const { limit = 50, offset = 0, activityType = null } = req.query;

      const logs = await activityLogService.getUserActivityHistory(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        activityType: activityType || null
      });

      res.json({
        success: true,
        data: { logs }
      });
    } catch (error) {
      console.error('Get activity logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity logs'
      });
    }
  },

  // Get abnormal activity alerts (REQUIREMENT: Abnormal activity alerts)
  async getAbnormalActivityAlerts(req, res) {
    const activityLogService = require('../services/activityLogService');
    
    try {
      const userId = req.user.userId;
      const alerts = await activityLogService.getUserAlerts(userId);

      res.json({
        success: true,
        data: { alerts }
      });
    } catch (error) {
      console.error('Get alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch alerts'
      });
    }
  },

  // Google OAuth login
  async googleLogin(req, res) {
    try {
      const { googleId, email, firstName, lastName, profilePicture } = req.body;

      // Validate required fields
      if (!googleId || !email || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Google ID, email, first name, and last name are required'
        });
      }

      // Check if user exists with this Google ID
      let user = await db('users')
        .where({ google_id: googleId })
        .first();

      // If user doesn't exist with Google ID, check if they exist with email
      if (!user) {
        user = await db('users')
          .where({ email: email.toLowerCase() })
          .first();
        
        // If user exists with email but not Google ID, update their Google ID
        if (user) {
          await db('users')
            .where({ id: user.id })
            .update({ google_id: googleId, updated_at: new Date() });
        }
      }

      let token;
      
      // If user doesn't exist at all, create a new user
      if (!user) {
        const userData = {
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
          google_id: googleId,
          profile_picture: profilePicture,
          role: 'user', // Default role for Google signups (generic member)
          chapter_id: null, // Force chapter selection on first login
          is_active: true,
          is_2fa_enabled: true, // Enable 2FA for new Google users
          created_at: new Date(),
          updated_at: new Date()
        };

        // Insert new user
        const result = await db('users').insert(userData).returning('id');
        const userId = result[0].id;

        // Get the created user
        user = await db('users')
          .where({ id: userId })
          .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture', 'is_2fa_enabled')
          .first();
      } else {
        // Update last login and profile picture if it exists
        await db('users')
          .where({ id: user.id })
          .update({ 
            last_login_at: new Date(),
            profile_picture: profilePicture || user.profile_picture,
            updated_at: new Date()
          });
        
        // Refresh user data
        user = await db('users')
          .where({ id: user.id })
          .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture', 'is_2fa_enabled')
          .first();
      }

      // Check for 2FA
      if (user.is_2fa_enabled) {
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store code in two_factor_codes table
        await db('two_factor_codes').insert({
          user_id: user.id,
          code: codeHash,
          expires_at: expiresAt,
          created_at: new Date()
        });

        // Send 2FA email
        try {
          await emailService.send2FACodeEmail(user.email, code);
        } catch (emailError) {
          console.error('Failed to send 2FA email:', emailError);
          return res.status(500).json({
            success: false,
            message: 'Failed to send verification code'
          });
        }

        return res.json({
          success: true,
          requires2FA: true,
          message: 'Verification code sent to your email',
          data: {
            userId: user.id,
            email: user.email
          }
        });
      }

      // Log successful SSO login (REQUIREMENT: Login history)
      const activityLogService = require('../services/activityLogService');
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';
      
      await activityLogService.logActivity({
        userId: user.id,
        activityType: 'login',
        ipAddress,
        userAgent,
        success: true,
        metadata: { loginMethod: 'google_oauth' }
      });

      // Generate JWT token
      token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          chapter: user.chapter_id
        },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      console.log('Google login successful for:', email);

      res.json({
        success: true,
        message: 'Google login successful',
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active,
            profilePicture: getProfilePictureUrl(user.profile_picture)
          },
          token
        }
      });

    } catch (error) {
      console.error('Google login error:', error);
      
      // Log failed SSO login attempt
      const activityLogService = require('../services/activityLogService');
      await activityLogService.logActivity({
        activityType: 'failed_login',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        success: false,
        failureReason: 'Google login error: ' + error.message,
        metadata: { loginMethod: 'google_oauth' }
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error during Google login'
      });
    }
  },

  async getCurrentUser(req, res) {
    try {
      let user;

      try {
        // Prefer extended profile fields when the schema supports them
        user = await db('users')
          .where({ id: req.user.userId })
          .select(
            'id',
            'first_name',
            'last_name',
            'email',
            'role',
            'chapter_id',
            'is_active',
            'last_login_at',
            'profile_picture',
            // NOTE: The initial schema uses `phone_number`; alias it to `phone` for the API
            db.raw('COALESCE(phone_number, \'\') as phone'),
            db.raw('COALESCE(bio, \'\') as bio'),
            db.raw('COALESCE(location, \'\') as location'),
            db.raw('COALESCE(specialties, NULL) as specialties'),
            db.raw('COALESCE(teaching_experience, \'0\') as teaching_experience'),
            db.raw('COALESCE(education, \'\') as education'),
            db.raw('COALESCE(interests, NULL) as interests'),
            db.raw('COALESCE(learning_goals, \'\') as learning_goals'),
            db.raw('COALESCE(learning_goals, \'\') as learning_goals'),
            db.raw('COALESCE(date_of_birth, NULL) as date_of_birth'),
            db.raw('COALESCE(is_public, true) as is_public'),
            db.raw('COALESCE(notification_preferences, \'{}\') as notification_preferences'),
            'created_at',
            'is_2fa_enabled'
          )
          .first();
      } catch (error) {
        // Handle missing optional columns (location, specialties, etc.) gracefully
        if (error.code === '42703') {
          console.warn(
            'Optional user profile columns are missing in the database; falling back to basic user fields'
          );

          user = await db('users')
            .where({ id: req.user.userId })
            .select(
              'id',
              'first_name',
              'last_name',
              'email',
              'role',
              'chapter_id',
              'is_active',
              'last_login_at',
              'profile_picture',
              'created_at',
              'is_2fa_enabled'
            )
            .first();

          // Provide default values so the rest of the method can safely access these properties
          user.phone = '';
          user.bio = '';
          user.location = '';
          user.specialties = null;
          user.teaching_experience = 0;
          user.education = '';
          user.interests = null;
          user.learning_goals = '';
          user.date_of_birth = null;
          user.is_public = true;
          user.notification_preferences = {};
        } else {
          throw error;
        }
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Parse specialties safely
      let specialties = [];
      if (user.specialties) {
        if (typeof user.specialties === 'object') {
          specialties = Array.isArray(user.specialties) ? user.specialties : [];
        } else if (typeof user.specialties === 'string' && user.specialties.trim()) {
          try {
            specialties = JSON.parse(user.specialties);
          } catch (e) {
            console.warn('Failed to parse specialties JSON:', e.message);
            specialties = [];
          }
        }
      }

      // Parse interests safely (for students)
      let interests = [];
      if (user.interests) {
        if (typeof user.interests === 'object') {
          interests = Array.isArray(user.interests) ? user.interests : [];
        } else if (typeof user.interests === 'string' && user.interests.trim()) {
          try {
            interests = JSON.parse(user.interests);
          } catch (e) {
            console.warn('Failed to parse interests JSON:', e.message);
            interests = [];
          }
        }
      }

      // Check profile completion
      let profileCompletion;
      try {
        // Use the controller helper directly; don't rely on `this` binding
        profileCompletion = authController.calculateProfileCompletion(user);
      } catch (error) {
        console.error('Error calculating profile completion:', error);
        // Set default completion if calculation fails
        profileCompletion = {
          percentage: 0,
          completedFields: 0,
          totalFields: 4,
          isComplete: false,
          missingFields: []
        };
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active,
            lastLoginAt: user.last_login_at,
            profilePicture: getProfilePictureUrl(user.profile_picture),
            bio: user.bio || '',
            phone: user.phone || '',
            location: user.location || '',
            specialties: specialties,
            teachingExperience: user.teaching_experience || 0,
            education: user.education || '',
            interests: interests,
            learningGoals: user.learning_goals || '',
            dateOfBirth: user.date_of_birth || null,
            profileCompletion: profileCompletion,
            is2FAEnabled: !!user.is_2fa_enabled
          }
        }
      });

    } catch (error) {
      console.error('Get user error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Calculate profile completion percentage
  calculateProfileCompletion(user) {
    try {
      const fields = {
        profilePicture: user.profile_picture ? 1 : 0,
        bio: user.bio && typeof user.bio === 'string' && user.bio.trim() ? 1 : 0,
        phone: user.phone && typeof user.phone === 'string' && user.phone.trim() ? 1 : 0,
        location: user.location && typeof user.location === 'string' && user.location.trim() ? 1 : 0
      };

      // For teachers, also check teaching-specific fields
      if (user.role === 'teacher') {
        // Handle specialties - can be array, string, or null
        let hasSpecialties = false;
        if (user.specialties) {
          if (Array.isArray(user.specialties)) {
            hasSpecialties = user.specialties.length > 0;
          } else if (typeof user.specialties === 'string') {
            try {
              const parsed = JSON.parse(user.specialties);
              hasSpecialties = Array.isArray(parsed) ? parsed.length > 0 : parsed.trim().length > 0;
            } catch (e) {
              hasSpecialties = user.specialties.trim().length > 0;
            }
          }
        }
        fields.specialties = hasSpecialties ? 1 : 0;
        fields.education = user.education && typeof user.education === 'string' && user.education.trim() ? 1 : 0;
      }

      const totalFields = Object.keys(fields).length;
      const completedFields = Object.values(fields).reduce((sum, val) => sum + val, 0);
      const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

      return {
        percentage,
        completedFields,
        totalFields,
        isComplete: percentage >= 80, // Consider 80%+ as complete
        missingFields: Object.entries(fields)
          .filter(([_, completed]) => !completed)
          .map(([field, _]) => field)
      };
    } catch (error) {
      console.error('Error calculating profile completion:', error);
      // Return default completion if calculation fails
      return {
        percentage: 0,
        completedFields: 0,
        totalFields: 4,
        isComplete: false,
        missingFields: ['profilePicture', 'bio', 'phone', 'location']
      };
    }
  },

  async getUserPermissions(req, res) {
    try {
      const userId = req.user.userId;
      
      const user = await db('users')
        .where({ id: userId })
        .select('role')
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Fetch permissions from database based on role
      let permissions = [];
      
      // Admins have system:admin which grants all permissions
      if (user.role === 'admin') {
        // For admins, fetch all permissions
        const allPermissions = await db('user_permissions')
          .select('permission_key');
        permissions = allPermissions.map(p => p.permission_key);
      } else {
        // For other roles, fetch role-specific permissions
        const userPermissions = await db('role_permissions as rp')
          .join('user_permissions as up', 'rp.permission_id', 'up.id')
          .where('rp.role', user.role)
          .select('up.permission_key');
        
        permissions = userPermissions.map(p => p.permission_key);
      }

      res.json({
        success: true,
        data: {
          permissions,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Get user permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user permissions'
      });
    }
  },

  // Upload profile image
  async uploadProfileImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Upload to GCS
      // This works on Cloud Run because we use memoryStorage in routes/auth.js
      // and the GCS service uses the default service account credentials
      const publicUrl = await gcsService.uploadFile(req.file, 'profiles');

      // Update user's profile picture in database (store full URL)
      await db('users')
        .where({ id: req.user.userId })
        .update({ 
          profile_picture: publicUrl, 
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          profilePicture: publicUrl
        }
      });
    } catch (error) {
      console.error('Profile picture upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile picture'
      });
    }
  },

  // Update user profile
  async updateUserProfile(req, res) {
    try {
      const { firstName, lastName, bio, phone, location, profilePicture, specialties, teachingExperience, education, interests, learningGoals, dateOfBirth, role, chapterId, bankName, accountNumber, routingNumber, idDocumentUrl, isPublic, notificationPreferences, profileVisibility, linksPublicDefault, allowLinkedProfiles, shareLocation, preferredPublicLocation, timeZone, socialLinks, recentMedia, linkedAccounts, locationConsent, latitude, longitude, address, city, state, country, zipCode } = req.body;
      const userId = req.user.userId;

      // Extract relative path from profilePicture if it's a full URL
      let profilePicturePath = profilePicture;
      if (profilePicture && profilePicture.startsWith('http')) {
        // Extract the path after the base URL
        const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
        if (profilePicture.startsWith(baseUrl)) {
          profilePicturePath = profilePicture.replace(baseUrl, '');
        } else {
          // If it's a different URL (e.g., Google profile picture), keep it as is
          profilePicturePath = profilePicture;
        }
      }

      // Update user profile in database
      // For JSON columns, Knex handles conversion automatically - pass arrays/objects directly
      const updateData = {
        first_name: firstName,
        last_name: lastName,
        bio: bio || null,
        // Align with initial schema column name `phone_number`
        phone_number: phone || null,
        location: location || null,
        profile_picture: profilePicturePath || null,
        specialties: Array.isArray(specialties) ? JSON.stringify(specialties) : '[]',
        teaching_experience: teachingExperience || null,
        education: education || null,
        interests: Array.isArray(interests) ? JSON.stringify(interests) : '[]',
        learning_goals: learningGoals && String(learningGoals).trim() ? learningGoals : null,
        date_of_birth: dateOfBirth && String(dateOfBirth).trim() ? dateOfBirth : null,
        is_public: typeof isPublic === 'boolean' ? isPublic : undefined,
        notification_preferences: notificationPreferences ? JSON.stringify(notificationPreferences) : undefined,
        profile_visibility: profileVisibility || undefined,
        links_public_default: typeof linksPublicDefault === 'boolean' ? linksPublicDefault : undefined,
        allow_linked_profiles: typeof allowLinkedProfiles === 'boolean' ? allowLinkedProfiles : undefined,
        share_location: typeof shareLocation === 'boolean' ? shareLocation : undefined,
        preferred_public_location: preferredPublicLocation || undefined,
        time_zone: timeZone || undefined,
        social_links: Array.isArray(socialLinks) ? JSON.stringify(socialLinks) : undefined,
        recent_media: Array.isArray(recentMedia) ? JSON.stringify(recentMedia) : undefined,
        linked_accounts: Array.isArray(linkedAccounts) ? JSON.stringify(linkedAccounts) : undefined,
        location_consent: typeof locationConsent === 'boolean' ? locationConsent : undefined,
        latitude: latitude !== undefined ? latitude : undefined,
        longitude: longitude !== undefined ? longitude : undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        country: country || undefined,
        zip_code: zipCode || undefined,
        updated_at: new Date()
      };

      // Allow updating role and chapter if provided (e.g. during onboarding)
      if (role) updateData.role = role;
      if (chapterId) updateData.chapter_id = chapterId;
      
      // Allow updating 2FA status
      if (req.body.is2FAEnabled !== undefined) {
        updateData.is_2fa_enabled = req.body.is2FAEnabled;
      }

      // Remove undefined values to avoid issues
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      console.log('Updating user profile:', { userId, updateData });
      
      await db('users')
        .where({ id: userId })
        .update(updateData);

      // Handle Teacher Profile Data
      const targetRole = role || req.user.role;
      if (targetRole === 'teacher') {
          const teacherData = {
              bank_name: bankName,
              account_number: accountNumber,
              routing_number: routingNumber,
              id_document_url: idDocumentUrl,
              updated_at: new Date()
          };

          // Remove undefined
          Object.keys(teacherData).forEach(key => teacherData[key] === undefined && delete teacherData[key]);

          // Check if teacher profile exists
          const existingProfile = await db('teacher_profiles').where({ user_id: userId }).first();
          
          if (existingProfile) {
              await db('teacher_profiles').where({ user_id: userId }).update(teacherData);
          } else {
              // Only insert if we have some data
              if (bankName || accountNumber || routingNumber || idDocumentUrl) {
                  await db('teacher_profiles').insert({
                      user_id: userId,
                      ...teacherData,
                      created_at: new Date()
                  });
              }
          }
      }

      console.log('Profile update successful, fetching updated user...');

      // Get updated user data
      const user = await db('users')
        .where({ id: userId })
        .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'last_login_at', 'profile_picture', 'bio', 'phone_number as phone', 'location', 'specialties', 'teaching_experience', 'education', 'interests', 'learning_goals', 'date_of_birth', 'is_public', 'notification_preferences', 'is_2fa_enabled', 'profile_visibility', 'links_public_default', 'allow_linked_profiles', 'share_location', 'preferred_public_location', 'time_zone', 'social_links', 'recent_media', 'linked_accounts', 'location_consent', 'latitude', 'longitude', 'address', 'city', 'state', 'country', 'zip_code')
        .first();

      if (!user) {
        throw new Error('User not found after update');
      }

      console.log('User data fetched successfully');

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active,
            lastLoginAt: user.last_login_at,
            profilePicture: getProfilePictureUrl(user.profile_picture),
            bio: user.bio,
            phone: user.phone,
            location: user.location,
            specialties: (() => {
              if (!user.specialties) return [];
              // If it's already an object/array (PostgreSQL JSON returns as object)
              if (typeof user.specialties === 'object') {
                return Array.isArray(user.specialties) ? user.specialties : [];
              }
              // If it's a string, try to parse it
              if (typeof user.specialties === 'string' && user.specialties.trim()) {
                try {
                  return JSON.parse(user.specialties);
                } catch (e) {
                  return [];
                }
              }
              return [];
            })(),
            interests: (() => {
              if (!user.interests) return [];
              // If it's already an object/array (PostgreSQL JSON returns as object)
              if (typeof user.interests === 'object') {
                return Array.isArray(user.interests) ? user.interests : [];
              }
              // If it's a string, try to parse it
              if (typeof user.interests === 'string' && user.interests.trim()) {
                try {
                  return JSON.parse(user.interests);
                } catch (e) {
                  console.warn('Failed to parse interests JSON:', e.message);
                  return [];
                }
              }
              return [];
            })(),
            learningGoals: user.learning_goals,
            dateOfBirth: user.date_of_birth,
            teachingExperience: user.teaching_experience,
            education: user.education,
            isPublic: user.is_public !== false,
            notificationPreferences: (() => {
              if (!user.notification_preferences) return {};
              if (typeof user.notification_preferences === 'object') return user.notification_preferences;
              if (typeof user.notification_preferences === 'string') {
                try { return JSON.parse(user.notification_preferences); } catch (e) { return {}; }
              }
              return {};
            })(),
            profileVisibility: user.profile_visibility || 'public',
            linksPublicDefault: user.links_public_default !== false,
            allowLinkedProfiles: user.allow_linked_profiles !== false,
            shareLocation: !!user.share_location,
            preferredPublicLocation: user.preferred_public_location || '',
            timeZone: user.time_zone || '',
            socialLinks: (() => {
              if (!user.social_links) return [];
              if (typeof user.social_links === 'object') return Array.isArray(user.social_links) ? user.social_links : [];
              if (typeof user.social_links === 'string' && user.social_links.trim()) {
                try { return JSON.parse(user.social_links); } catch (e) { return []; }
              }
              return [];
            })(),
            recentMedia: (() => {
              if (!user.recent_media) return [];
              if (typeof user.recent_media === 'object') return Array.isArray(user.recent_media) ? user.recent_media : [];
              if (typeof user.recent_media === 'string' && user.recent_media.trim()) {
                try { return JSON.parse(user.recent_media); } catch (e) { return []; }
              }
              return [];
            })(),
            linkedAccounts: (() => {
              if (!user.linked_accounts) return [];
              if (typeof user.linked_accounts === 'object') return Array.isArray(user.linked_accounts) ? user.linked_accounts : [];
              if (typeof user.linked_accounts === 'string' && user.linked_accounts.trim()) {
                try { return JSON.parse(user.linked_accounts); } catch (e) { return []; }
              }
              return [];
            })(),
            locationConsent: !!user.location_consent,
            latitude: user.latitude,
            longitude: user.longitude,
            address: user.address || '',
            city: user.city || '',
            state: user.state || '',
            country: user.country || '',
            zipCode: user.zip_code || '',
            is2FAEnabled: user.is_2fa_enabled
          }
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        hint: error.hint,
        position: error.position
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          detail: error.detail,
          constraint: error.constraint
        } : undefined
      });
    }
  },

  // Facebook OAuth login (REQUIREMENT: Facebook)
  async facebookLogin(req, res) {
    const activityLogService = require('../services/activityLogService');
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    try {
      const { facebookId, email, firstName, lastName, profilePicture } = req.body;

      // Validate required fields
      if (!facebookId || !email || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Facebook ID, email, first name, and last name are required'
        });
      }

      // Check if user exists with this Facebook ID via user_sso_accounts
      const ssoAccount = await db('user_sso_accounts as usa')
        .join('sso_providers as sp', 'usa.provider_id', 'sp.id')
        .where('sp.provider_name', 'facebook')
        .where('usa.provider_user_id', facebookId)
        .select('usa.user_id')
        .first();

      let user = null;
      if (ssoAccount) {
        user = await db('users')
          .where({ id: ssoAccount.user_id })
          .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture')
          .first();
      }

      // If user doesn't exist with Facebook ID, check if they exist with email
      if (!user) {
        user = await db('users')
          .where({ email: email.toLowerCase() })
          .first();
      }

      let token;
      
      // If user doesn't exist at all, create a new user
      if (!user) {
        // Get default chapter (first active chapter) for new users
        const defaultChapter = await db('chapters')
          .where({ is_active: true })
          .orderBy('id', 'asc')
          .first();

        if (!defaultChapter) {
          return res.status(500).json({
            success: false,
            message: 'No active chapters found. Please contact administrator.'
          });
        }

        const userData = {
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
          profile_picture: profilePicture,
          role: 'user', // Default role for Facebook signups (generic member)
          chapter_id: defaultChapter.id,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        };

        // Insert new user
        const result = await db('users').insert(userData).returning('id');
        const userId = result[0].id || result[0];

        // Link Facebook account
        const facebookProvider = await db('sso_providers')
          .where('provider_name', 'facebook')
          .first();

        if (facebookProvider) {
          await db('user_sso_accounts').insert({
            user_id: userId,
            provider_id: facebookProvider.id,
            provider_user_id: facebookId,
            email: email.toLowerCase(),
            profile_picture: profilePicture,
            last_used_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
          });
        }

        // Get the created user
        user = await db('users')
          .where({ id: userId })
          .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture')
          .first();
      } else {
        // Update last login and profile picture
        await db('users')
          .where({ id: user.id })
          .update({ 
            last_login_at: new Date(),
            profile_picture: profilePicture || user.profile_picture,
            updated_at: new Date()
          });
        
        // Update or create SSO account link
        const facebookProvider = await db('sso_providers')
          .where('provider_name', 'facebook')
          .first();

        if (facebookProvider) {
          const existingSso = await db('user_sso_accounts')
            .where('user_id', user.id)
            .where('provider_id', facebookProvider.id)
            .first();

          if (existingSso) {
            await db('user_sso_accounts')
              .where('id', existingSso.id)
              .update({
                last_used_at: new Date(),
                profile_picture: profilePicture,
                updated_at: new Date()
              });
          } else {
            await db('user_sso_accounts').insert({
              user_id: user.id,
              provider_id: facebookProvider.id,
              provider_user_id: facebookId,
              email: email.toLowerCase(),
              profile_picture: profilePicture,
              last_used_at: new Date(),
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        }
        
        // Refresh user data
        user = await db('users')
          .where({ id: user.id })
          .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture')
          .first();
      }

      // Log successful SSO login (REQUIREMENT: Login history)
      await activityLogService.logActivity({
        userId: user.id,
        activityType: 'login',
        ipAddress,
        userAgent,
        success: true,
        metadata: { loginMethod: 'facebook_oauth' }
      });

      // Generate JWT token
      token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          chapter: user.chapter_id
        },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      res.json({
        success: true,
        message: 'Facebook login successful',
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active,
            profilePicture: getProfilePictureUrl(user.profile_picture)
          },
          token
        }
      });

    } catch (error) {
      console.error('Facebook login error:', error);
      
      await activityLogService.logActivity({
        activityType: 'failed_login',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        success: false,
        failureReason: 'Facebook login error: ' + error.message
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error during Facebook login'
      });
    }
  },

  // Facebook OAuth callback - exchange authorization code for user data
  async facebookCallback(req, res) {
    try {
      const { code, redirectUri } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Authorization code is required'
        });
      }

      const clientId = process.env.FACEBOOK_APP_ID;
      const clientSecret = process.env.FACEBOOK_APP_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(500).json({
          success: false,
          message: 'Facebook OAuth not configured on server'
        });
      }

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/facebook/callback`,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokenData);
        return res.status(400).json({
          success: false,
          message: 'Failed to exchange authorization code'
        });
      }

      const { access_token } = tokenData;

      // Get user info from Facebook
      const userResponse = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email,first_name,last_name,picture&access_token=${access_token}`);

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        console.error('User info fetch failed:', userData);
        return res.status(400).json({
          success: false,
          message: 'Failed to get user information from Facebook'
        });
      }

      // Prepare data for our login flow
      const facebookData = {
        facebookId: userData.id,
        email: userData.email,
        firstName: userData.first_name || userData.name?.split(' ')[0] || '',
        lastName: userData.last_name || userData.name?.split(' ').slice(1).join(' ') || '',
        profilePicture: userData.picture?.data?.url || null
      };

      // Process Facebook login using the existing facebookLogin method
      // We'll call it directly with the processed data
      const activityLogService = require('../services/activityLogService');
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';

      try {
        // Check if user exists with this Facebook ID via user_sso_accounts
        const ssoAccount = await db('user_sso_accounts as usa')
          .join('sso_providers as sp', 'usa.provider_id', 'sp.id')
          .where('sp.provider_name', 'facebook')
          .where('usa.provider_user_id', facebookData.facebookId)
          .select('usa.user_id')
          .first();

        let user = null;
        if (ssoAccount) {
          user = await db('users')
            .where({ id: ssoAccount.user_id })
            .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture')
            .first();
        }

        // If user doesn't exist with Facebook ID, check if they exist with email
        if (!user) {
          user = await db('users')
            .where({ email: facebookData.email.toLowerCase() })
            .first();
        }

        let token;
        
        // If user doesn't exist at all, create a new user
        if (!user) {
          // Get default chapter (first active chapter) for new users
          const defaultChapter = await db('chapters')
            .where({ is_active: true })
            .orderBy('id', 'asc')
            .first();

          if (!defaultChapter) {
            return res.status(500).json({
              success: false,
              message: 'No active chapters found. Please contact administrator.'
            });
          }

          const userData = {
            first_name: facebookData.firstName,
            last_name: facebookData.lastName,
            email: facebookData.email.toLowerCase(),
            profile_picture: facebookData.profilePicture,
            role: 'user',
            chapter_id: defaultChapter.id,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          };

          // Insert new user
          const result = await db('users').insert(userData).returning('id');
          const userId = result[0].id || result[0];

          // Link Facebook account
          const facebookProvider = await db('sso_providers')
            .where('provider_name', 'facebook')
            .first();

          if (facebookProvider) {
            await db('user_sso_accounts').insert({
              user_id: userId,
              provider_id: facebookProvider.id,
              provider_user_id: facebookData.facebookId,
              email: facebookData.email.toLowerCase(),
              profile_picture: facebookData.profilePicture,
              last_used_at: new Date(),
              created_at: new Date(),
              updated_at: new Date()
            });
          }

          // Get the created user
          user = await db('users')
            .where({ id: userId })
            .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture')
            .first();
        } else {
          // Update last login and profile picture
          await db('users')
            .where({ id: user.id })
            .update({ 
              last_login_at: new Date(),
              profile_picture: facebookData.profilePicture || user.profile_picture,
              updated_at: new Date()
            });
          
          // Update or create SSO account link
          const facebookProvider = await db('sso_providers')
            .where('provider_name', 'facebook')
            .first();

          if (facebookProvider) {
            const existingSso = await db('user_sso_accounts')
              .where('user_id', user.id)
              .where('provider_id', facebookProvider.id)
              .first();

            if (existingSso) {
              await db('user_sso_accounts')
                .where('id', existingSso.id)
                .update({
                  last_used_at: new Date(),
                  profile_picture: facebookData.profilePicture,
                  updated_at: new Date()
                });
            } else {
              await db('user_sso_accounts').insert({
                user_id: user.id,
                provider_id: facebookProvider.id,
                provider_user_id: facebookData.facebookId,
                email: facebookData.email.toLowerCase(),
                profile_picture: facebookData.profilePicture,
                last_used_at: new Date(),
                created_at: new Date(),
                updated_at: new Date()
              });
            }
          }
          
          // Refresh user data
          user = await db('users')
            .where({ id: user.id })
            .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture')
            .first();
        }

        // Log successful SSO login
        await activityLogService.logActivity({
          userId: user.id,
          activityType: 'login',
          ipAddress,
          userAgent,
          success: true,
          metadata: { loginMethod: 'facebook_oauth' }
        });

        // Generate JWT token
        token = jwt.sign(
          { 
            userId: user.id, 
            email: user.email, 
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
            chapter: user.chapter_id
          },
          authConfig.jwtSecret,
          { expiresIn: authConfig.jwtExpiresIn }
        );

        console.log('Facebook OAuth login successful for:', facebookData.email);

        return res.json({
          success: true,
          message: 'Facebook login successful',
          data: {
            user: {
              id: user.id,
              firstName: user.first_name,
              lastName: user.last_name,
              email: user.email,
              role: user.role,
              chapter: user.chapter_id,
              isActive: user.is_active,
              profilePicture: getProfilePictureUrl(user.profile_picture)
            },
            token
          }
        });

      } catch (loginError) {
        console.error('Facebook login processing error:', loginError);
        
        await activityLogService.logActivity({
          activityType: 'failed_login',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          success: false,
          failureReason: 'Facebook login processing error: ' + loginError.message,
          metadata: { loginMethod: 'facebook_oauth' }
        });

        return res.status(500).json({
          success: false,
          message: 'Internal server error during Facebook login processing'
        });
      }

    } catch (error) {
      console.error('Facebook callback error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during Facebook authentication'
      });
    }
  },

  // Forgot Password - Request password reset
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Validate required fields
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format'
        });
      }

      // Check if user exists
      const user = await db('users')
        .where({ email: email.toLowerCase() })
        .select('id', 'first_name', 'last_name', 'email', 'is_active')
        .first();

      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact administrator.'
        });
      }

      // Generate reset token (24 characters, URL-safe)
      const resetToken = crypto.randomBytes(18).toString('base64url');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store reset token in database
      await db('password_resets').insert({
        user_id: user.id,
        token_hash: resetTokenHash,
        expires_at: expiresAt,
        used: false,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Send email with reset link
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      try {
        await emailService.sendPasswordResetEmail(user.email, resetLink);
        console.log(`Password reset email sent successfully to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Continue with the process even if email fails - user can still use the token
        // In production, you might want to store this for retry or alert admins
      }

      // Log password reset request for security
      const activityLogService = require('../services/activityLogService');
      await activityLogService.logActivity({
        userId: user.id,
        activityType: 'password_reset_request',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        success: true,
        metadata: { email: user.email }
      });

      res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during password reset request'
      });
    }
  },

  // Verify Reset Token
  async verifyResetToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Reset token is required'
        });
      }

      // Hash the token to compare with stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find valid reset token
      const resetRecord = await db('password_resets')
        .where({
          token_hash: tokenHash,
          used: false
        })
        .where('expires_at', '>', new Date())
        .first();

      if (!resetRecord) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      res.json({
        success: true,
        message: 'Token is valid'
      });

    } catch (error) {
      console.error('Verify reset token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during token verification'
      });
    }
  },

  // Reset Password
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      // Validate required fields
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required'
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one uppercase and one lowercase letter'
        });
      }

      if (!/(?=.*\d)/.test(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one number'
        });
      }

      if (!/(?=.*[^A-Za-z0-9])/.test(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one special character'
        });
      }

      if (/\s/.test(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password cannot contain spaces'
        });
      }

      // Hash the token to find the reset record
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find valid reset token
      const resetRecord = await db('password_resets')
        .where({
          token_hash: tokenHash,
          used: false
        })
        .where('expires_at', '>', new Date())
        .first();

      if (!resetRecord) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Hash the new password
      const saltRounds = authConfig.bcryptRounds;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update user's password
      await db('users')
        .where({ id: resetRecord.user_id })
        .update({
          password_hash: passwordHash,
          updated_at: new Date()
        });

      // Mark reset token as used
      await db('password_resets')
        .where({ id: resetRecord.id })
        .update({
          used: true,
          updated_at: new Date()
        });

      // Log password reset
      const activityLogService = require('../services/activityLogService');
      await activityLogService.logActivity({
        userId: resetRecord.user_id,
        activityType: 'password_reset',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        success: true
      });

      res.json({
        success: true,
        message: 'Password has been reset successfully'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during password reset'
      });
    }
  },

  // Verify Email
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
      }

      // Hash the token to compare with stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find valid email verification token
      const verificationRecord = await db('email_verifications')
        .where({
          token_hash: tokenHash,
          used: false
        })
        .where('expires_at', '>', new Date())
        .first();

      if (!verificationRecord) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
      }

      // Check if user exists and is active
      const user = await db('users')
        .where({ id: verificationRecord.user_id })
        .select('id', 'email', 'is_active')
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Check if email is already verified
      const existingVerification = await db('email_verifications')
        .where({
          user_id: user.id,
          email: user.email,
          verified: true
        })
        .first();

      if (existingVerification) {
        // Mark this token as used to prevent reuse
        await db('email_verifications')
          .where({ id: verificationRecord.id })
          .update({
            used: true,
            updated_at: new Date()
          });

        return res.json({
          success: true,
          message: 'Email is already verified',
          data: { email: user.email }
        });
      }

      // Mark email as verified
      await db('email_verifications')
        .where({ id: verificationRecord.id })
        .update({
          verified: true,
          verified_at: new Date(),
          used: true,
          updated_at: new Date()
        });

      // Log email verification
      const activityLogService = require('../services/activityLogService');
      await activityLogService.logActivity({
        userId: user.id,
        activityType: 'email_verified',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        success: true,
        metadata: { email: user.email }
      });

      // Send welcome email
      const userDetails = await db('users')
        .where({ id: user.id })
        .select('first_name')
        .first();

      try {
        await emailService.sendWelcomeEmail(user.email, userDetails?.first_name || 'User');
        console.log(`Welcome email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the verification if welcome email fails
      }

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: { email: user.email }
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during email verification'
      });
    }
  },

  // Resend Verification Email
  async resendVerificationEmail(req, res) {
    try {
      const { email } = req.body;

      // Validate required fields
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format'
        });
      }

      // Find user
      const user = await db('users')
        .where({ email: email.toLowerCase() })
        .select('id', 'first_name', 'last_name', 'email', 'is_active')
        .first();

      if (!user) {
        // Don't reveal if user exists or not
        return res.json({
          success: true,
          message: 'If an account with this email exists, a verification link has been sent.'
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact administrator.'
        });
      }

      // Check if email is already verified
      const existingVerification = await db('email_verifications')
        .where({
          user_id: user.id,
          email: user.email,
          verified: true
        })
        .first();

      if (existingVerification) {
        return res.json({
          success: true,
          message: 'Email is already verified.'
        });
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(18).toString('base64url');
      const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Store verification token in database
      await db('email_verifications').insert({
        user_id: user.id,
        email: user.email,
        token_hash: verificationTokenHash,
        expires_at: expiresAt,
        verified: false,
        used: false,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Send email with verification link
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      try {
        await emailService.sendEmailVerificationEmail(user.email, verificationLink);
        console.log(`Email verification sent successfully to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send email verification:', emailError);
        // Continue with the process even if email fails - user can still use the token
      }

      // Log verification email request
      const activityLogService = require('../services/activityLogService');
      await activityLogService.logActivity({
        userId: user.id,
        activityType: 'verification_email_sent',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        success: true,
        metadata: { email: user.email }
      });

      res.json({
        success: true,
        message: 'If an account with this email exists, a verification link has been sent.'
      });

    } catch (error) {
      console.error('Resend verification email error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during verification email request'
      });
    }
  },

  // Internal function to handle Google login (extracted from googleLogin)
  async processGoogleLogin(googleData) {
    try {
      const { googleId, email, firstName, lastName, profilePicture, role = 'user' } = googleData;
      await ensure2FAColumn();

      // Check if user exists with this Google ID
      let user = await db('users')
        .where({ google_id: googleId })
        .first();

      // If user doesn't exist with Google ID, check if they exist with email
      if (!user) {
        user = await db('users')
          .where({ email: email.toLowerCase() })
          .first();

        // If user exists with email but not Google ID, update their Google ID
        if (user) {
          await db('users')
            .where({ id: user.id })
            .update({ google_id: googleId, updated_at: new Date() });
        }
      }

      let token;

      // If user doesn't exist at all, create a new user
      if (!user) {
        // For Google Sign Up, we allow creating user without chapter initially
        // They will be redirected to complete profile page
        const userData = {
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
          google_id: googleId,
          profile_picture: profilePicture,
          role: role, // Use the passed role
          chapter_id: null, // Force chapter selection after OAuth
          is_active: true,
          ...(has2FAColumn ? { is_2fa_enabled: true } : {}),
          created_at: new Date(),
          updated_at: new Date()
        };

        // Insert new user
        const result = await db('users').insert(userData).returning('id');
        const userId = result[0].id || result[0];

        // Get the created user
        user = await db('users')
          .where({ id: userId })
          .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture', ...(has2FAColumn ? ['is_2fa_enabled'] : []))
          .first();
          
        // Mark as new user for frontend redirection
        user.isNewUser = true;
      } else {
        // Update last login and profile picture
        await db('users')
          .where({ id: user.id })
          .update({
            last_login_at: new Date(),
            profile_picture: profilePicture || user.profile_picture,
            updated_at: new Date()
          });

        // Refresh user data
        user = await db('users')
          .where({ id: user.id })
          .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture', ...(has2FAColumn ? ['is_2fa_enabled'] : []))
          .first();
      }

      // Enforce 2FA for Google signups when column exists
      if (has2FAColumn && (user.is_2fa_enabled || user.isNewUser)) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db('two_factor_codes').insert({
          user_id: user.id,
          code: codeHash,
          expires_at: expiresAt,
          created_at: new Date()
        });

        try {
          await emailService.send2FACodeEmail(user.email, code);
        } catch (emailError) {
          console.error('Failed to send 2FA email:', emailError);
          return {
            success: false,
            message: 'Failed to send verification code'
          };
        }

        return {
          success: true,
          requires2FA: true,
          message: 'Verification code sent to your email',
          data: {
            userId: user.id,
            email: user.email
          }
        };
      }

      // Log successful SSO login
      const activityLogService = require('../services/activityLogService');
      await activityLogService.logActivity({
        userId: user.id,
        activityType: 'login',
        ipAddress: 'unknown',
        userAgent: 'Google OAuth',
        success: true,
        metadata: { loginMethod: 'google_oauth' }
      });

      // Generate JWT token
      token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          chapter: user.chapter_id
        },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      console.log('Google OAuth login successful for:', email);

      return {
        success: true,
        message: 'Google login successful',
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            chapter: user.chapter_id,
            isActive: user.is_active,
            profilePicture: getProfilePictureUrl(user.profile_picture),
            isNewUser: !!user.isNewUser // Pass this flag to frontend
          },
          token
        }
      };

    } catch (error) {
      console.error('Google login internal error:', error);
      throw error;
    }
  },

  // Google OAuth callback - exchange authorization code for user data
  async googleCallback(req, res) {
    try {
      // 1. Passport Flow (GET request, req.user populated by passport middleware)
      if (req.user) {
        const user = req.user;
        const token = jwt.sign(
          { id: user.id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        // Determine frontend URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        
        // Redirect to frontend with token
        return res.redirect(`${frontendUrl}/auth/google/callback?token=${token}`);
      }

      // 2. Manual Flow (POST request, req.body.code)
      const { code, redirectUri } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Authorization code is required'
        });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(500).json({
          success: false,
          message: 'Google OAuth not configured on server'
        });
      }

      // Diagnostic logging: confirm runtime client and redirect
      try {
        console.log('[OAuth] Token exchange starting:', {
          clientId,
          redirectUriUsed: redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/google/callback`,
          requestRedirectUri: redirectUri,
          frontendUrlEnv: process.env.FRONTEND_URL,
          serverOrigin: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`
        });
      } catch (_) {}

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/google/callback`,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokenData);
        return res.status(400).json({
          success: false,
          message: 'Failed to exchange authorization code'
        });
      }

      const { access_token } = tokenData;

      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        console.error('User info fetch failed:', userData);
        return res.status(400).json({
          success: false,
          message: 'Failed to get user information from Google'
        });
      }

      // Prepare data for our login flow
      const googleData = {
        googleId: userData.id,
        email: userData.email,
        firstName: userData.given_name || userData.name?.split(' ')[0] || '',
        lastName: userData.family_name || userData.name?.split(' ').slice(1).join(' ') || '',
        profilePicture: userData.picture,
        role: req.body.role || 'user' // Pass role from request body
      };

      // Process Google login
      // Use authController directly since 'this' might be lost in callback
      const result = await authController.processGoogleLogin(googleData);

      res.json(result);

    } catch (error) {
      console.error('Google callback error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during Google authentication'
      });
    }
  },

};

module.exports = authController;