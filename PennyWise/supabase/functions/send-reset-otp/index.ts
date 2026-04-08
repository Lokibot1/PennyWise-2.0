// @ts-nocheck
// send-reset-otp — Supabase Edge Function
// Generates a 6-digit OTP, stores its SHA-256 hash, and emails it via Gmail SMTP.
// Always returns HTTP 200 to prevent user-enumeration attacks.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient }   from "https://deno.land/x/denomailer/mod.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GMAIL_USER        = Deno.env.get("GMAIL_USER")!;
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")!;

const OTP_EXPIRY_MINUTES = 10;
const RATE_LIMIT_SECONDS = 60;
const MAX_OTP_PER_HOUR   = 5;

const corsHeaders = {
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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }

    const normalised = email.trim().toLowerCase();
    const supabase   = createClient(SUPABASE_URL, SERVICE_KEY);
    const now        = Date.now();

    // ── Rate limiting: hard cap per hour ─────────────────────────────────────
    const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const { count: hourCount } = await supabase
      .from("password_reset_otps")
      .select("*", { count: "exact", head: true })
      .eq("email", normalised)
      .gte("created_at", hourAgo);

    if ((hourCount ?? 0) >= MAX_OTP_PER_HOUR) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }

    // ── Rate limiting: minimum gap ────────────────────────────────────────────
    const recentCutoff = new Date(now - RATE_LIMIT_SECONDS * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("password_reset_otps")
      .select("*", { count: "exact", head: true })
      .eq("email", normalised)
      .gte("created_at", recentCutoff);

    if ((recentCount ?? 0) > 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Please wait before requesting another code.", rateLimited: true }),
        { status: 429, headers: corsHeaders }
      );
    }

    // ── Generate OTP ──────────────────────────────────────────────────────────
    const otpArray = new Uint32Array(1);
    crypto.getRandomValues(otpArray);
    const otp       = String(otpArray[0] % 1_000_000).padStart(6, "0");
    const otpHash   = await sha256hex(otp);
    const expiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // ── Invalidate prior active OTPs ──────────────────────────────────────────
    await supabase
      .from("password_reset_otps")
      .update({ used: true })
      .eq("email", normalised)
      .eq("used", false);

    // ── Store new OTP ─────────────────────────────────────────────────────────
    const { error: insertError } = await supabase
      .from("password_reset_otps")
      .insert({ email: normalised, otp_hash: otpHash, expires_at: expiresAt });

    if (insertError) {
      console.error("[send-reset-otp] insert error:", insertError.message);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }

    // ── Send email via Gmail SMTP ─────────────────────────────────────────────
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
      },
    });

    await client.send({
      from:    `PennyWise <${GMAIL_USER}>`,
      to:      normalised,
      subject: "Your PennyWise Password Reset Code",
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#F0FAF6;font-family:'Helvetica Neue',Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
              <tr>
                <td align="center">
                  <table width="480" cellpadding="0" cellspacing="0"
                    style="background:#ffffff;border-radius:16px;overflow:hidden;
                           box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                    <tr>
                      <td style="background:#1B7A4A;padding:32px 40px;text-align:center;">
                        <p style="margin:0;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:1px;">PennyWise</p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:36px 40px 24px;">
                        <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1A1A1A;">Password Reset Code</p>
                        <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;">
                          Use the code below to reset your PennyWise password.
                          It expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0"
                          style="background:#F0FAF6;border-radius:12px;margin-bottom:24px;">
                          <tr>
                            <td style="padding:28px;text-align:center;">
                              <p style="margin:0;font-size:42px;font-weight:700;letter-spacing:14px;color:#1B7A4A;">${otp}</p>
                            </td>
                          </tr>
                        </table>
                        <p style="margin:0;font-size:13px;color:#9AA5B4;line-height:1.5;">
                          If you didn't request this, you can safely ignore this email.
                          Your password will not be changed.
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:16px 40px 32px;border-top:1px solid #E8F5EF;">
                        <p style="margin:0;font-size:12px;color:#9AA5B4;text-align:center;">
                          This is an automated message from PennyWise. Please do not reply.
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error("[send-reset-otp] error:", String(err));
    // Still return success to prevent enumeration
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  }
});
