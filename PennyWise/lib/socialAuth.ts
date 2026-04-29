import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

const REDIRECT = 'pennywise://';

async function signInWithProvider(
  provider: 'google' | 'facebook',
): Promise<{ error: string | null; cancelled: boolean }> {
  const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: REDIRECT, skipBrowserRedirect: true },
  });

  if (oauthError || !data.url) {
    return { error: oauthError?.message ?? 'Could not start sign-in.', cancelled: false };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { error: null, cancelled: true };
  }

  if (result.type !== 'success') {
    return { error: 'Sign-in was interrupted. Please try again.', cancelled: false };
  }

  const url = result.url;

  // On Android the Linking event can fire before openAuthSessionAsync returns,
  // meaning _layout.tsx may have already exchanged the code and set the session.
  const { data: { session: already } } = await supabase.auth.getSession();
  if (already) return { error: null, cancelled: false };

  // PKCE flow — Supabase v2 default for mobile
  const codeMatch = url.match(/[?&]code=([^&#]+)/);
  if (codeMatch) {
    const { error } = await supabase.auth.exchangeCodeForSession(
      decodeURIComponent(codeMatch[1]),
    );
    return { error: error?.message ?? null, cancelled: false };
  }

  // Implicit flow fallback
  const hashIdx = url.indexOf('#');
  if (hashIdx !== -1) {
    const params = new URLSearchParams(url.slice(hashIdx + 1));
    const access_token  = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      return { error: error?.message ?? null, cancelled: false };
    }
  }

  return { error: 'Sign-in failed. Please try again.', cancelled: false };
}

export const socialAuth = {
  google:   () => signInWithProvider('google'),
  facebook: () => signInWithProvider('facebook'),
};
