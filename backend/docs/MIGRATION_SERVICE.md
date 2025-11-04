# Legacy User Migration Service

## Overview

The Legacy User Migration Service provides transparent migration of users from the legacy JWT-based authentication system to Better Auth. This allows existing users to continue logging in with their credentials while seamlessly transitioning to the new authentication system.

## Architecture

### Components

1. **LegacyUserMigration Service** (`backend/services/legacyUserMigration.js`)
   - Core migration logic
   - Password verification
   - User data transformation
   - Migration status tracking

2. **Migration Routes** (`backend/routes/migration.js`)
   - `/api/auth/migrate-login` - Transparent migration endpoint
   - `/api/auth/migration-status` - Check migration status
   - `/api/auth/feature-flags` - View feature flag status

3. **Feature Flags** (`backend/utils/featureFlags.js`)
   - `ENABLE_LEGACY_MIGRATION` - Enable/disable migration
   - `ENABLE_BETTER_AUTH` - Enable/disable Better Auth

## How It Works

### Migration Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User attempts login with email/password                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/auth/migrate-login                                │
│  { email, password }                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Check if user exists in legacy system                    │
│     - Query 'users' table                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Verify password with legacy bcrypt hash                  │
│     - Compare against password_hash column                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Check if already migrated                                │
│     - Query 'user' table (Better Auth)                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Create Better Auth user                                  │
│     - Call auth.api.signUpEmail()                           │
│     - Preserve user data (role, chapter, profile)           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Mark legacy user as migrated                             │
│     - Update migrated_to_better_auth = true                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Create Better Auth session                               │
│     - Call auth.api.signInEmail()                           │
│     - Return session cookie                                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Preservation

The migration service preserves all user data:

| Legacy Field | Better Auth Field | Notes |
|-------------|------------------|-------|
| `id` | N/A | New ID generated |
| `email` | `email` | Preserved |
| `password_hash` | `password` | Re-hashed by Better Auth |
| `first_name` | `first_name` | Custom field |
| `last_name` | `last_name` | Custom field |
| `role` | `role` | Custom field |
| `chapter_id` | `chapter_id` | Custom field |
| `profile_picture` | `profile_picture` | Custom field |
| `is_active` | `is_active` | Custom field |

## API Endpoints

### POST /api/auth/migrate-login

