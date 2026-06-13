/**
 * Enhanced Auth Page - Rebuilt with Clean Architecture
 *
 * Uses the new authentication system with proper separation of concerns.
 * Presentation logic only - business logic lives in use cases.
 */

import { SignIn, Envelope, Lock, Eye, EyeSlash, User } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';

import {
  registerUser,
  validateEmail,
  validateSignupPassword,
  validateDisplayName,
  validatePasswordMatch,
  requestPasswordReset,
  getErrorDisplayInfo,
  type RegisterUserInput,
} from '../../lib/auth';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

import { EmailVerificationStatus } from './EmailVerificationStatus';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'verify-email';

export function EnhancedAuthPage() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');

  const { addToast } = useToastStore();

  const resetForm = () => {
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
  };

  useEffect(() => {
    resetForm();
  }, []);

  // Clear password mismatch error when passwords match
  useEffect(() => {
    if (authMode === 'register' && password && confirmPassword && password === confirmPassword) {
      // Only clear the error if it's a password mismatch error
      if (error === 'Passwords do not match') {
        setError('');
      }
    }
  }, [password, confirmPassword, authMode, error]);

  // ========================================================================
  // PASSWORD LOGIN
  // ========================================================================

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Microsoft Enterprise pattern: Use auth store signIn
    const { signIn } = useAuthStore.getState();
    const { error: loginError } = await signIn(email, password);

    if (loginError) {
      const errorInfo = getErrorDisplayInfo(loginError.message);
      setError(errorInfo.message);
      setLoading(false);
    } else {
      addToast('Login successful!', 'success');
      setLoading(false);
      // Session is automatically set by auth store
    }
  };

  // ========================================================================
  // FORGOT PASSWORD
  // ========================================================================

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Invalid email');
      return;
    }

    setLoading(true);

    const result = await requestPasswordReset(email);

    if (result.success) {
      addToast('Password reset email sent! Check your inbox.', 'success');
      setAuthMode('login');
      resetForm();
      } else {
      setError(result.error || 'Failed to send reset email');
      }

      setLoading(false);
  };

  // ========================================================================
  // REGISTRATION
  // ========================================================================

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Invalid email');
      return;
    }

    const nameValidation = validateDisplayName(displayName);
    if (!nameValidation.valid) {
      setError(nameValidation.error || 'Invalid display name');
      return;
    }

    const passwordValidation = validateSignupPassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0] || 'Invalid password');
      return;
    }

    const matchValidation = validatePasswordMatch(password, confirmPassword);
    if (!matchValidation.valid) {
      setError(matchValidation.error || 'Passwords do not match');
      return;
    }

    setLoading(true);

    const input: RegisterUserInput = {
      email,
      password,
      confirmPassword,
      displayName,
    };

    const result = await registerUser(input);

    if (result.success) {
      addToast('Registration successful! Please check your email (including spam folder) to verify your account before logging in.', 'success');
      setAuthMode('login');
      resetForm();
    } else {
      const errorInfo = getErrorDisplayInfo(result.error || 'An unknown error occurred');
      setError(errorInfo.message);
    }

    setLoading(false);
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  // Fixed layer + overflow-y-auto: global index.html uses body overflow:hidden / height:100%,
  // which clips tall forms unless this route scrolls inside its own viewport.
  const authShellClass =
    'fixed inset-0 z-[200] overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';

  if (authMode === 'verify-email') {
    return (
      <div className={authShellClass} data-auth-page>
        <div className="flex min-h-full flex-col items-center justify-center p-4 py-10">
          <EmailVerificationStatus
            email={verificationEmail}
            onBack={() => {
              setAuthMode('login');
              setVerificationEmail('');
              resetForm();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={authShellClass} data-auth-page>
      <div className="flex min-h-full flex-col items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <SignIn className="w-8 h-8 text-white" weight="regular"/>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Trading Room</h1>
            <p className="text-slate-300">Professional live trading platform</p>
          </div>

          {authMode === 'login' && (
            <>
              <form onSubmit={handlePasswordLogin} className="space-y-5">
                <div>
                  <label htmlFor="password-login-email" className="block text-sm font-medium text-slate-200 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" weight="regular"/>
                    <input
                      id="password-login-email"
                      name="password-login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your@email.com"
                      required
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password-login-password" className="block text-sm font-medium text-slate-200 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" weight="regular"/>
                    <input
                      id="password-login-password"
                      name="password-login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeSlash className="w-5 h-5" weight="regular"/> : <Eye className="w-5 h-5" weight="regular"/>}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setAuthMode('forgot-password');
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center pt-2">
                <p className="text-sm text-slate-400">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setAuthMode('register');
                    }}
                    className="text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label htmlFor="register-display-name" className="block text-sm font-medium text-slate-200 mb-2">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" weight="regular"/>
                  <input
                    id="register-display-name"
                    name="register-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="How should we call you?"
                    required
                    disabled={loading}
                    maxLength={100}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-slate-200 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" weight="regular"/>
                  <input
                    id="register-email"
                    name="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-slate-200 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" weight="regular"/>
                  <input
                    id="register-password"
                    name="register-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Create a strong password"
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeSlash className="w-5 h-5" weight="regular"/> : <Eye className="w-5 h-5" weight="regular"/>}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  12+ characters with uppercase, lowercase, and numbers
                </p>
              </div>

              <div>
                <label htmlFor="register-confirm-password" className="block text-sm font-medium text-slate-200 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" weight="regular"/>
                  <input
                    id="register-confirm-password"
                    name="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm your password"
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeSlash className="w-5 h-5" weight="regular"/> : <Eye className="w-5 h-5" weight="regular"/>}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <div className="text-center">
                <p className="text-sm text-slate-400">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      resetForm();
                      setAuthMode('login');
                    }}
                    className="text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {authMode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label htmlFor="forgot-password-email" className="block text-sm font-medium text-slate-200 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" weight="regular"/>
                  <input
                    id="forgot-password-email"
                    name="forgot-password-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  We'll send you a password reset link
                </p>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setAuthMode('login');
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          <p>Check your email for verification and password-reset links</p>
        </div>
      </div>
      </div>
    </div>
  );
}