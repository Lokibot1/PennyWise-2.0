/**
 * Call a Supabase Edge Function directly via fetch.
 * Pass accessToken to include an Authorization header for JWT-protected functions.
 * Returns { data, ok, status, rawError } — never throws.
 */
import { supabaseUrl } from '@/lib/supabase';

const FUNCTIONS_BASE = `${supabaseUrl}/functions/v1`;

export async function callFunction<T = Record<string, unknown>>(
  name: string,
  body: object,
  accessToken?: string,
): Promise<{ data: T | null; ok: boolean; status: number; rawError: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method: 'POST',
      headers,
      body:   JSON.stringify(body),
    });

    let data: T | null = null;
    try { data = await res.json(); } catch { /* non-JSON body */ }

    return { data, ok: res.ok, status: res.status, rawError: '' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, ok: false, status: 0, rawError: msg };
  }
}
