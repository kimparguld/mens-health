// Pure functions for building the weekly digest email.
// No I/O — all data is passed in so this is fully unit-testable.

export interface DigestVideo {
  title: string;
  slug: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  shortSummary: string | null;
  trendScore: number;
}

export interface DigestContent {
  subject: string;
  html: string;
  text: string;
}

const HEALTH_DISCLAIMER =
  "This newsletter is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional before making health decisions.";

export function buildDigestSubject(videos: DigestVideo[]): string {
  const topVideo = videos[0];
  if (!topVideo) return "Your Weekly Men's Health Digest";
  return `This week: ${topVideo.title.slice(0, 60)}${topVideo.title.length > 60 ? "…" : ""} + ${videos.length - 1} more`;
}

export function buildDigestHtml(
  videos: DigestVideo[],
  appUrl: string,
  unsubscribeUrl: string,
): string {
  const videoRows = videos
    .map(
      (v) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #f0f0f0;">
        ${
          v.thumbnailUrl
            ? `<img src="${escapeHtml(v.thumbnailUrl)}" alt="" width="120" height="68"
                style="float:left;margin-right:16px;border-radius:4px;object-fit:cover;" />`
            : ""
        }
        <div style="overflow:hidden;">
          <a href="${escapeHtml(appUrl)}/videos/${escapeHtml(v.slug)}"
             style="font-size:15px;font-weight:600;color:#111827;text-decoration:none;line-height:1.4;">
            ${escapeHtml(v.title)}
          </a>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${escapeHtml(v.channelTitle)}</p>
          ${
            v.shortSummary
              ? `<p style="margin:6px 0 0;font-size:13px;color:#374151;line-height:1.5;">${escapeHtml(v.shortSummary)}</p>`
              : ""
          }
          <a href="${escapeHtml(appUrl)}/videos/${escapeHtml(v.slug)}"
             style="display:inline-block;margin-top:8px;font-size:12px;color:#2563eb;">
            Read full summary →
          </a>
        </div>
        <div style="clear:both;"></div>
      </td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>MenHealth Digest</title>
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
              <a href="${escapeHtml(appUrl)}"
                 style="font-size:20px;font-weight:700;color:#ffffff;text-decoration:none;">
                MenHealth Digest
              </a>
              <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">Your weekly men's health briefing</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px;font-size:14px;color:#374151;">
                Here are the top men's health videos this week, ranked by relevance and quality.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                ${videoRows}
              </table>

              <p style="margin:24px 0 0;text-align:center;">
                <a href="${escapeHtml(appUrl)}"
                   style="display:inline-block;padding:12px 24px;background:#111827;color:#ffffff;
                          font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
                  View all videos
                </a>
              </p>
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td style="padding:16px 32px;background:#fefce8;border-top:1px solid #fef08a;">
              <p style="margin:0;font-size:11px;color:#854d0e;line-height:1.6;">
                ⚠️ <strong>Health Disclaimer:</strong> ${escapeHtml(HEALTH_DISCLAIMER)}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
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

export function buildDigestText(
  videos: DigestVideo[],
  appUrl: string,
  unsubscribeUrl: string,
): string {
  const lines = [
    "MENHEALTH DIGEST — Your weekly men's health briefing",
    "=".repeat(55),
    "",
  ];

  for (const v of videos) {
    lines.push(`• ${v.title}`);
    lines.push(`  ${v.channelTitle}`);
    if (v.shortSummary) lines.push(`  ${v.shortSummary}`);
    lines.push(`  ${appUrl}/videos/${v.slug}`);
    lines.push("");
  }

  lines.push(`View all: ${appUrl}`);
  lines.push("");
  lines.push(`DISCLAIMER: ${HEALTH_DISCLAIMER}`);
  lines.push("");
  lines.push(`Unsubscribe: ${unsubscribeUrl}`);

  return lines.join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
