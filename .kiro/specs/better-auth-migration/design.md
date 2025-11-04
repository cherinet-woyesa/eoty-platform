# Better Auth Migration - Design Document

## Overview

This design document outlines the technical architecture and implementation strategy for migrating the EOTY Platform's authentication system from a custom JWT-based implementation to Better Auth. The migration will be executed in phases to ensure zero downtime and maintain backward compatibility with existing users.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Better Auth React Client                              │ │
│  │  - useSession() hook                                   │ │
│  │  - signIn(), signUp(), signOut() methods              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Node.js/Express)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Better Auth Server                                    │ │
│  │  - Auth endpoints (/api/auth/*)                       │ │
│  │  - Session middleware                                  │ │
│  │  - Rate limiting                                       │ │
│  │  - CSRF protection                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Custom RBAC Middleware                                │ │
│  │  - Role verification                                   │ │
│  │  - Permission checks                                   │ │
│  │  - Chapter-based access control                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    users     │  │   session    │  │   account    │     │
│  │  (existing)  │  │ (Better Auth)│  │ (Better Auth)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ verification │  │   chapters   │                        │
│  │(Better Auth) │  │  (existing)  │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Migration Strategy: Phased Approach

**Phase 1: Setup & Preparation**
- Install Better Auth dependencies
- Configure Better Auth server
- Create database migrations
- No user-facing changes

**Phase 2: Parallel Operation**
- Both auth systems run simultaneously
- New users use Better Auth
- Existing users use legacy auth
- Feature flag controls which system is used

**Phase 3: User Migration**
- Migrate existing users on first login
- Transparent to users
- Gradual migration over time

**Phase 4: Full Cutover**
- Disable legacy auth system
- All users on Better Auth
- Remove old auth code

## Components and Interfaces

### 1. Better Auth Server Configuration

**File:** `backend/lib/auth.ts`

```typescript
import { betterAuth } from "better-auth"
import { Pool } from "pg"
import Database from "better-auth/adapters/postgres"

export const auth = betterAuth({
  database: Database(new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })),
  
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
  },
  
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  
  rateLimit: {
    enabled: true,
    window: 15 * 60, // 15 minutes
    max: 5, // 5 attempts
  },
  
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  
  // Custom user fields
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "student",
      },
      chapter_id: {
        type: "number",
        required: true,
      },
      first_name: {
        type: "string",
        required: true,
      },
      last_name: {
        type: "string",
        required: true,
      },
      profile_picture: {
        type: "string",
        required: false,
      },
      is_active: {
        type: "boolean",
        required: true,
        defaultValue: true,
      },
    },
  },
})

export type Auth = typeof auth
```

### 2. Database Schema Changes

**Migration File:** `backend/migrations/017_better_auth_setup.js`

Better Auth requires these tables:
- `session` - Stores active user sessions
- `account` - Stores OAuth provider accounts
- `verification` - Stores email verification tokens

Modifications to existing `users` table:
- Add `emailVerified` column (boolean)
- Add `twoFactorEnabled` column (boolean)
- Add `twoFactorSecret` column (string, encrypted)

### 3. Auth Routes

**File:** `backend/routes/auth.ts`

```typescript
import { Router } from "express"
import { auth } from "../lib/auth"
import { toNodeHandler } from "better-auth/node"

const router = Router()

// Better Auth handles all routes under /api/auth/*
router.all("/auth/*", toNodeHandler(auth))

export default router
```

Better Auth automatically provides these endpoints:
- `POST /api/auth/sign-up/email` - Email/password registration
- `POST /api/auth/sign-in/email` - Email/password login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get current session
- `POST /api/auth/forget-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-email` - Verify email with token
- `GET /api/auth/oauth/google` - Google OAuth initiation
- `GET /api/auth/oauth/google/callback` - Google OAuth callback

### 4. Session Middleware

**File:** `backend/middleware/betterAuthMiddleware.ts`

```typescript
import { Request, Response, NextFunction } from "express"
import { auth } from "../lib/auth"

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    chapter_id: number
    first_name: string
    last_name: string
    emailVerified: boolean
    is_active: boolean
  }
  session?: {
    id: string
    userId: string
    expiresAt: Date
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    })

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    // Check if user is active
    if (!session.user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      })
    }

    req.user = session.user
    req.session = session.session
    next()
  } catch (error) {
    console.error("Auth middleware error:", error)
    res.status(401).json({
      success: false,
      message: "Invalid or expired session",
    })
  }
}

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    })

    if (session) {
      req.user = session.user
      req.session = session.session
    }
    next()
  } catch (error) {
    // Silently fail for optional auth
    next()
  }
}
```

### 5. RBAC Integration

**File:** `backend/middleware/rbacMiddleware.ts`

```typescript
import { Response, NextFunction } from "express"
import { AuthRequest } from "./betterAuthMiddleware"

export const requireRole = (allowedRoles: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      })
    }

    next()
  }
}

export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    const permissionMap: Record<string, string[]> = {
      student: ["course:view", "lesson:view", "quiz:take"],
      teacher: ["course:create", "course:edit_own", "lesson:create"],
      chapter_admin: ["course:edit_any", "user:manage", "chapter:manage"],
      platform_admin: ["system:admin"],
    }

    const userPermissions = permissionMap[req.user.role] || []
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      })
    }

    next()
  }
}

export const requireChapter = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    })
  }

  if (!req.user.chapter_id) {
    return res.status(403).json({
      success: false,
      message: "Chapter assignment required",
    })
  }

  next()
}
```

### 6. Frontend Client Setup

**File:** `frontend/src/lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: "http://localhost:5000",
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  useActiveOrganization,
} = authClient
```

### 7. Frontend Auth Context

**File:** `frontend/src/context/BetterAuthContext.tsx`

```typescript
import React, { createContext, useContext, type ReactNode } from "react"
import { useSession } from "../lib/auth-client"

interface AuthContextType {
  user: any | null
  session: any | null
  isLoading: boolean
  isAuthenticated: boolean
  hasRole: (role: string | string[]) => boolean
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const BetterAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session, isPending } = useSession()

  const hasRole = (role: string | string[]) => {
    if (!session?.user) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(session.user.role)
  }

  const hasPermission = (permission: string) => {
    if (!session?.user) return false
    
    const permissionMap: Record<string, string[]> = {
      student: ["course:view", "lesson:view", "quiz:take"],
      teacher: ["course:create", "course:edit_own", "lesson:create"],
      chapter_admin: ["course:edit_any", "user:manage", "chapter:manage"],
      platform_admin: ["system:admin"],
    }

    const userPermissions = permissionMap[session.user.role] || []
    return userPermissions.includes(permission)
  }

  const value = {
    user: session?.user || null,
    session: session?.session || null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    hasRole,
    hasPermission,
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useBetterAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useBetterAuth must be used within BetterAuthProvider")
  }
  return context
}
```

### 8. Updated Login Component

**File:** `frontend/src/components/auth/BetterAuthLoginForm.tsx`

```typescript
import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { signIn } from "../../lib/auth-client"

const BetterAuthLoginForm: React.FC = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await signIn.email({
        email,
        password,
      })

      if (error) {
        setError(error.message || "Login failed")
        return
      }

      // Redirect to dashboard on success
      navigate("/dashboard")
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      })
    } catch (err: any) {
      setError(err.message || "Google sign-in failed")
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields similar to existing LoginForm */}
      {/* ... */}
    </form>
  )
}

