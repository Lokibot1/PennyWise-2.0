// @ts-nocheck
import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";

const GMAIL_USER         = Deno.env.get("GMAIL_USER")!;
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")!;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url   = new URL(req.url);
    const email = url.searchParams.get("email") ?? "";
    const name  = url.searchParams.get("name")  ?? "";

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userName  = name || email.split("@")[0];
    const changedAt = new Date().toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "short",
    });

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    await client.send({
      from:    `PennyWise <${GMAIL_USER}>`,
      to:      email,
      subject: "Your PennyWise password was changed",
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

                    <!-- Header -->
                    <tr>
                      <td style="background:#1B7A4A;padding:32px 40px;text-align:center;">
                        <p style="margin:0;font-size:26px;font-weight:900;
                                  color:#ffffff;letter-spacing:1px;">PennyWise</p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding:36px 40px 24px;">
                        <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1A1A1A;">
                          Password Changed
                        </p>
                        <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;">
                          Hi ${userName},
                        </p>
                        <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;">
                          Your PennyWise account password was successfully changed on
                          <strong>${changedAt}</strong>.
                        </p>

                        <!-- Info box -->
                        <table width="100%" cellpadding="0" cellspacing="0"
                          style="background:#F0FAF6;border-radius:10px;margin-bottom:24px;">
                          <tr>
                            <td style="padding:16px 20px;">
                              <p style="margin:0;font-size:13px;color:#1B7A4A;font-weight:600;">
                                &#128274; Security notice
                              </p>
                              <p style="margin:6px 0 0;font-size:13px;color:#555;line-height:1.5;">
                                If you made this change, no further action is needed.
                                Your previous password can no longer be used to access your account.
                              </p>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;">
                          If you did <strong>not</strong> make this change, please contact our
                          support team immediately and secure your account.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding:16px 40px 32px;border-top:1px solid #E8F5EF;">
                        <p style="margin:0;font-size:12px;color:#9AA5B4;text-align:center;">
                          This is an automated security notification from PennyWise.<br/>
                          Please do not reply to this email.
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

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-password-changed-email] error:", String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
