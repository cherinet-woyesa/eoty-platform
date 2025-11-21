# EOTY Platform Authentication System

## Overview

The EOTY Platform features a comprehensive, production-ready authentication system supporting user registration, login, password reset, email verification, and social login (Google & Facebook).

## Features

### 🔐 Core Authentication
- **User Registration** with role selection (User/Teacher)
- **Secure Login** with password hashing (bcrypt)
- **JWT Token Authentication** with configurable expiration
- **Session Management** with automatic logout
- **Activity Logging** for security monitoring

### 🔑 Password Management
- **Password Reset Flow** with secure token-based reset
- **Password Strength Validation** (8+ chars, uppercase, lowercase, numbers, special chars)
- **Real-time Password Strength Indicator**
- **Secure Token Storage** with SHA-256 hashing and expiration

### 📧 Email Verification
- **Email Verification** for new accounts
- **Welcome Emails** after successful verification
- **Resend Verification** functionality
- **SMTP Email Service** with HTML templates

### 🌐 Social Login
- **Google OAuth** integration
- **Facebook OAuth** integration (infrastructure ready)
- **SSO Account Linking** for existing users

### 🛡️ Security Features
- **Rate Limiting** considerations
- **Account Lockout** protection (configurable)
- **Activity Monitoring** and logging
- **Secure Token Management**
- **Input Validation** and sanitization

## API Endpoints

### Authentication
```
POST /auth/register          - User registration
POST /auth/login             - User login
POST /auth/logout            - User logout (authenticated)
POST /auth/google-login      - Google OAuth login
POST /auth/facebook-login    - Facebook OAuth login
GET  /auth/me               - Get current user profile (authenticated)
GET  /auth/permissions      - Get user permissions (authenticated)
PUT  /auth/profile          - Update user profile (authenticated)
POST /auth/upload-profile-image - Upload profile image (authenticated)
```

### Password Reset
```
POST /auth/forgot-password          - Request password reset
POST /auth/reset-password           - Reset password with token
POST /auth/verify-reset-token       - Verify reset token validity
```

### Email Verification
```
POST /auth/verify-email            - Verify email with token
POST /auth/resend-verification     - Resend verification email
```

## Frontend Components

### Authentication Pages
- `/login` - LoginForm component
- `/register` - RegisterForm component
- `/forgot-password` - ForgotPassword component
- `/reset-password` - ResetPassword component
- `/verify-email` - EmailVerification component

### Features
- **Real-time validation** with debouncing
- **Loading states** and error handling
- **Accessibility** (ARIA labels, keyboard navigation)
- **Mobile responsive** design
- **Password strength indicators**

## Database Schema

### Tables Created
- **`password_resets`** - Secure password reset tokens
- **`email_verifications`** - Email verification tokens

### Key Fields
```sql
-- Password Resets
CREATE TABLE password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Verifications
CREATE TABLE email_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Configuration

### Required Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_NAME=eoty_platform

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@eotyplatform.com

# Frontend
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000

# OAuth (Optional)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_FACEBOOK_APP_ID=your-facebook-app-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Email Service

### Features
- **SMTP Transport** with TLS encryption
- **HTML Email Templates** with responsive design
- **Error Handling** with fallback to console logging
- **Multiple Email Types**:
  - Password Reset Emails
  - Email Verification Emails
  - Welcome Emails

### Testing Email Service
```bash
# Test basic email
node test-email-service.js your-email@example.com

# Test password reset email
node test-email-service.js reset your-email@example.com

# Test email verification
node test-email-service.js verify your-email@example.com

# Test welcome email
node test-email-service.js welcome your-email@example.com John
```

## Security Best Practices

### Password Security
- **BCrypt hashing** with salt rounds (configurable)
- **Minimum 8 characters** with complexity requirements
- **No common passwords** allowed
- **Regular password updates** encouraged

### Token Security
- **SHA-256 hashing** for token storage
- **Expiration times** (1 hour for reset, 24 hours for verification)
- **One-time use** tokens
- **Secure random generation** using crypto module

### Session Security
- **JWT tokens** with proper expiration
- **Automatic logout** after inactivity (24 hours)
- **Activity monitoring** and logging
- **Secure cookie settings** (httpOnly, secure flags)

## API Testing

### Registration Flow
```bash
# Register new user
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "TestPass123!",
    "chapter": 1,
    "role": "user"
  }'
```

### Login Flow
```bash
# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

### Password Reset Flow
```bash
# Request reset
curl -X POST http://localhost:5000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Reset password (use token from email)
curl -X POST http://localhost:5000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-from-email",
    "password": "NewSecurePass123!"
  }'
```

## Deployment Considerations

### Production Setup
1. **Use strong JWT secrets** (generate with `openssl rand -base64 32`)
2. **Configure SMTP** with dedicated email service (SendGrid, Mailgun, etc.)
3. **Enable HTTPS** for all authentication endpoints
4. **Set up rate limiting** middleware
5. **Configure CORS** properly for frontend domain
6. **Set up monitoring** for failed login attempts

### Scalability
- **Database indexing** on frequently queried fields
- **Redis** for session storage (optional)
- **Load balancer** sticky sessions for JWT tokens
- **Email queue** for high-volume email sending

## Troubleshooting

### Common Issues

**Email not sending:**
- Check SMTP credentials
- Verify firewall settings
- Test with email service test script

**JWT token issues:**
- Check JWT_SECRET configuration
- Verify token expiration settings
- Check for timezone issues

**Social login issues:**
- Verify OAuth client IDs and secrets
- Check redirect URIs in OAuth provider settings
- Ensure proper CORS configuration

**Database connection issues:**
- Check database credentials
- Verify database is running and accessible
- Check for migration issues

## Future Enhancements

### Planned Features
- **Two-factor authentication (2FA)**
- **Account recovery options**
- **Social login expansion** (Apple, Microsoft)
- **Advanced security monitoring**
- **API key management**
- **OAuth 2.0 full implementation**

### Integration Options
- **Third-party identity providers** (Auth0, Firebase Auth)
- **Single sign-on (SSO)** solutions
- **LDAP/Active Directory** integration
- **Biometric authentication**

---

## Support

For issues with the authentication system:
1. Check the server logs for detailed error messages
2. Test individual endpoints using the provided curl commands
3. Use the email test script to verify email functionality
4. Review environment configuration for missing variables

The authentication system is designed to be secure, scalable, and user-friendly while maintaining the highest standards of data protection and user experience.
