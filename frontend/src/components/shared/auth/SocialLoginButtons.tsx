/**
 * FR7: Enhanced Social Login Buttons
 * REQUIREMENT: SSO/Social Login (OAuth2, Google, Facebook)
 */

import React, { memo, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authApi, apiClient } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '@/utils/errorMessages';

interface SocialLoginButtonsProps {
  role?: string;
  onRequires2FA?: (userId: string) => void;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = memo(({ role = 'user', onRequires2FA }) => {
  const { handleOAuthLogin } = useAuth();
  const navigate = useNavigate();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google OAuth script
  useEffect(() => {
    const loadGoogleScript = () => {
      if (window.google) return; // Already loaded

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    };

    loadGoogleScript();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);

      // Check if client ID is configured
      // NOTE: Must match the backend GOOGLE_CLIENT_ID exactly
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '317256520378-35gg7hh4a755ggpig09jidpc8kkhll22.apps.googleusercontent.com';

      // Create Google OAuth URL
      const baseUrl = window.location.origin;
      const redirectUriStr = `${baseUrl}/auth/google/callback`;
      
      console.log('Google Auth Debug:', {
        clientId,
        redirectUri: redirectUriStr,
        origin: window.location.origin
      });

      // WORKAROUND: Use manual popup instead of Google's library
      // This bypasses the strict origin checking for development

      const width = 500;
      const height = 600;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      const popup = window.open(
        'about:blank',
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      const redirectUri = encodeURIComponent(redirectUriStr);
      const scope = encodeURIComponent('openid email profile');
      const state = encodeURIComponent(JSON.stringify({ returnUrl: window.location.pathname }));

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${scope}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${state}`;

      popup.location.href = authUrl;

      // Create BroadcastChannel for robust communication (fixes window.opener issues)
      const channel = new BroadcastChannel('google_auth_channel');

      const handleAuthCode = async (code: string) => {
        // Cleanup
        window.removeEventListener('message', handleMessage);
        channel.close();
        if (popup && !popup.closed) popup.close();

        if (!code) {
           setError('No authorization code received.');
           setIsGoogleLoading(false);
           return;
        }

        // Send code to backend
        try {
          // Use the configured API base URL instead of hardcoded localhost
          const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
          const response = await fetch(`${apiBase}/auth/google/callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              code,
              redirectUri: redirectUriStr,
              role: role // Pass the selected role to the backend
            }),
          });

          const result = await response.json();

