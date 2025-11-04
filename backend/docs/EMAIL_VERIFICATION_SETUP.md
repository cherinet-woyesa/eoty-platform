# Email Verification Setup Guide

## Overview
This document describes the email verification flow implementation for Better Auth migration.

## Components Implemented

### Backend

1. **Email Service** (`backend/services/emailService.js`)
   - Sends verification emails with tokens
   - Sends password reset emails
   - HTML email templates with professional styling
   - SMTP configuration using nodemailer

2. **Better Auth Configuration** (`backend/lib/auth.js`)
   - Email verification enabled with 24-hour token expiration
   - Password reset enabled with 1-hour token expiration
   - Integrated email service callbacks

### Frontend

1. **Verify Email Page** (`frontend/src/pages/auth/VerifyEmail.tsx`)
   - Handles email verification from link
   - Shows success/error/expired states
   - Auto-redirects to login on success

2. **Resend Verification Page** (`frontend/src/pages/auth/ResendVerification.tsx`)
   - Allows users to request new verification email
   - Form validation and error handling
   - Success feedback

3. **Email Verification Status Component** (`frontend/src/components/auth/EmailVerificationStatus.tsx`)
   - Displays verification status badge
   - Inline resend functionality
   - Can be embedded in user profile/settings

## Configuration

### Environment Variables Required

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@eotyplatform.com

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

### Gmail Setup (if using Gmail)

1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password as `SMTP_PASSWORD`

## Routes Added

### Frontend Routes
- `/verify-email?token=<token>` - Email verification page
- `/resend-verification` - Resend verification email page

### Backend Endpoints (Better Auth)
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/resend-verification` - Request new verification email

## Testing

### Manual Testing Steps

1. **Test Email Service Connection**
   ```javascript
   const emailService = require('./services/emailService');
   emailService.verifyConnection();
   ```

2. **Test Registration Flow**
   - Register a new user
   - Check email inbox for verification email
   - Click verification link
   - Verify redirect to login

3. **Test Resend Flow**
   - Go to `/resend-verification`
   - Enter email address
   - Check for new verification email

4. **Test Expired Token**
   - Wait 24 hours or manually expire token in database
   - Try to verify with expired token
   - Should show expired message with resend option

5. **Test Verification Status Component**
   - Add component to user profile page
   - Should show "Email Not Verified" for unverified users
   - Should show "Email Verified" for verified users

## Email Templates

Both verification and password reset emails include:
- Professional HTML styling
- Responsive design
- Clear call-to-action buttons
- Expiration warnings
- Security notices
- Fallback plain text versions

## Security Features

- Tokens expire after configured time (24h for verification, 1h for reset)
- Tokens are single-use
- HTTPS enforced in production
- No sensitive data in email content
- Rate limiting on resend endpoints (configured in Better Auth)

## Integration with Better Auth

The email verification flow is fully integrated with Better Auth:
- Automatic token generation
- Secure token validation
- Session management after verification
- Built-in rate limiting
- CSRF protection

## Troubleshooting

### Emails Not Sending
1. Check SMTP credentials in `.env`
2. Verify SMTP connection: `emailService.verifyConnection()`
3. Check firewall/network settings for port 587
4. Review console logs for error messages

### Verification Link Not Working
1. Check `FRONTEND_URL` is correct in `.env`
2. Verify token hasn't expired
3. Check Better Auth database tables exist
4. Review browser console for errors

### Gmail Specific Issues
- Use App Password, not regular password
- Enable "Less secure app access" if needed
- Check Gmail sending limits (500 emails/day)

## Next Steps

After implementing email verification:
1. Test with real email addresses
2. Configure production SMTP service (SendGrid, AWS SES, etc.)
3. Add email verification requirement to protected routes
4. Implement email change flow with re-verification
5. Add verification status to user dashboard
