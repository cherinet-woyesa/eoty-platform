import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface EmailVerificationStatusProps {
  isVerified: boolean;
  userEmail?: string;
  showResendButton?: boolean;
}

const EmailVerificationStatus: React.FC<EmailVerificationStatusProps> = ({
  isVerified,
  userEmail,
  showResendButton = true,
}) => {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');

  const handleResendVerification = async () => {
    if (!userEmail) {
      setResendStatus('error');
      setResendMessage('Email address not available');
      return;
    }

    setIsResending(true);
    setResendStatus('idle');
    setResendMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setResendStatus('success');
        setResendMessage('Verification email sent! Please check your inbox.');
      } else {
        setResendStatus('error');
        setResendMessage(data.error?.message || 'Failed to send verification email.');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setResendStatus('error');
      setResendMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm font-medium">Email Verified</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start space-x-2">
        <svg
          className="w-5 h-5 text-yellow-600 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800">Email Not Verified</p>
          <p className="text-xs text-yellow-700 mt-1">
            Please verify your email address to access all features.
          </p>
        </div>
      </div>

      {resendStatus === 'success' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-800">{resendMessage}</p>
        </div>
      )}

      {resendStatus === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-800">{resendMessage}</p>
        </div>
      )}

      {showResendButton && (
        <div className="flex items-center space-x-3">
          <button
            onClick={handleResendVerification}
            disabled={isResending}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </button>
          <span className="text-gray-300">|</span>
          <Link
            to="/resend-verification"
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            Use Different Email
          </Link>
        </div>
      )}
    </div>
  );
};

export default EmailVerificationStatus;
