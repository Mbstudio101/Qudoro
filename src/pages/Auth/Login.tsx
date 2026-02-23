import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Logo } from '../../components/ui/Logo';
import AuthTitleBar from '../../components/AuthTitleBar';
import { motion } from 'framer-motion';
import { requestPasswordReset, signInWithSupabase } from '../../services/auth/supabaseAuth';
import Toast, { type ToastVariant } from '../../components/ui/Toast';

const REMEMBER_ME_KEY = 'qudoro-remember-me';
const REMEMBER_ME_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_GUARD_KEY = 'qudoro-login-guard-v1';
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;

type LoginGuardState = {
  attempts: number[];
  lockoutUntil: number;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const readLoginGuard = (email: string): LoginGuardState => {
  const defaultState: LoginGuardState = { attempts: [], lockoutUntil: 0 };
  try {
    const raw = localStorage.getItem(LOGIN_GUARD_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Record<string, LoginGuardState>;
    const key = normalizeEmail(email);
    const state = parsed[key];
    if (!state) return defaultState;
    const now = Date.now();
    return {
      attempts: state.attempts.filter((ts) => now - ts <= LOGIN_WINDOW_MS),
      lockoutUntil: state.lockoutUntil || 0,
    };
  } catch {
    return defaultState;
  }
};

const writeLoginGuard = (email: string, state: LoginGuardState) => {
  try {
    const raw = localStorage.getItem(LOGIN_GUARD_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, LoginGuardState>) : {};
    parsed[normalizeEmail(email)] = state;
    localStorage.setItem(LOGIN_GUARD_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage errors.
  }
};

const clearLoginGuard = (email: string) => {
  try {
    const raw = localStorage.getItem(LOGIN_GUARD_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, LoginGuardState>;
    delete parsed[normalizeEmail(email)];
    localStorage.setItem(LOGIN_GUARD_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage errors.
  }
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { restoreSession, authenticateWithSupabase } = useStore();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const [resetSending, setResetSending] = useState(false);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_ME_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { email: string; accountId: string; expiresAt: number };
      if (!parsed?.email || !parsed?.accountId || !parsed?.expiresAt || Date.now() > parsed.expiresAt) {
        localStorage.removeItem(REMEMBER_ME_KEY);
        return;
      }
      setFormData((prev) => ({ ...prev, email: parsed.email }));
      setRememberMe(true);
      const restored = restoreSession(parsed.accountId);
      if (restored) {
        navigate('/profiles');
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
    } catch {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  }, [navigate, restoreSession]);

  useEffect(() => {
    if (lockoutUntil <= Date.now()) return;
    const interval = window.setInterval(() => {
      if (Date.now() >= lockoutUntil) {
        setLockoutUntil(0);
      }
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [lockoutUntil]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('confirmed') === '1') {
      setToast({ message: 'Email confirmed. You can sign in now.', variant: 'success' });
    } else if (params.get('reset') === '1') {
      setToast({ message: 'Password updated. Sign in with your new password.', variant: 'success' });
    }
  }, [location.search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    const now = Date.now();
    const guard = readLoginGuard(formData.email);
    if (guard.lockoutUntil > now) {
      setLockoutUntil(guard.lockoutUntil);
      setError('Too many failed attempts. Please try again in a few minutes.');
      return;
    }
    
    const supabaseResult = await signInWithSupabase(formData.email, formData.password);

    if (supabaseResult.ok) {
      setToast(null);
      clearLoginGuard(formData.email);
      setLockoutUntil(0);
      authenticateWithSupabase({
        email: supabaseResult.email,
        name: supabaseResult.name,
      });
      if (rememberMe) {
        const accountId = useStore.getState().currentAccountId;
        if (accountId) {
        const payload = {
          email: formData.email,
          accountId,
          expiresAt: Date.now() + REMEMBER_ME_DURATION_MS,
        };
        localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(payload));
        }
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
      navigate('/profiles');
    } else {
      const nextAttempts = [...guard.attempts, now].filter((ts) => now - ts <= LOGIN_WINDOW_MS);
      const shouldLock = nextAttempts.length >= MAX_FAILED_LOGIN_ATTEMPTS;
      const nextState: LoginGuardState = {
        attempts: shouldLock ? [] : nextAttempts,
        lockoutUntil: shouldLock ? now + LOGIN_LOCKOUT_MS : 0,
      };
      writeLoginGuard(formData.email, nextState);
      if (nextState.lockoutUntil > now) {
        setLockoutUntil(nextState.lockoutUntil);
        setError('Too many failed attempts. Please try again in a few minutes.');
        return;
      }
      if (supabaseResult.needsEmailConfirmation) {
        setToast({
          message: 'Please confirm your email first. Check your inbox, then sign in again.',
          variant: 'info',
        });
        setError('');
      } else {
        setError(supabaseResult.error || 'Invalid email or password');
      }
    }
  };

  const handlePasswordReset = async () => {
    setResetError('');
    const email = formData.email.trim();
    if (!email) {
      setResetError('Enter your email to reset your password.');
      return;
    }
    setResetSending(true);
    const result = await requestPasswordReset(email);
    setResetSending(false);
    if (!result.ok) {
      setResetError(result.error);
      return;
    }
    setToast({
      message: 'Reset link sent. Check your inbox.',
      variant: 'info',
    });
  };

  const remainingLockoutSeconds = Math.max(0, Math.ceil((lockoutUntil - nowMs) / 1000));
  const isLocked = remainingLockoutSeconds > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
      <AuthTitleBar />
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center mb-4"
          >
            <Logo className="h-16 w-16" />
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="text-muted-foreground mt-2">
            Sign in to continue your progress
          </p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card border border-border rounded-xl p-8 shadow-sm"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Password</label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={handlePasswordReset}
                  disabled={resetSending}
                >
                  {resetSending ? 'Sending...' : 'Forgot password?'}
                </button>
              </div>
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me for 7 days
            </label>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            {resetError && (
              <p className="text-sm text-destructive text-center">{resetError}</p>
            )}
            {isLocked && (
              <p className="text-xs text-muted-foreground text-center">
                Login temporarily locked ({remainingLockoutSeconds}s)
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLocked}>
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
