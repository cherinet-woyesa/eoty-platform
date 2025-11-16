const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const authConfig = require('../config/auth');

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
        subjectAreas
      } = req.body;

      console.log('Registration attempt:', { firstName, lastName, email, chapter, role });

      // Validate required fields
      if (!firstName || !lastName || !email || !password || !chapter) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
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
        created_at: new Date(),
        updated_at: new Date()
      };

      // FIXED: Insert user and get the ID (PostgreSQL compatible)
      const result = await db('users').insert(userData).returning('id');
      const userId = result[0].id;

      console.log('User created with ID:', userId, 'Role:', userRole, 'Chapter:', chapterId);

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
        .select('id', 'first_name', 'last_name', 'email', 'role', 'role_requested', 'status', 'chapter_id', 'is_active')
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

      const responseMessage = role === 'teacher' 
        ? 'Teacher account created successfully! You now have access to creator tools. Additional verification options will be available in future updates.'
        : 'Account created successfully';

      res.status(201).json({
        success: true,
        message: responseMessage,
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            roleRequested: user.role_requested,
            status: user.status,
            chapter: user.chapter_id,
            isActive: user.is_active
          },
          token,
          // Kept for backward compatibility; now just informational
          isTeacherApplication: role === 'teacher'
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

      // Find user (include profile_picture and lockout fields)
      const user = await db('users')
        .where({ email: email.toLowerCase() })
        .select('id', 'first_name', 'last_name', 'email', 'password_hash', 'role', 'chapter_id', 'is_active', 'profile_picture', 'failed_login_attempts', 'account_locked_until')
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

      // Check if account is locked (REQUIREMENT: Handles authentication failures with retry and lockout)
      if (user.account_locked_until) {
        const lockUntil = new Date(user.account_locked_until);
        if (lockUntil > new Date()) {
          const minutesRemaining = Math.ceil((lockUntil - new Date()) / 1000 / 60);
          
          await activityLogService.logActivity({
            userId: user.id,
            activityType: 'failed_login',
            ipAddress,
            userAgent,
            success: false,
            failureReason: `Account locked. Unlocks in ${minutesRemaining} minutes`
          });

          return res.status(423).json({
            success: false,
            message: `Account is temporarily locked. Please try again in ${minutesRemaining} minute(s).`,
            lockoutUntil: lockUntil.toISOString()
          });
        } else {
          // Lockout expired, reset
          await db('users')
            .where({ id: user.id })
            .update({
              failed_login_attempts: 0,
              account_locked_until: null
            });
        }
      }

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

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        // Increment failed login attempts (REQUIREMENT: Handles authentication failures with retry and lockout)
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        const maxAttempts = 5;
        const lockoutMinutes = Math.min(15 * Math.pow(2, Math.floor(failedAttempts / 3) - 1), 60); // Exponential backoff: 15, 30, 60 minutes

        let updateData = {
          failed_login_attempts: failedAttempts,
          updated_at: new Date()
        };

        // Lock account after max attempts (REQUIREMENT: Account lockout)
        if (failedAttempts >= maxAttempts) {
          const lockUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
          updateData.account_locked_until = lockUntil;
        }

        await db('users')
          .where({ id: user.id })
          .update(updateData);

        await activityLogService.logActivity({
          userId: user.id,
          activityType: 'failed_login',
          ipAddress,
          userAgent,
          success: false,
          failureReason: 'Invalid password',
          metadata: { failedAttempts, maxAttempts }
        });

        const remainingAttempts = maxAttempts - failedAttempts;
        return res.status(401).json({
          success: false,
          message: remainingAttempts > 0 
            ? `Invalid email or password. ${remainingAttempts} attempt(s) remaining.`
            : `Account locked due to too many failed attempts. Please try again in ${lockoutMinutes} minute(s).`,
          remainingAttempts: Math.max(0, remainingAttempts)
        });
      }

      // Successful login - reset failed attempts and update last login
      await db('users')
        .where({ id: user.id })
        .update({
          failed_login_attempts: 0,
          account_locked_until: null,
          last_login_at: new Date()
        });

      // Log successful login (REQUIREMENT: Login history)
      await activityLogService.logActivity({
        userId: user.id,
        activityType: 'login',
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

      console.log('Login successful for:', email, 'Role:', user.role);

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
      
      await activityLogService.logActivity({
        activityType: 'failed_login',
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'Internal server error'
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  },

  // Logout (REQUIREMENT: Activity logs)
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
          google_id: googleId,
          profile_picture: profilePicture,
          role: 'user', // Default role for Google signups (generic member)
          chapter_id: defaultChapter.id, // Use valid chapter ID
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        };

        // Insert new user
        const result = await db('users').insert(userData).returning('id');
        const userId = result[0].id;

        // Get the created user
        user = await db('users')
          .where({ id: userId })
          .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture')
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
          .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'profile_picture')
          .first();
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
      const user = await db('users')
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
          db.raw('COALESCE(bio, \'\') as bio'),
          db.raw('COALESCE(phone, \'\') as phone'),
          db.raw('COALESCE(location, \'\') as location'),
          db.raw('COALESCE(specialties, NULL) as specialties'),
          db.raw('COALESCE(teaching_experience, 0) as teaching_experience'),
          db.raw('COALESCE(education, \'\') as education'),
          db.raw('COALESCE(interests, NULL) as interests'),
          db.raw('COALESCE(learning_goals, \'\') as learning_goals'),
          db.raw('COALESCE(date_of_birth, NULL) as date_of_birth'),
          'created_at'
        )
        .first();

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
        profileCompletion = this.calculateProfileCompletion(user);
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
            profileCompletion: profileCompletion
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

      // In a real implementation, you would:
      // 1. Upload the file to a storage service (S3, Cloudinary, etc.)
      // 2. Save the URL to the user's profile in the database
      // 3. Return the URL to the frontend

      // Construct full URL for profile picture
      const relativePath = `/uploads/profiles/${req.file.filename}`;
      const profilePictureUrl = getProfilePictureUrl(relativePath);

      // Update user's profile picture in database (store relative path, return full URL)
      await db('users')
        .where({ id: req.user.userId })
        .update({ 
          profile_picture: relativePath, // Store relative path in DB
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          profilePicture: profilePictureUrl // Return full URL to frontend
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
      const { firstName, lastName, bio, phone, location, profilePicture, specialties, teachingExperience, education, interests, learningGoals, dateOfBirth } = req.body;
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
        phone: phone || null,
        location: location || null,
        profile_picture: profilePicturePath || null,
        specialties: Array.isArray(specialties) ? specialties : null,
        teaching_experience: teachingExperience || null,
        education: education || null,
        interests: Array.isArray(interests) ? interests : null,
        learning_goals: learningGoals && String(learningGoals).trim() ? learningGoals : null,
        date_of_birth: dateOfBirth && String(dateOfBirth).trim() ? dateOfBirth : null,
        updated_at: new Date()
      };

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

      console.log('Profile update successful, fetching updated user...');

      // Get updated user data
      const user = await db('users')
        .where({ id: userId })
        .select('id', 'first_name', 'last_name', 'email', 'role', 'chapter_id', 'is_active', 'last_login_at', 'profile_picture', 'bio', 'phone', 'location', 'specialties', 'teaching_experience', 'education', 'interests', 'learning_goals', 'date_of_birth')
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
            education: user.education
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
  }
};

module.exports = authController;
