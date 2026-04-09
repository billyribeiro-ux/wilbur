import { Spinner } from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '../../api/auth';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('err');
      setDetail('Missing verification token. Open the link from your email, or request a new verification email from sign-in help.');
      return;
    }

    let cancelled = false;
    authApi
      .verifyEmail(token)
      .then((res) => {
        if (!cancelled) {
          setStatus('ok');
          setDetail(res.message || 'Email verified. You can sign in.');
        }
      })
      .catch((e: { error?: string }) => {
        if (!cancelled) {
          setStatus('err');
          setDetail(e?.error || 'Verification failed. The link may have expired.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="fixed inset-0 z-[200] flex min-h-full flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Spinner label="Verifying your email..." />
          </div>
        )}
        {status === 'ok' && (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold text-white">Email verified</h1>
            <p className="text-slate-300">{detail}</p>
            <button
              type="button"
              onClick={() => navigate('/auth', { replace: true })}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Go to sign in
            </button>
          </div>
        )}
        {status === 'err' && (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold text-red-200">Verification failed</h1>
            <p className="text-slate-300">{detail}</p>
            <button
              type="button"
              onClick={() => navigate('/auth', { replace: true })}
              className="w-full rounded-lg bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600"
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
