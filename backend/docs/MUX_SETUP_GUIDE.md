# Mux Integration Setup Guide

## Overview

This guide covers the setup and configuration of Mux video integration for the EOTY platform.

## Prerequisites

- Node.js 16+ installed
- Mux account with API credentials
- Access to backend and frontend codebases

## Installation Status

### Backend Dependencies ✅
- `@mux/mux-node` v12.8.0 - **INSTALLED**

### Frontend Dependencies ✅
- `@mux/mux-player-react` v3.8.0 - **INSTALLED**
- `@mux/mux-uploader-react` v1.3.0 - **INSTALLED**

## Environment Configuration

### Required Environment Variables

Add the following to your `backend/.env` file:

```bash
# Mux Configuration
MUX_TOKEN_ID=your-mux-token-id-here
MUX_TOKEN_SECRET=your-mux-token-secret-here
MUX_WEBHOOK_SECRET=your-mux-webhook-secret-here
MUX_ENVIRONMENT=development
```

### Getting Mux Credentials

1. **Sign up for Mux**: Visit https://mux.com and create an account
2. **Create API Access Token**:
   - Go to Settings > Access Tokens
   - Click "Generate new token"
   - Select permissions: Mux Video (Full Access)
   - Copy the Token ID and Token Secret
3. **Create Webhook Secret**:
   - Go to Settings > Webhooks
   - Click "Create new webhook"
   - Enter your webhook URL: `https://your-domain.com/api/videos/mux/webhook`
   - Copy the Signing Secret

### Environment Files Updated

- ✅ `backend/.env` - Development configuration
- ✅ `backend/.env.example` - Template with placeholders
- ✅ `backend/.env.production.example` - Production template

## CORS Configuration

### Backend CORS Settings ✅

The following CORS settings have been configured in `backend/app.js`:

**Allowed Origins:**
- `http://localhost:3000` (Frontend dev)
- `http://localhost:5000` (Backend dev)
- `https://storage.googleapis.com` (Mux direct uploads)
- `https://mux.com` (Mux API)

**Allowed Methods:**
- GET, POST, PUT, DELETE, OPTIONS, PATCH

**Mux-Specific Headers:**
- `X-Mux-Signature`
- `Mux-Signature`

## Mux Configuration Module

A centralized configuration module has been created at `backend/config/mux.js`:

**Features:**
- Centralized Mux credentials
- CORS origin management
- Default playback policies
- Asset settings
- Signed URL expiration times
- Webhook event configuration
- Configuration validation

**Usage:**
```javascript
const muxConfig = require('./config/mux');

if (!muxConfig.isConfigured) {
  console.error('Mux is not properly configured');
}
```

## Next Steps

1. **Obtain Mux Credentials**: Sign up at https://mux.com and get your API credentials
2. **Update .env File**: Replace placeholder values with actual Mux credentials
3. **Verify Configuration**: Run the backend and check for Mux configuration warnings
4. **Proceed to Task 2**: Database schema updates for Mux integration

## Configuration Validation

The system will automatically validate Mux configuration on startup. If credentials are missing or contain placeholder values, you'll see a warning:

```
⚠️  Mux configuration incomplete. Missing or placeholder values for: tokenId, tokenSecret, webhookSecret
   Please update your .env file with valid Mux credentials.
```

## Security Notes

- **Never commit** `.env` files to version control
- Use **signed playback URLs** in production for private content
- Rotate API credentials regularly
- Verify webhook signatures to prevent unauthorized requests
- Use environment-specific credentials (dev vs production)

## Troubleshooting

### Issue: "Mux configuration incomplete" warning
**Solution**: Update your `.env` file with valid Mux credentials from your Mux dashboard

### Issue: CORS errors during direct upload
**Solution**: Verify that your frontend URL is included in the CORS origins list in `backend/app.js`

### Issue: Webhook signature verification fails
**Solution**: Ensure `MUX_WEBHOOK_SECRET` matches the signing secret from your Mux webhook configuration

## Resources

- [Mux Documentation](https://docs.mux.com/)
- [Mux Node SDK](https://github.com/muxinc/mux-node-sdk)
- [Mux Player React](https://github.com/muxinc/elements/tree/main/packages/mux-player-react)
- [Mux Uploader React](https://github.com/muxinc/elements/tree/main/packages/mux-uploader-react)
