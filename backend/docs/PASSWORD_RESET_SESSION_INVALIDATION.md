# Password Reset Session Invalidation

## Overview

This document explains how session invalidation works when a user resets their password using Better Auth.

## How It Works

Better Auth automatically handles session invalidation when a password is reset. This is a built-in security feature that ensures:

1. **All existing sessions are invalidated** when a user successfully resets their password
2. **Users must re-login** with their new password to access the application
3. **Old session tokens become invalid** and will return 401 Unauthorized errors

## Implementation Details

### Backend Configuration

The session invalidation is handled automatically by Better Auth through the `resetPassword` configuration in `backend/lib/auth.js`:

```javascript
resetPassword: {
  enabled: true,
  expiresIn: 60 * 60, // 1 hour in seconds
  sendResetPasswordEmail: async ({ user, token, url }) => {
    // Email sending logic
  },
}
```

When a user successfully resets their password using the `/api/auth/reset-password` endpoint:

1. Better Auth updates the user's password hash in the database
2. Better Auth automatically invalidates all active sessions for that user
3. The user must create a new session by logging in again

### Frontend Implementation

The password reset flow in the frontend (`frontend/src/pages/auth/ResetPassword.tsx`) handles this by:

1. Accepting the reset token from the URL query parameter
2. Submitting the new password to the backend
3. Redirecting the user to the login page after successful reset
4. Displaying a success message informing the user they need to login

```typescript
// After successful password reset
await authApi.resetPassword(token, formData.password);
setSuccess(true);

// Redirect to login after 3 seconds
setTimeout(() => {
  navigate('/login');
}, 3000);
```

## Security Benefits

### 1. Prevents Unauthorized Access

If a user's account was compromised and the attacker had an active session, resetting the password immediately invalidates that session, preventing further unauthorized access.

### 2. Single-Use Reset Tokens

Reset tokens are single-use and expire after 1 hour. Once used to reset a password, the token cannot be reused.

### 3. Forced Re-authentication

By invalidating all sessions, the user is forced to re-authenticate with their new password, ensuring they have control of their account.

## User Experience Flow

### 1. Request Password Reset

```
User clicks "Forgot Password" → Enters email → Receives reset email
```

### 2. Reset Password

```
User clicks reset link → Enters new password → Password is updated
```

### 3. Session Invalidation (Automatic)

```
Better Auth invalidates all sessions → Old tokens become invalid
```

### 4. Re-login Required

```
User is redirected to login → Must login with new password → New session created
```

## Testing Session Invalidation

### Manual Testing Steps

1. **Login to the application**
   - Navigate to `/login`
   - Login with your credentials
   - Note your session token (check browser cookies or localStorage)

2. **Request password reset**
   - Navigate to `/forgot-password`
   - Enter your email address
   - Check your email for the reset link

3. **Reset your password**
   - Click the reset link in the email
   - Enter a new password
   - Submit the form

4. **Verify session invalidation**
   - Try to access a protected route with the old session
   - You should be redirected to login (401 Unauthorized)
   - The old session token should no longer work

5. **Login with new password**
   - Navigate to `/login`
   - Login with your new password
   - You should receive a new session token
   - You should be able to access protected routes

### Automated Testing

Run the test script to verify session invalidation:

```bash
node backend/test-password-reset-session.js
```

This script demonstrates the expected behavior and verifies that:
- Users can request password reset
- Users can reset password with valid token
- Sessions are invalidated after password reset
- Users must re-login after password reset

## API Endpoints

### Request Password Reset

```http
POST /api/auth/forget-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Note:** After this request succeeds, all existing sessions for the user are automatically invalidated.

## Error Handling

### Invalid or Expired Token

If the reset token is invalid or expired:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired reset token"
  }
}
```

### Rate Limiting

If too many password reset requests are made:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many password reset requests. Please try again later."
  }
}
```

## Configuration

### Session Expiration

Sessions are configured to expire after 7 days:

```javascript
session: {
  expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
  updateAge: 60 * 60 * 24, // Update session every 24 hours
}
```

### Reset Token Expiration

Reset tokens expire after 1 hour:

```javascript
resetPassword: {
  expiresIn: 60 * 60, // 1 hour in seconds
}
```

## Troubleshooting

### Issue: User not redirected to login after password reset

**Solution:** Check that the frontend properly handles the success response and redirects to `/login`.

### Issue: Old session still works after password reset

**Solution:** This should not happen with Better Auth. If it does:
1. Verify Better Auth is properly configured
2. Check that the password reset endpoint is using Better Auth's handler
3. Ensure the database schema is correct

### Issue: User can't login after password reset

**Solution:** 
1. Verify the new password meets complexity requirements
2. Check that the password was actually updated in the database
3. Ensure there are no caching issues with the authentication system

## Best Practices

1. **Always redirect to login after password reset** - Don't automatically log the user in
2. **Show clear success messages** - Inform users they need to login with their new password
3. **Implement rate limiting** - Prevent abuse of the password reset endpoint
4. **Use secure reset tokens** - Better Auth handles this automatically
5. **Set appropriate token expiration** - 1 hour is a good balance between security and usability

## Related Documentation

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Email Service Setup](./EMAIL_VERIFICATION_SETUP.md)
- [Session Management](./SESSION_MANAGEMENT.md)
- [Security Best Practices](./SECURITY_BEST_PRACTICES.md)
