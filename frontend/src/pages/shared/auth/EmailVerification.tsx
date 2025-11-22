import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { authApi } from '@/services/api';
import AuthLayout from '@/components/shared/auth/AuthLayout';
import FormError from '@/components/shared/auth/FormError';
import LoadingButton from '@/components/shared/auth/LoadingButton';
import { extractErrorMessage } from '@/utils/errorMessages';

const EmailVerification: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');
  const [userEmail, setUserEmail] = useState<string>('');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Verify email token on mount
  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setVerificationStatus('error');
        setError('Invalid verification link. Missing token.');
        return;
      }

      try {
        setIsLoading(true);
        const response = await authApi.verifyEmail(token);

        if (response.success) {
          setVerificationStatus('success');
          setSuccessMessage('Your email has been successfully verified! You can now sign in to your account.');
          setUserEmail(response.data?.email || email || '');

          // Auto-redirect after 3 seconds
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        } else {
          throw new Error(response.message || 'Email verification failed');
        }
      } catch (err: any) {
        console.error('Email verification error:', err);

        // Use the comprehensive error extraction utility
        const errorMessage = extractErrorMessage(err);

        // Handle specific status codes for UI state
        const status = err.response?.status;
        if (status === 400 || status === 410) {
          setVerificationStatus('expired');
        } else if (status === 409) {
          setVerificationStatus('success');
        } else {
          setVerificationStatus('error');
        }

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token, email, navigate]);

  const handleResendVerification = async () => {
    if (!userEmail && !email) {
      setError('No email address available. Please sign up again.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const emailToUse = userEmail || email || '';
      await authApi.resendVerificationEmail(emailToUse);

      setSuccessMessage(`A new verification email has been sent to ${emailToUse}. Please check your inbox.`);

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('Resend verification error:', err);

      // Use the comprehensive error extraction utility
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (verificationStatus) {
      case 'verifying':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your email</h2>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-6">{successMessage}</p>

            <div className="space-y-4">
              <Link
                to="/login"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Sign In Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        );

      case 'error':
      case 'expired':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {verificationStatus === 'expired' ? 'Verification Link Expired' : 'Verification Failed'}
            </h2>

            <div className="space-y-4">
              {error && (
                <FormError type="error" message={error} />
              )}

              {successMessage && (
                <FormError type="info" message={successMessage} />
              )}

              <div className="space-y-3">
                {(userEmail || email) && verificationStatus === 'expired' && (
                  <LoadingButton
                    onClick={handleResendVerification}
                    isLoading={isLoading}
                    loadingText="Sending..."
                    variant="primary"
                    size="md"
                    icon={!isLoading ? <RefreshCw className="w-4 h-4 mr-2" /> : undefined}
                  >
                    Send New Verification Email
                  </LoadingButton>
                )}

                <Link
                  to="/register"
                  className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  Back to Sign Up
                </Link>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AuthLayout
      title="Email Verification"
      subtitle="Please verify your email address to complete your account setup"
    >
      <div className="space-y-6">
        {renderContent()}

        {/* Help text */}
        <div className="text-center pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <Link
              to="/contact"
              className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default EmailVerification;
