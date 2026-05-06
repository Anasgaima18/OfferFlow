import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type AuthEmailTemplate = "verify_email" | "reset_password";

type Payload = {
  to: string;
  template: AuthEmailTemplate;
  token: string;
};

const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";
const appName = Deno.env.get("APP_NAME") ?? "OfferFlow";
const primaryColor = "#f59e0b";
const backgroundColor = "#0b0b0f";
const panelColor = "#12121a";
const textColor = "#e5e7eb";
const mutedColor = "#9ca3af";

function buildLink(template: AuthEmailTemplate, token: string): string {
  if (template === "verify_email") {
    return `${appUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
  }
  return `${appUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
}

function buildSubject(template: AuthEmailTemplate): string {
  return template === "verify_email" ? `Verify your ${appName} email` : `Reset your ${appName} password`;
}

function buildBody(template: AuthEmailTemplate, token: string): string {
  const action = template === "verify_email" ? "verify your email" : "reset your password";
  const link = buildLink(template, token);
  return `Use this link to ${action}: ${link}\n\nIf you did not request this, you can safely ignore this email.`;
}

function buildHtml(template: AuthEmailTemplate, token: string): string {
  const actionLabel = template === "verify_email" ? "Verify Email" : "Reset Password";
  const actionText = template === "verify_email"
    ? "Confirm your email to finish activating your account."
    : "You requested a password reset. Use the button below to continue.";
  const expiryText = template === "verify_email" ? "This link expires in 30 minutes." : "This link expires in 15 minutes.";
  const link = buildLink(template, token);

  return `
  <!doctype html>
  <html lang="en">
    <body style="margin:0;padding:0;background:${backgroundColor};font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:${textColor};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${backgroundColor};padding:32px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${panelColor};border:1px solid #23232f;border-radius:16px;overflow:hidden;">
              <tr>
                <td style="padding:28px 28px 12px;">
                  <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${primaryColor};font-weight:700;">${appName}</div>
                  <h1 style="margin:10px 0 8px;font-size:28px;line-height:1.2;color:${textColor};">${actionLabel}</h1>
                  <p style="margin:0;color:${mutedColor};font-size:14px;line-height:1.6;">${actionText}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 28px 0;">
                  <a href="${link}" style="display:inline-block;background:${primaryColor};color:#09090b;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:10px;">${actionLabel}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 28px 0;">
                  <p style="margin:0;color:${mutedColor};font-size:12px;line-height:1.7;">${expiryText}</p>
                  <p style="margin:10px 0 0;color:${mutedColor};font-size:12px;line-height:1.7;">If the button does not work, copy and paste this URL into your browser:</p>
                  <p style="margin:6px 0 0;word-break:break-all;"><a href="${link}" style="color:#c4b5fd;font-size:12px;">${link}</a></p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 28px 28px;">
                  <div style="height:1px;background:#23232f;margin-bottom:14px;"></div>
                  <p style="margin:0;color:${mutedColor};font-size:11px;line-height:1.7;">If you did not request this email, you can safely ignore it.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

Deno.serve(async (req: Request) => {
  try {
    const payload = (await req.json()) as Payload;
    if (!payload?.to || !payload?.token || !payload?.template) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400 });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("AUTH_MAIL_FROM") ?? "OfferFlow <noreply@offerflow.ai>";

    if (!resendKey) {
      // Safe no-op fallback so development keeps working without external mail.
      return new Response(
        JSON.stringify({
          success: true,
          mode: "noop",
          subject: buildSubject(payload.template),
          body: buildBody(payload.template, payload.token),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.to],
        subject: buildSubject(payload.template),
        text: buildBody(payload.template, payload.token),
        html: buildHtml(payload.template, payload.token),
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      return new Response(JSON.stringify({ error: "email_send_failed", details: errorText }), { status: 502 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "unexpected_error" }), { status: 500 });
  }
});
