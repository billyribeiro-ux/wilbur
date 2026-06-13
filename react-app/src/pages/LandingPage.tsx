import { Link } from 'react-router-dom';
import { SignIn } from '@phosphor-icons/react';

/**
 * Public landing — first screen for signed-out visitors.
 * (index.html only mounts #root; this is the actual home UI.)
 */
export function LandingPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-900/40">
          <SignIn className="h-10 w-10 text-white" weight="regular" aria-hidden />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Revolution Trading Room</h1>
        <p className="mb-2 max-w-xl text-lg text-slate-300">
          Real-time trading chat, alerts, and collaboration — built for professional trading rooms.
        </p>
        <p className="mb-10 max-w-md text-sm text-slate-400">
          Sign in to join a room and trade with your team.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/auth"
            className="inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-500"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
