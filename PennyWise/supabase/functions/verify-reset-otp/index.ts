// @ts-nocheck
// verify-reset-otp — Supabase Edge Function
// Validates the 6-digit OTP.  On success, generates a Supabase recovery link
// and returns its hashed_token so the app can exchange it for a session and
// then call supabase.auth.updateUser({ password }).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_ATTEMPTS  = 5;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type":                 "application/json",
};

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { email, otp } = await req.json();

    if (!email || !otp || typeof otp !== "string" || otp.length !== 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request." }),
        { status: 400, headers: CORS }
      );
    }

    const normalised = email.trim().toLowerCase();
    const supabase   = createClient(SUPABASE_URL, SERVICE_KEY);
    const now        = new Date().toISOString();

    // ── Fetch the latest active (unused, non-expired) OTP for this email ──────
    const { data: rows, error: fetchError } = await supabase
      .from("password_reset_otps")
      .select("id, otp_hash, expires_at, attempts")
      .eq("email", normalised)
      .eq("used", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("[verify-reset-otp] fetch error:", fetchError.message);
      return new Response(
        JSON.stringify({ success: false, error: "An error occurred. Please try again." }),
        { status: 500, headers: CORS }
      );
    }

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Code expired or not found. Please request a new one.", expired: true }),
        { status: 400, headers: CORS }
      );
    }

    const record = rows[0];

    // ── Check attempt limit ───────────────────────────────────────────────────
    if (record.attempts >= MAX_ATTEMPTS) {
      await supabase
        .from("password_reset_otps")
        .update({ used: true })
        .eq("id", record.id);
      return new Response(
        JSON.stringify({ success: false, error: "Too many attempts. Please request a new code.", expired: true }),
        { status: 400, headers: CORS }
      );
    }

    // ── Verify the OTP hash ───────────────────────────────────────────────────
    const providedHash = await sha256hex(otp.trim());
    const isMatch      = providedHash === record.otp_hash;

    if (!isMatch) {
      const newAttempts    = record.attempts + 1;
      const remaining      = MAX_ATTEMPTS - newAttempts;
      const shouldInvalidate = newAttempts >= MAX_ATTEMPTS;

      await supabase
        .from("password_reset_otps")
        .update({ attempts: newAttempts, used: shouldInvalidate })
        .eq("id", record.id);

      return new Response(
        JSON.stringify({
          success:   false,
          error:     remaining > 0
            ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
            : "Too many attempts. Please request a new code.",
          remaining,
          expired:   shouldInvalidate,
        }),
        { status: 400, headers: CORS }
      );
    }

    // ── OTP is valid — generate a Supabase recovery link ─────────────────────
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: linkData, error: linkError } = await (admin.auth.admin as any).generateLink({
      type:        "recovery",
      email:       normalised,
      options:     { redirectTo: "pennywise://reset-password" },
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[verify-reset-otp] generateLink error:", linkError?.message);
      // Mark OTP as used anyway to prevent re-use
      await supabase.from("password_reset_otps").update({ used: true }).eq("id", record.id);
      return new Response(
        JSON.stringify({ success: false, error: "Account not found. Please sign up." }),
        { status: 400, headers: CORS }
      );
    }

    // ── Mark OTP as used ─────────────────────────────────────────────────────
    await supabase.from("password_reset_otps").update({ used: true }).eq("id", record.id);

    return new Response(
      JSON.stringify({
        success:      true,
        hashedToken:  linkData.properties.hashed_token,
      }),
      { status: 200, headers: CORS }
    );

  } catch (err) {
    console.error("[verify-reset-otp] unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred. Please try again." }),
      { status: 500, headers: CORS }
    );
  }
});
