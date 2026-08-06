// Welcome email template builder — sent once, immediately after a new
// newsletter signup. Mirrors the createDigestBuilder pattern in digest.ts:
// per-site brand copy is bound once, callers then just pass appUrl/unsubscribeUrl.

import { withNewsletterUtm } from "./digest";

export interface WelcomeEmailLink {
  label: string;
  path: string;
}

/** Per-site brand copy — a new site fills this in once (see the app's own welcome-config file). */
export interface WelcomeEmailBrandConfig {
  siteName: string;
  tagline: string;
  subject: string;
  welcomeCopy: string;
  cadenceCopy: string;
  highlightLinks: WelcomeEmailLink[];
  healthDisclaimer: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const WELCOME_CAMPAIGN = "welcome_email";

/**
 * Binds the welcome email builders to this site's brand copy once, so callers
 * keep calling `buildWelcomeHtml(...)`/`buildWelcomeText(...)` exactly the
 * same way regardless of site (see apps/menhealth/lib/newsletter/welcome.ts).
 */
export function createWelcomeEmailBuilder(brand: WelcomeEmailBrandConfig) {
  function buildWelcomeHtml(appUrl: string, unsubscribeUrl: string): string {
    const u = (path: string) =>
      escapeHtml(withNewsletterUtm(`${appUrl}${path}`, WELCOME_CAMPAIGN));

    const linksHtml = brand.highlightLinks
      .map(
        (link) => `
              <a href="${u(link.path)}"
                 style="display:inline-block;margin:4px 6px;padding:12px 18px;background:#f3f4f6;color:#111827;
                        font-size:16px;font-weight:600;text-decoration:none;border-radius:6px;">
                ${escapeHtml(link.label)}
              </a>`,
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(brand.siteName)}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#111827;padding:24px 32px;">
              <a href="${escapeHtml(withNewsletterUtm(appUrl, WELCOME_CAMPAIGN))}"
                 style="font-size:22px;font-weight:700;color:#ffffff;text-decoration:none;">
                ${escapeHtml(brand.siteName)}
              </a>
              <p style="margin:4px 0 0;font-size:15px;color:#9ca3af;">${escapeHtml(brand.tagline)}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 0 20px;">
                    <p style="margin:0;font-size:18px;color:#374151;line-height:1.7;">
                      ${escapeHtml(brand.welcomeCopy)}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;font-size:18px;color:#374151;line-height:1.7;">
                      ${escapeHtml(brand.cadenceCopy)}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px;text-align:center;">
                    ${linksHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td style="padding:16px 32px;background:#fefce8;border-top:1px solid #fef08a;">
              <p style="margin:0;font-size:15px;color:#854d0e;line-height:1.6;">
                ⚠️ <strong>Disclaimer:</strong> ${escapeHtml(brand.healthDisclaimer)}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:14px;color:#9ca3af;text-align:center;">
                You're receiving this because you subscribed at
                <a href="${escapeHtml(appUrl)}" style="color:#6b7280;">${escapeHtml(appUrl)}</a>.<br />
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  function buildWelcomeText(appUrl: string, unsubscribeUrl: string): string {
    const u = (path: string) =>
      withNewsletterUtm(`${appUrl}${path}`, WELCOME_CAMPAIGN);

    const lines = [
      `${brand.siteName.toUpperCase()} — ${brand.tagline}`,
      "=".repeat(55),
      "",
      brand.welcomeCopy,
      "",
      brand.cadenceCopy,
      "",
    ];

    for (const link of brand.highlightLinks) {
      lines.push(`${link.label}: ${u(link.path)}`);
    }
    lines.push("");
    lines.push(`DISCLAIMER: ${brand.healthDisclaimer}`);
    lines.push("");
    lines.push(`Unsubscribe: ${unsubscribeUrl}`);

    return lines.join("\n");
  }

  return { subject: brand.subject, buildWelcomeHtml, buildWelcomeText };
}