          if (result.success) {
            // Check for 2FA requirement
            if (result.requires2FA) {
              if (onRequires2FA) {
                onRequires2FA(result.data.userId);
              }
              setIsGoogleLoading(false);
              return;
            }

            // Login successful - use the OAuth login handler
            await handleOAuthLogin(result.data);

            // If user is new or missing chapter, trigger profile completion popup
            const user = result.data.user;
            if (user && (user.isNewUser || !user.chapter)) {
              localStorage.setItem('show_profile_completion', 'true');
              // Redirect to complete profile page to allow role/chapter selection
              navigate('/complete-profile');
              return;
            }

            // Redirect to generic dashboard; DynamicDashboard will route by role
            navigate('/dashboard');
          } else {
            console.error('Backend authentication failed:', result.message);
            setError(result.message || 'Authentication failed on server.');
          }
        } catch (backendError) {
          console.error('Backend error:', backendError);
          const errorMessage = extractErrorMessage(backendError);
          setError(errorMessage);
        } finally {
          setIsGoogleLoading(false);
        }
      };

      const handleAuthError = (errorMsg: string) => {
         window.removeEventListener('message', handleMessage);
         channel.close();
         if (popup && !popup.closed) popup.close();
         setError(errorMsg || 'Google login failed.');
         setIsGoogleLoading(false);
      };

      // Listen for message from popup (postMessage)
      const handleMessage = async (event: MessageEvent) => {
        // Verify origin matches
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === 'GOOGLE_AUTH_CODE') {
          handleAuthCode(event.data.code);
        } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
          handleAuthError(event.data.error);
        }
      };

      // Listen for message from BroadcastChannel
      channel.onmessage = (event) => {
        if (event.data?.type === 'GOOGLE_AUTH_CODE') {
          handleAuthCode(event.data.code);
        } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
          handleAuthError(event.data.error);
        }
      };

      window.addEventListener('message', handleMessage);
      // Removed popup close polling to avoid COOP-related errors; rely on BroadcastChannel

    } catch (error: any) {
      console.error('Google login failed:', error);
      setError(error.message || 'Google login failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setIsFacebookLoading(true);
      setError(null);

      // Check if Facebook app ID is configured
      const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
      if (!appId) {
        throw new Error('Facebook login not configured. Please contact administrator.');
      }

      // Initialize Facebook SDK if not already done
      if (!window.FB) {
        // Load Facebook SDK
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        document.body.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });

        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
      }

      // Trigger Facebook login
      window.FB.login((response: any) => {
        if (response.authResponse) {
          // Get user info
          window.FB.api('/me', { fields: 'id,name,email,picture.width(400).height(400)' }, async (userInfo: any) => {
            try {
              const facebookData = {
                facebookId: userInfo.id,
                email: userInfo.email || `${userInfo.id}@facebook.com`,
                firstName: userInfo.name?.split(' ')[0] || '',
                lastName: userInfo.name?.split(' ').slice(1).join(' ') || '',
                profilePicture: userInfo.picture?.data?.url
              };

              // Send to backend using auth context method
              // Note: We don't have a specific Facebook login method in context, so we'll use a generic approach
              // For now, show a message that Facebook login is not fully implemented
              throw new Error('Facebook login is currently under development. Please use email registration instead.');

              // Navigate to dashboard
              navigate('/dashboard');
            } catch (err: any) {
              console.error('Facebook login error:', err);
              setError(err.message || 'Facebook login failed');
            } finally {
              setIsFacebookLoading(false);
            }
          });
        } else {
          setError('Facebook login cancelled');
          setIsFacebookLoading(false);
        }
      }, { scope: 'email,public_profile' });

    } catch (error: any) {
      console.error('Facebook login failed:', error);
      setError(error.message || 'Facebook login failed. Please try again.');
      setIsFacebookLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Responsive grid: 1 column mobile, 2 columns tablet, 3 columns desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Social login options">
        {/* Hidden Google button container */}
        <div id="google-signin-button" className="hidden"></div>
        {/* Google Login (REQUIREMENT: Google OAuth) */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="group relative w-full inline-flex justify-center items-center min-h-[44px] py-3 px-4 border-2 border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:shadow-sm disabled:active:scale-100"
          aria-label="Sign in with Google"
        >
          <svg className="w-5 h-5 sm:mr-2 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {/* Show text on tablet and desktop, hide on mobile */}
          <span className="hidden sm:inline">
            {isGoogleLoading ? 'Connecting...' : 'Google'}
          </span>
        </button>

        {/* Facebook Login (REQUIREMENT: Facebook OAuth) */}
        <button
          type="button"
          onClick={handleFacebookLogin}
          disabled={isFacebookLoading}
          className="group relative w-full inline-flex justify-center items-center min-h-[44px] py-3 px-4 border-2 border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:shadow-sm disabled:active:scale-100"
          aria-label="Sign in with Facebook"
        >
          <svg className="w-5 h-5 sm:mr-2 flex-shrink-0" fill="#1877F2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="hidden sm:inline">
            {isFacebookLoading ? 'Connecting...' : 'Facebook'}
          </span>
        </button>

      </div>
    </div>
  );
});

// Extend Window interface for TypeScript
declare global {
  interface Window {
    google?: any;
    FB?: any;
  }
}

SocialLoginButtons.displayName = 'SocialLoginButtons';

export default SocialLoginButtons;