import { getSupabaseClient } from '../marketplace/supabaseClient';

export type SupabaseAuthResult =
  | { ok: true; email: string; name?: string }
  | { ok: false; error: string; needsEmailConfirmation?: boolean };

const getWebBaseUrl = (): string => {
  const configured = (import.meta.env.VITE_WEB_BASE_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return 'https://qudoro.com';
};

export const signInWithSupabase = async (email: string, password: string): Promise<SupabaseAuthResult> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: 'Supabase auth is not configured.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user?.email) {
    const message = error?.message || 'Invalid login credentials.';
    const needsEmailConfirmation = /email.*confirm/i.test(message);
    return { ok: false, error: message, needsEmailConfirmation };
  }

  const displayName =
    (data.user.user_metadata?.full_name as string | undefined) ||
    (data.user.user_metadata?.name as string | undefined);

  return { ok: true, email: data.user.email, name: displayName };
};

export const signUpWithSupabase = async (input: {
  email: string;
  password: string;
  name: string;
  field: string;
  country: string;
}): Promise<SupabaseAuthResult> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: 'Supabase auth is not configured.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${getWebBaseUrl()}/confirm-email`,
      data: {
        full_name: input.name,
        field: input.field,
        country: input.country,
      },
    },
  });

  if (error) {
    return { ok: false, error: error.message || 'Failed to create account.' };
  }

  // If email confirmation is enabled, session can be null right after sign-up.
  if (!data.session || !data.user?.email) {
    return {
      ok: false,
      error: 'Check your email to confirm your account, then sign in.',
      needsEmailConfirmation: true,
    };
  }

  const displayName =
    (data.user.user_metadata?.full_name as string | undefined) ||
    (data.user.user_metadata?.name as string | undefined) ||
    input.name;

  return { ok: true, email: data.user.email, name: displayName };
};

export const signOutSupabase = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
};

export const requestPasswordReset = async (email: string): Promise<{ ok: true } | { ok: false; error: string }> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: 'Supabase auth is not configured.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${getWebBaseUrl()}/reset-password`,
  });

  if (error) {
    return { ok: false, error: error.message || 'Unable to send reset email.' };
  }

  return { ok: true };
};