Authenticate and migrate a legacy user to Better Auth.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "migrated": true,
  "message": "User successfully migrated and logged in",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "chapter": 1,
    "isActive": true
  },
  "session": {
    "id": "session_id",
    "userId": "user_id",
    "expiresAt": "2024-11-10T..."
  }
}
```

**Already Migrated Response (200):**
```json
{
  "success": true,
  "alreadyMigrated": true,
  "message": "User already migrated. Please use the standard login endpoint.",
  "redirectTo": "/api/auth/sign-in/email"
}
```

**Error Responses:**

- **401 Unauthorized** - Invalid credentials
```json
{
  "success": false,
  "error": "Invalid password",
  "code": "INVALID_PASSWORD"
}
```

- **403 Forbidden** - Account disabled or migration disabled
```json
{
  "success": false,
  "error": "Account is deactivated",
  "code": "ACCOUNT_DISABLED"
}
```

- **500 Internal Server Error** - Migration failed
```json
{
  "success": false,
  "error": "Internal server error during migration",
  "code": "INTERNAL_ERROR"
}
```

### GET /api/auth/migration-status

Check if a user has been migrated to Better Auth.

**Query Parameters:**
- `email` (required) - User's email address

**Response (200):**
```json
{
  "success": true,
  "migrated": true,
  "isLegacyUser": true,
  "email": "user@example.com"
}
```

### GET /api/auth/feature-flags

Get the current status of authentication feature flags.

**Response (200):**
```json
{
  "success": true,
  "flags": {
    "legacyMigration": true,
    "betterAuth": false
  },
  "validation": {
    "valid": true,
    "warnings": []
  }
}
```

## Feature Flags

### ENABLE_LEGACY_MIGRATION

Controls whether legacy user migration is enabled.

**Values:**
- `true` - Migration endpoint is active
- `false` - Migration endpoint returns 403

**Environment Variable:**
```bash
ENABLE_LEGACY_MIGRATION=true
```

### ENABLE_BETTER_AUTH

Controls whether Better Auth is enabled for new registrations and logins.

**Values:**
- `true` - Better Auth is active
- `false` - Better Auth is disabled

**Environment Variable:**
```bash
ENABLE_BETTER_AUTH=false
```

### Feature Flag Validation

The system validates feature flag combinations:

| Legacy Migration | Better Auth | Status | Warning |
|-----------------|-------------|--------|---------|
| `true` | `true` | ✅ Valid | None |
| `true` | `false` | ✅ Valid | None |
| `false` | `true` | ⚠️ Warning | Existing users can't migrate |
| `false` | `false` | ⚠️ Warning | Users can't authenticate |

## Testing

### Running Tests

```bash
# Run migration service tests
node backend/test-migration.js
```

### Test Coverage

The test script verifies:
1. ✅ Database connectivity
2. ✅ Legacy user detection
3. ✅ Migration statistics
4. ✅ Feature flag configuration
5. ✅ Migration service files
6. ✅ Database schema

### Manual Testing

1. **Test migration endpoint:**
```bash
curl -X POST http://localhost:5000/api/auth/migrate-login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@eoty.org","password":"password123"}'
```

2. **Check migration status:**
```bash
curl http://localhost:5000/api/auth/migration-status?email=student@eoty.org
```

3. **View feature flags:**
```bash
curl http://localhost:5000/api/auth/feature-flags
```

## Database Schema

### Legacy Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student',
  chapter_id INTEGER REFERENCES chapters(id),
  profile_picture TEXT,
  is_active BOOLEAN DEFAULT true,
  migrated_to_better_auth BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Better Auth User Table

```sql
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  emailVerified BOOLEAN DEFAULT false,
  name TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Custom fields
  role TEXT NOT NULL DEFAULT 'student',
  chapter_id INTEGER,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  profile_picture TEXT,
  is_active BOOLEAN DEFAULT true
);
```

## Security Considerations

### Password Handling

1. **Legacy passwords** are verified using bcrypt
2. **Better Auth** re-hashes passwords with its own algorithm
3. **Plain text passwords** are never logged or stored
4. **Password hashes** are never exposed in API responses

### Rate Limiting

The migration endpoint is protected by rate limiting:
- **5 attempts** per IP address per 15 minutes
- **429 status** returned when limit exceeded

### Session Security

- **HTTP-only cookies** prevent XSS attacks
- **Secure flag** enabled in production
- **SameSite=Lax** prevents CSRF attacks
- **7-day expiration** with automatic refresh

## Troubleshooting

### Migration Fails

**Problem:** Migration endpoint returns 500 error

**Solutions:**
1. Check Better Auth is properly initialized
2. Verify database connection
3. Check Better Auth tables exist
4. Review server logs for detailed error

### User Already Migrated

**Problem:** User gets "already migrated" message but can't login

**Solutions:**
1. Direct user to standard login endpoint: `/api/auth/sign-in/email`
2. Verify user exists in Better Auth `user` table
3. Check user's `is_active` status

### Feature Flag Issues

**Problem:** Migration endpoint returns 403

**Solutions:**
1. Check `ENABLE_LEGACY_MIGRATION=true` in `.env`
2. Restart server after changing environment variables
3. Verify `.env` file is in correct location

### Password Verification Fails

**Problem:** Valid password rejected during migration

**Solutions:**
1. Verify password hash exists in legacy `users` table
2. Check bcrypt version compatibility
3. Ensure password is sent as plain text (not hashed)

## Deployment

### Pre-Deployment Checklist

- [ ] Database migrations completed
- [ ] Better Auth tables created
- [ ] Feature flags configured
- [ ] Environment variables set
- [ ] Migration service tested

### Deployment Steps

1. **Deploy with migration disabled:**
```bash
ENABLE_LEGACY_MIGRATION=false
ENABLE_BETTER_AUTH=false
```

2. **Enable migration for testing:**
```bash
ENABLE_LEGACY_MIGRATION=true
ENABLE_BETTER_AUTH=false
```

3. **Test with internal users:**
   - Verify migration works
   - Check session creation
   - Test API endpoints

4. **Enable for all users:**
```bash
ENABLE_LEGACY_MIGRATION=true
ENABLE_BETTER_AUTH=true
```

### Rollback Procedure

If issues occur:

1. **Disable migration immediately:**
```bash
ENABLE_LEGACY_MIGRATION=false
ENABLE_BETTER_AUTH=false
```

2. **Restart server**

3. **Investigate issues**

4. **Re-enable when fixed**

## Monitoring

### Metrics to Track

1. **Migration rate** - Users migrated per day
2. **Success rate** - Successful migrations / total attempts
3. **Error rate** - Failed migrations / total attempts
4. **Session creation** - Sessions created after migration

### Logs to Monitor

```javascript
// Successful migration
console.log('User migrated:', { email, role, chapter_id });

// Failed migration
console.error('Migration failed:', { email, error });

// Already migrated
console.log('User already migrated:', { email });
```

## Future Enhancements

1. **Bulk migration** - Migrate all users at once
2. **Email notifications** - Notify users of migration
3. **Migration dashboard** - Admin UI for monitoring
4. **Automatic migration** - Migrate on first login automatically
5. **Migration reports** - Generate migration statistics

## Support

For issues or questions:
1. Check server logs
2. Run test script: `node backend/test-migration.js`
3. Review this documentation
4. Contact development team

## References

- [Better Auth Documentation](https://better-auth.com)
- [Migration Design Document](../.kiro/specs/better-auth-migration/design.md)
- [Migration Requirements](../.kiro/specs/better-auth-migration/requirements.md)
