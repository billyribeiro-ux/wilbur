import { Lock, Eye, EyeSlash } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '../../api/auth';
import { validateSignupPassword, validatePasswordMatch } from '../../lib/auth';
import { useToastStore } from '../../store/toastStore';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('Missing reset token. Open the link from your email.');
      return;
    }
    const pw = validateSignupPassword(password);
    if (!pw.valid) {
      setError(pw.errors[0] || 'Invalid password');
      return;
    }
    const match = validatePasswordMatch(password, confirm);
    if (!match.valid) {
      setError(match.error || 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      addToast('Password updated. Please sign in.', 'success');
      navigate('/auth', { replace: true });
    } catch (err) {
      const e = err as { error?: string };
      setError(e.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex min-h-full flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-white">Set a new password</h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          At least 12 characters with upper, lower, and a number.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="reset-password" className="mb-2 block text-sm font-medium text-slate-200">
              New password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                weight="regular"
              />
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 py-3 pl-11 pr-11 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="New password"
                required
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeSlash className="h-5 w-5" weight="regular" /> : <Eye className="h-5 w-5" weight="regular" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="reset-confirm" className="mb-2 block text-sm font-medium text-slate-200">
              Confirm password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                weight="regular"
              />
              <input
                id="reset-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(ev) => setConfirm(ev.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 py-3 pl-11 pr-4 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm password"
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-200">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-800"
          >
            {loading ? 'Saving...' : 'Update password'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/auth', { replace: true })}
            className="w-full rounded-lg bg-white/10 py-3 font-semibold text-white hover:bg-white/20"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