export default BetterAuthLoginForm
```

### 9. Legacy User Migration Service

**File:** `backend/services/legacyUserMigration.ts`

```typescript
import bcrypt from "bcryptjs"
import db from "../config/database"
import { auth } from "../lib/auth"

export class LegacyUserMigration {
  /**
   * Migrate a legacy user to Better Auth on first login
   */
  static async migrateUserOnLogin(email: string, password: string) {
    // Find user in legacy system
    const legacyUser = await db("users")
      .where({ email: email.toLowerCase() })
      .first()

    if (!legacyUser) {
      return { success: false, error: "User not found" }
    }

    // Verify password with legacy hash
    const isValidPassword = await bcrypt.compare(password, legacyUser.password_hash)
    
    if (!isValidPassword) {
      return { success: false, error: "Invalid password" }
    }

    // Check if already migrated
    const existingBetterAuthUser = await db("user")
      .where({ email: email.toLowerCase() })
      .first()

    if (existingBetterAuthUser) {
      return { success: true, alreadyMigrated: true }
    }

    // Create Better Auth user
    try {
      await auth.api.signUpEmail({
        body: {
          email: legacyUser.email,
          password: password, // Better Auth will hash it
          name: `${legacyUser.first_name} ${legacyUser.last_name}`,
          // Custom fields
          role: legacyUser.role,
          chapter_id: legacyUser.chapter_id,
          first_name: legacyUser.first_name,
          last_name: legacyUser.last_name,
          profile_picture: legacyUser.profile_picture,
          is_active: legacyUser.is_active,
          emailVerified: true, // Legacy users are pre-verified
        },
      })

      // Mark legacy user as migrated
      await db("users")
        .where({ id: legacyUser.id })
        .update({ migrated_to_better_auth: true })

      return { success: true, migrated: true }
    } catch (error) {
      console.error("Migration error:", error)
      return { success: false, error: "Migration failed" }
    }
  }
}
```

### 10. Email Service Integration

**File:** `backend/services/emailService.ts`

```typescript
import nodemailer from "nodemailer"

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Verify your EOTY Platform account",
      html: `
        <h1>Welcome to EOTY Platform!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
    })
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Reset your EOTY Platform password",
      html: `
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    })
  }
}
```

## Data Models

### Better Auth Tables

**session table:**
```sql
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**account table:**
```sql
CREATE TABLE account (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  scope TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, account_id)
);
```

