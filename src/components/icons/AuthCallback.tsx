// AuthCallback.tsx — Auth callback handler

import { CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { authApi } from '../../api/auth';
import { useToastStore } from '../../store/toastStore';

type VerificationStatus = 'loading' | 'success' | 'error';

export function AuthCallback() {
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [email, setEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [countdown, setCountdown] = useState(3);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { addToast } = useToastStore();

  useEffect(() => {
    handleEmailVerification();
  }, []);

  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(Number(countdown) - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'success' && countdown === 0) {
      redirectToLogin();
      return undefined;
    }
    return undefined;
  }, [status, countdown]);

  const handleEmailVerification = async () => {
    try {
      // Get the hash from the URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      const errorParam = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      console.log('[AuthCallback] Processing verification:', { type, hasToken: !!accessToken, error: errorParam });

      // Check for errors in the URL
      if (errorParam) {
        console.error('[AuthCallback] Error in URL:', errorParam, errorDescription);
        setErrorMessage(errorDescription || errorParam || 'Verification failed');
        setStatus('error');
        addToast(errorDescription || 'Email verification failed', 'error');
        return;
      }

      // Check if this is an email verification callback
      if (type !== 'signup' && type !== 'email') {
        console.error('[AuthCallback] Invalid callback type:', type);
        setErrorMessage('Invalid verification link');
        setStatus('error');
        return;
      }

      if (!accessToken) {
        console.error('[AuthCallback] No access token in URL');
        setErrorMessage('Invalid verification link');
        setStatus('error');
        return;
      }

      // Use the authApi to get current user info
      const user = await authApi.me();

      if (!user) {
        console.error('[AuthCallback] No user found');
        setErrorMessage('No user found. Please try logging in.');
        setStatus('error');
        return;
      }

      console.log('[AuthCallback] User verified:', user.email);

      // Set user information
      setEmail(user.email || '');
      setDisplayName(user.display_name || '');

      setStatus('success');
      addToast('Email verified successfully!', 'success');

      // Sign out the user so they must log in with their credentials
      await authApi.logout();
      console.log('[AuthCallback] User signed out - must log in to access app');

    } catch (error) {
      console.error('[AuthCallback] Verification error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Verification failed');
      setStatus('error');
      addToast('Email verification failed', 'error');
    }
  };

  const redirectToLogin = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {status === 'loading' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verifying Your Email
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your email address...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email Verified Successfully!
              </h2>
              {email && (
                <p className="text-gray-600 mb-1">
                  {email}
                </p>
              )}
              {displayName && (
                <p className="text-gray-500 text-sm mb-4">
                  Welcome, {displayName}!
                </p>
              )}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">
                  Your account has been verified. You can now log in to access all features.
                </p>
              </div>
              <p className="text-gray-500 text-sm mb-6">
                Redirecting to login in {countdown} second{countdown !== 1 ? 's' : ''}...
              </p>
              <button
                onClick={redirectToLogin}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                Go to Login
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <XCircle className="w-16 h-16 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verification Failed
              </h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm">
                  {errorMessage || 'We could not verify your email address.'}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-gray-600 text-sm">
                  This could happen if:
                </p>
                <ul className="text-left text-gray-600 text-sm space-y-2 ml-6 list-disc">
                  <li>The verification link has expired</li>
                  <li>The link has already been used</li>
                  <li>The link is invalid or corrupted</li>
                </ul>
              </div>
              <button
                onClick={redirectToLogin}
                className="mt-6 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                Go to Login
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-gray-500 text-xs mt-4">
                If you continue to have issues, please contact support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
