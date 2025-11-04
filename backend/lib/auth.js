const { betterAuth } = require("better-auth");
const { Kysely, PostgresDialect } = require("kysely");
const { Pool } = require("pg");
const emailService = require("../services/emailService");

// Load environment variables
require('dotenv').config();

// Create PostgreSQL connection pool using existing database credentials
const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
});

// Test the connection
pgPool.query('SELECT 1')
  .then(() => {
    console.log('✅ Better Auth PostgreSQL pool connected successfully');
  })
  .catch((err) => {
    console.error('❌ Better Auth PostgreSQL pool connection failed:', err);
  });

// Create Kysely instance for Better Auth
const db = new Kysely({
  dialect: new PostgresDialect({
    pool: pgPool,
  }),
});

// Initialize Better Auth with comprehensive configuration
const auth = betterAuth({
  // Database adapter using Kysely with PostgreSQL
  database: {
    db: db,
    type: "postgres",
  },
  
  // Email and password authentication provider
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false, // Allow login without email verification
    // Password complexity requirements
    passwordStrength: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
    },
  },
  
  // Social authentication providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },
  
  // Session management configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
  },
  
  // Rate limiting configuration
  rateLimit: {
    enabled: false, // Disabled for development
    window: 15 * 60, // 15 minutes in seconds
    max: 100, // Increased limit
  },
  
  // Advanced security settings
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: process.env.NODE_ENV === "production",
    // Custom ID generator that returns integers as strings
    generateId: () => {
      // Generate a unique integer ID (timestamp + random)
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      return String(timestamp * 1000 + random);
    },
    // Cookie configuration for development (different ports)
    cookieOptions: {
      sameSite: "lax", // Allow cookies across same-site requests
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  },
  
  // CSRF protection
  csrf: {
    enabled: true,
  },
  
  // Base URL for redirects and email links
  baseURL: process.env.FRONTEND_URL || "http://localhost:3000",
  
  // Custom user fields to match existing schema
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
      },
      chapter_id: {
        type: "number",
        required: false,
        defaultValue: null,
      },
      first_name: {
        type: "string",
        required: false,
      },
      last_name: {
        type: "string",
        required: false,
      },
      profile_picture: {
        type: "string",
        required: false,
      },
      is_active: {
        type: "boolean",
        required: false,
        defaultValue: true,
      },
    },
  },
  
  // Email verification settings
  emailVerification: {
    enabled: true,
    expiresIn: 60 * 60 * 24, // 24 hours in seconds
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, token, url }) => {
      try {
        const userName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
        await emailService.sendVerificationEmail(user.email, token, userName);
        console.log(`✅ Verification email sent to ${user.email}`);
      } catch (error) {
        console.error('❌ Failed to send verification email:', error);
        throw error;
      }
    },
  },
  
  // Password reset settings
  resetPassword: {
    enabled: true,
    expiresIn: 60 * 60, // 1 hour in seconds
    sendResetPasswordEmail: async ({ user, token, url }) => {
      try {
        const userName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
        await emailService.sendPasswordResetEmail(user.email, token, userName);
        console.log(`✅ Password reset email sent to ${user.email}`);
      } catch (error) {
        console.error('❌ Failed to send password reset email:', error);
        throw error;
      }
    },
  },
  
  // Two-factor authentication settings
  twoFactor: {
    enabled: true,
    issuer: "EOTY Platform",
  },
});

module.exports = { auth, pgPool };