**verification table:**
```sql
CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Modified users table

Add these columns to existing `users` table:
```sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN migrated_to_better_auth BOOLEAN DEFAULT FALSE;
```

## Error Handling

### Error Response Format

All authentication errors follow this format:

```typescript
{
  success: false,
  error: {
    code: "AUTH_ERROR_CODE",
    message: "User-friendly error message",
    details: {} // Optional additional details
  }
}
```

### Common Error Codes

- `INVALID_CREDENTIALS` - Wrong email or password
- `EMAIL_NOT_VERIFIED` - Email verification required
- `ACCOUNT_DISABLED` - User account is deactivated
- `RATE_LIMIT_EXCEEDED` - Too many attempts
- `INVALID_TOKEN` - Verification or reset token invalid/expired
- `SESSION_EXPIRED` - User session has expired
- `2FA_REQUIRED` - Two-factor authentication code needed
- `INVALID_2FA_CODE` - Two-factor code is incorrect

## Testing Strategy

### Unit Tests

1. **Auth Configuration Tests**
   - Verify Better Auth initializes correctly
   - Test custom field configuration
   - Test rate limiting configuration

2. **Middleware Tests**
   - Test `requireAuth` with valid/invalid sessions
   - Test `requireRole` with different roles
   - Test `requirePermission` with different permissions

3. **Migration Service Tests**
   - Test legacy user migration logic
   - Test password verification
   - Test duplicate migration prevention

### Integration Tests

1. **Registration Flow**
   - Test email/password registration
   - Test email verification
   - Test duplicate email handling

2. **Login Flow**
   - Test email/password login
   - Test Google OAuth login
   - Test legacy user migration on login
   - Test 2FA flow

3. **Password Reset Flow**
   - Test password reset request
   - Test password reset with valid token
   - Test password reset with expired token

4. **Session Management**
   - Test session creation
   - Test session refresh
   - Test session invalidation on logout
   - Test concurrent sessions

5. **Rate Limiting**
   - Test login rate limiting
   - Test registration rate limiting
   - Test password reset rate limiting

### End-to-End Tests

1. Complete user journey from registration to login
2. Google OAuth complete flow
3. Password reset complete flow
4. Legacy user migration complete flow
5. 2FA setup and login flow

## Security Considerations

1. **HTTPS Only in Production**
   - All cookies marked as `Secure` in production
   - Enforce HTTPS redirects

2. **CSRF Protection**
   - Better Auth includes built-in CSRF protection
   - Verify CSRF tokens on all state-changing operations

3. **Rate Limiting**
   - Implement at application level (Better Auth)
   - Consider additional rate limiting at reverse proxy level

4. **Password Security**
   - Minimum 8 characters
   - Require complexity (uppercase, lowercase, number)
   - Use bcrypt with cost factor 12

5. **Session Security**
   - HTTP-only cookies
   - SameSite=Lax attribute
   - Secure flag in production
   - Regular session rotation

6. **Token Security**
   - Verification tokens expire in 24 hours
   - Reset tokens expire in 1 hour
   - Single-use tokens

7. **Logging**
   - Log authentication events
   - Never log passwords or tokens
   - Log rate limit violations

## Deployment Strategy

### Phase 1: Preparation (Week 1)
- Install dependencies
- Configure Better Auth
- Create database migrations
- Deploy to staging environment

### Phase 2: Testing (Week 2)
- Run comprehensive test suite
- Manual QA testing
- Security audit
- Performance testing

### Phase 3: Soft Launch (Week 3)
- Deploy to production with feature flag OFF
- Enable for internal team only
- Monitor logs and metrics
- Fix any issues

### Phase 4: Gradual Rollout (Week 4)
- Enable for 10% of users
- Monitor for issues
- Increase to 50% if stable
- Full rollout if no issues

### Phase 5: Legacy Deprecation (Week 5-6)
- Migrate remaining users
- Disable legacy auth system
- Remove old code
- Update documentation

## Rollback Plan

If critical issues occur:

1. **Immediate Rollback**
   - Toggle feature flag to disable Better Auth
   - All users revert to legacy auth
   - No data loss

2. **Database Rollback**
   - Run rollback migration script
   - Removes Better Auth tables
   - Preserves user data

3. **Code Rollback**
   - Revert to previous deployment
   - Re-enable legacy auth routes
   - Update frontend to use legacy auth

## Performance Considerations

1. **Database Indexes**
   - Index on `session.user_id`
   - Index on `session.token`
   - Index on `account.user_id`
   - Index on `verification.identifier`

2. **Session Caching**
   - Enable Better Auth cookie cache (5 minutes)
   - Reduces database queries
   - Improves response time

3. **Connection Pooling**
   - Use PostgreSQL connection pool
   - Configure appropriate pool size
   - Monitor connection usage

4. **Rate Limiting**
   - Use in-memory store for rate limiting
   - Consider Redis for distributed systems

## Monitoring and Observability

### Metrics to Track

1. **Authentication Metrics**
   - Login success/failure rate
   - Registration rate
   - Password reset requests
   - Email verification rate
   - 2FA adoption rate

2. **Performance Metrics**
   - Authentication endpoint response time
   - Session validation time
   - Database query performance

3. **Security Metrics**
   - Rate limit violations
   - Failed login attempts
   - Suspicious activity patterns

### Logging

Use structured logging with these fields:
- `timestamp`
- `level` (info, warn, error)
- `event` (login, register, password_reset, etc.)
- `user_id` (if available)
- `ip_address`
- `user_agent`
- `success` (boolean)
- `error_code` (if failed)

## Documentation Requirements

1. **API Documentation**
   - Document all Better Auth endpoints
   - Include request/response examples
   - Document error codes

2. **Migration Guide**
   - Step-by-step migration instructions
   - Rollback procedures
   - Troubleshooting guide

3. **Developer Guide**
   - How to use Better Auth in the codebase
   - How to add new authentication methods
   - How to customize auth flows

4. **User Guide**
   - How to reset password
   - How to enable 2FA
   - How to link Google account
