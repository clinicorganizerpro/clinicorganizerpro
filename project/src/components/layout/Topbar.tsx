import { useState } from 'react';
import { LogOut, MoonStar, SunMedium } from 'lucide-react';
import { useApp } from '../../context/useApp';

type TopbarState = {
  currentPageTitle?: string;
  activePageTitle?: string;
  pageTitle?: string;
  currentPageName?: string;
  theme?: 'light' | 'dark';
  toggleTheme?: () => void;
  signOut: () => Promise<void>;
};

export function Topbar() {
  const app = useApp() as TopbarState;
  const title =
    app.currentPageTitle ??
    app.activePageTitle ??
    app.pageTitle ??
    app.currentPageName ??
    'Clinic Organizer Pro';
  const theme = app.theme ?? 'light';
  const toggleTheme = app.toggleTheme;
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await app.signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex min-h-14 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {typeof toggleTheme === 'function' ? (
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <SunMedium className="h-4 w-4" />
              ) : (
                <MoonStar className="h-4 w-4" />
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{isSigningOut ? 'Signing out…' : 'Log out'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
