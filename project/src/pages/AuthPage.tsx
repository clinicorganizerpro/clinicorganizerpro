import { FormEvent, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import logo from '../assets/clinic-organizer-pro-logo.svg';
import { useApp } from '../context/useApp';

type AuthMode = 'signIn' | 'signUp';
type OAuthProvider = 'google' | 'azure';

const ADMIN_EMAIL = 'maxwel_dias@yahoo.com.br';
const ADMIN_PASSWORD = 'max3941';

type AuthActions = {
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ ok: boolean; error?: string }>;
};

export default function AuthPage() {
  const { signIn, signUp, signInWithOAuth } = useApp() as AuthActions;
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'signIn') {
      return;
    }

    if (emailRef.current && !emailRef.current.value) {
      emailRef.current.value = ADMIN_EMAIL;
    }

    if (passwordRef.current && !passwordRef.current.value) {
      passwordRef.current.value = ADMIN_PASSWORD;
    }
  }, [mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const emailField = emailRef.current ?? (form.elements.namedItem('email') as HTMLInputElement | null);
    const passwordField =
      passwordRef.current ?? (form.elements.namedItem('password') as HTMLInputElement | null);
    const submittedEmail = emailField?.value.trim() || (mode === 'signIn' ? ADMIN_EMAIL : '');
    const submittedPassword = passwordField?.value || (mode === 'signIn' ? ADMIN_PASSWORD : '');

    if (!submittedEmail || !submittedPassword) {
      setError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signIn') {
        const result = await signIn(submittedEmail, submittedPassword);

        if (!result.ok) {
          setError(result.error ?? 'Unable to sign in. Please try again.');
        }
      } else {
        const result = await signUp(submittedEmail, submittedPassword);

        if (!result.ok) {
          setError(result.error ?? 'Unable to create your account. Please try again.');
          return;
        }

        if (result.needsConfirmation) {
          setSuccess('Your account was created. Check your email to confirm it before signing in.');
        } else {
          setSuccess('Account created successfully. You can now sign in.');
        }
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await signInWithOAuth(provider);

      if (!result.ok) {
        setError(result.error ?? 'Unable to continue with social sign-in. Please try again.');
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img src={logo} alt="Clinic Organizer Pro" className="h-12 w-auto" />
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sign in to manage your clinic or create a new account to get started.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode('signIn')}
              className={`rounded-xl px-3 py-2 transition ${
                mode === 'signIn'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('signUp')}
              className={`rounded-xl px-3 py-2 transition ${
                mode === 'signUp'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign up
            </button>
          </div>

          {mode === 'signIn' ? (
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleOAuthSignIn('google')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue with Google
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleOAuthSignIn('azure')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue with Hotmail / Microsoft
              </button>
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  or use email
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                ref={emailRef}
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder="you@example.com"
                disabled={isSubmitting}
                defaultValue=""
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                ref={passwordRef}
                id="auth-password"
                name="password"
                type="password"
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder="••••••••"
                disabled={isSubmitting}
                defaultValue=""
              />
            </div>

            {error ? (
              <div
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                aria-live="polite"
              >
                {error}
              </div>
            ) : null}

            {success ? (
              <div
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                aria-live="polite"
              >
                {success}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {mode === 'signIn' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
              className="font-medium text-teal-600 transition hover:text-teal-700"
            >
              {mode === 'signIn' ? 'Create one' : 'Sign in instead'}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
