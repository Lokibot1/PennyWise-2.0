/**
 * Call a Supabase Edge Function directly via fetch.
 * Functions deployed with --no-verify-jwt need no Authorization header.
 * Returns { data, ok, status, rawError } — never throws.
 */
import { supabaseUrl } from '@/lib/supabase';

const FUNCTIONS_BASE = `${supabaseUrl}/functions/v1`;

export async function callFunction<T = Record<string, unknown>>(
  name: string,
  body: object,
): Promise<{ data: T | null; ok: boolean; status: number; rawError: string }> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    let data: T | null = null;
    try { data = await res.json(); } catch { /* non-JSON body */ }

    return { data, ok: res.ok, status: res.status, rawError: '' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, ok: false, status: 0, rawError: msg };
  }
}
