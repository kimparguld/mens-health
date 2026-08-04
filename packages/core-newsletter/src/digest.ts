// Newsletter digest template builders. All data (and brand copy) is passed
// in so this stays fully unit-testable and reusable by any site running the
// same "top video / checked claims / takeaway / overhyped claim" format.

export interface DigestClaim {
  claim: string;
  verdict: string;
  summary: string;
  slug: string;
}

export interface DigestVideo {
  title: string;
  slug: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  shortSummary: string | null;
  trendScore: number;
  checkedClaims?: DigestClaim[];
  practicalTakeaway?: string | null;
  overhypedClaim?: string | null;
}

export interface WeeklyDigestMeta {
  weeklySlug?: string;
  weeklyTitle?: string;
}

export interface DigestContent {
  subject: string;
  html: string;
  text: string;
}

/** Per-site brand copy — a new site fills this in once (see the app's own digest-config file). */
export type DigestBrandConfig = {
  siteName: string;
  tagline: string;
  introCopy: string;
  healthDisclaimer: string;
  subjects: {
    /** Used when 3+ claims were checked this week. */
    multiClaim: string;
    /** Used when 1–2 claims were checked this week. */
    singleClaim: string;
    /** Prefix before the top video's title when no claims were checked. */
    noClaimsFallbackPrefix: string;
    /** Used when there's neither a claim nor a top video to headline. */
    empty: string;
  };
};

export function withNewsletterUtm(
  url: string,
  campaign = "weekly_digest",
): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=newsletter&utm_medium=email&utm_campaign=${campaign}`;
}

function truncateSubject(value: string, maxLength = 80): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 1).trimEnd() + "…";
}

function verdictColor(verdict: string): string {
  const v = verdict.toLowerCase();
  if (v === "supported") return "#16a34a";
  if (v === "unsupported" || v === "false") return "#dc2626";
  return "#d97706"; // mixed / uncertain
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Binds the digest builders to this site's brand copy once, so callers keep
 * calling `buildDigestSubject(...)`/`buildDigestHtml(...)`/`buildDigestText(...)`
 * exactly as before (see apps/menhealth/lib/newsletter/digest.ts).
 */
export function createDigestBuilder(brand: DigestBrandConfig) {
  function buildDigestSubject(videos: DigestVideo[]): string {
    const totalClaims = videos.reduce(
      (sum, v) => sum + (v.checkedClaims?.length ?? 0),
      0,
    );

    if (totalClaims >= 3) {
      return truncateSubject(brand.subjects.multiClaim);
    }

    if (totalClaims >= 1) {
      return truncateSubject(brand.subjects.singleClaim);
    }

    const topVideo = videos[0];
    if (topVideo?.title) {
      return truncateSubject(
        `${brand.subjects.noClaimsFallbackPrefix}${topVideo.title}`,
      );
    }

    return brand.subjects.empty;
  }

  function buildDigestHtml(
    videos: DigestVideo[],
    appUrl: string,
    unsubscribeUrl: string,
    meta?: WeeklyDigestMeta,
  ): string {
    const campaign = meta?.weeklySlug
      ? `weekly_digest_${meta.weeklySlug}`
      : "weekly_digest";
    const weeklyPath = meta?.weeklySlug
      ? `/weekly/${meta.weeklySlug}`
      : "/weekly";

    // Builds an escaped href with UTM params for use in HTML attributes.
    const u = (path: string) =>
      escapeHtml(withNewsletterUtm(`${appUrl}${path}`, campaign));

    const topVideo = videos[0] ?? null;

    // --- Intro ---
    const introSection = `
          <!-- Intro -->
          <tr>
            <td style="padding:0 0 24px;">
              <p style="margin:0;font-size:16px;color:#374151;line-height:1.7;">
                ${brand.introCopy}
              </p>
            </td>
          </tr>`;

    // --- Section 1: Top video ---
    const topVideoSection = topVideo
      ? `
          <!-- Top video -->
          <tr>
            <td style="padding:0 0 24px;border-bottom:1px solid #f0f0f0;">
              <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">
                🎬 Top Video This Week
              </h2>
              ${
                topVideo.thumbnailUrl
                  ? `<img src="${escapeHtml(topVideo.thumbnailUrl)}" alt="" width="100%"
                      style="display:block;border-radius:6px;max-height:200px;object-fit:cover;margin-bottom:12px;" />`
                  : ""
              }
              <a href="${u(`/videos/${topVideo.slug}`)}"
                 style="font-size:20px;font-weight:700;color:#111827;text-decoration:none;line-height:1.4;">
                ${escapeHtml(topVideo.title)}
              </a>
              <p style="margin:4px 0 0;font-size:14px;color:#6b7280;">${escapeHtml(topVideo.channelTitle)}</p>
              ${
                topVideo.shortSummary
                  ? `<p style="margin:8px 0 0;font-size:16px;color:#374151;line-height:1.6;">${escapeHtml(topVideo.shortSummary)}</p>`
                  : ""
              }
              <a href="${u(`/videos/${topVideo.slug}`)}"
                 style="display:inline-block;margin-top:10px;font-size:15px;color:#2563eb;">
                Read the full summary →
              </a>
            </td>
          </tr>`
      : `
          <!-- Top video (fallback) -->
          <tr>
            <td style="padding:0 0 24px;border-bottom:1px solid #f0f0f0;">
              <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">
                🎬 Top Video This Week
              </h2>
              <p style="margin:0;font-size:16px;color:#374151;">
                No video was featured this week. Browse the latest on the
                <a href="${u(weeklyPath)}" style="color:#2563eb;">weekly digest</a>.
              </p>
            </td>
          </tr>`;

    // --- Section 2: 3 Claims Checked ---
    const allClaims = videos.flatMap((v) => v.checkedClaims ?? []).slice(0, 3);

    let claimsBody: string;
    if (allClaims.length === 0) {
      claimsBody = `<p style="margin:0;font-size:16px;color:#374151;">
        No claims were fully checked this week. Browse the latest
        <a href="${u("/rankings")}" style="color:#2563eb;">rankings</a> and
        <a href="${u("#topics")}" style="color:#2563eb;">topic pages</a> for new summaries.
      </p>`;
    } else {
      const claimRows = allClaims
        .map(
          (c) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f9fafb;">
                  <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:700;
                               background:${verdictColor(c.verdict)};color:#fff;margin-bottom:4px;">
                    ${escapeHtml(c.verdict)}
                  </span>
                  <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#111827;">
                    &ldquo;${escapeHtml(c.claim)}&rdquo;
                  </p>
                  <p style="margin:4px 0 0;font-size:15px;color:#374151;line-height:1.6;">
                    ${escapeHtml(c.summary)}
                  </p>
                  <a href="${u(`/claims/${c.slug}`)}"
                     style="font-size:14px;color:#2563eb;">
                    Read the claim breakdown →
                  </a>
                </td>
              </tr>`,
        )
        .join("");

      const shortfallRow =
        allClaims.length < 3
          ? `<tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">${allClaims.length} of 3 claims checked this week.</td></tr>`
          : "";

      claimsBody = `<table width="100%" cellpadding="0" cellspacing="0">${claimRows}${shortfallRow}</table>`;
    }

    const claimsSection = `
          <!-- Claims checked -->
          <tr>
            <td style="padding:24px 0;border-bottom:1px solid #f0f0f0;">
              <h2 style="margin:0 0 14px;font-size:14px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">
                🔍 3 Claims Checked
              </h2>
              ${claimsBody}
            </td>
          </tr>`;

    // --- Section 3: Practical takeaway ---
    const takeaway = topVideo?.practicalTakeaway ?? null;
    const takeawaySection = `
          <!-- Practical takeaway -->
          <tr>
            <td style="padding:20px 24px;border-bottom:1px solid #f0f0f0;background:#f0fdf4;border-radius:6px;">
              <h2 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em;">
                ✅ Practical Takeaway
              </h2>
              ${
                takeaway
                  ? `<p style="margin:0 0 8px;font-size:16px;color:#166534;line-height:1.6;">${escapeHtml(takeaway)}</p>
              <a href="${u(weeklyPath)}" style="font-size:14px;color:#166534;">
                Explore this week's digest →
              </a>`
                  : `<p style="margin:0;font-size:16px;color:#166534;line-height:1.6;">
                No practical takeaway was selected this week.
                <a href="${u("/weekly")}" style="color:#166534;">Read the latest weekly digest for more summaries</a>.
              </p>`
              }
            </td>
          </tr>`;

    // --- Section 4: Most overhyped claim ---
    const overhyped = topVideo?.overhypedClaim ?? null;
    const overhypedSection = `
          <!-- Overhyped claim -->
          <tr>
            <td style="padding:20px 24px;border-bottom:1px solid #f0f0f0;background:#fff7ed;border-radius:6px;">
              <h2 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:.05em;">
                🚨 Most Overhyped Claim This Week
              </h2>
              ${
                overhyped
                  ? `<p style="margin:0 0 8px;font-size:16px;color:#9a3412;line-height:1.6;">${escapeHtml(overhyped)}</p>
              <a href="${u("/claims")}" style="font-size:14px;color:#9a3412;">
                See more overhyped claims →
              </a>`
                  : `<p style="margin:0;font-size:16px;color:#9a3412;line-height:1.6;">No overhyped claim was selected this week.</p>`
              }
            </td>
          </tr>`;

    // --- Section 5: Explore More ---
    const linksSection = `
          <!-- Explore More -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <h2 style="margin:0 0 14px;font-size:14px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">
                📚 Explore More
              </h2>
              <a href="${u("/topics")}"
                 style="display:inline-block;margin:4px 6px;padding:10px 18px;background:#111827;color:#fff;
                        font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Topics
              </a>
              <a href="${u("/rankings")}"
                 style="display:inline-block;margin:4px 6px;padding:10px 18px;background:#f3f4f6;color:#111827;
                        font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Rankings
              </a>
              <a href="${u("/creators")}"
                 style="display:inline-block;margin:4px 6px;padding:10px 18px;background:#f3f4f6;color:#111827;
                        font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Creators
              </a>
              <a href="${u("/weekly")}"
                 style="display:inline-block;margin:4px 6px;padding:10px 18px;background:#f3f4f6;color:#111827;
                        font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                Weekly
              </a>
            </td>
          </tr>`;

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
              <a href="${escapeHtml(withNewsletterUtm(appUrl, campaign))}"
                 style="font-size:22px;font-weight:700;color:#ffffff;text-decoration:none;">
                ${escapeHtml(brand.siteName)}
              </a>
              <p style="margin:4px 0 0;font-size:14px;color:#9ca3af;">${escapeHtml(brand.tagline)}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${introSection}
                ${topVideoSection}
                ${claimsSection}
                ${takeawaySection}
                ${overhypedSection}
                ${linksSection}
              </table>
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td style="padding:16px 32px;background:#fefce8;border-top:1px solid #fef08a;">
              <p style="margin:0;font-size:13px;color:#854d0e;line-height:1.6;">
                ⚠️ <strong>Disclaimer:</strong> ${escapeHtml(brand.healthDisclaimer)}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
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

  function buildDigestText(
    videos: DigestVideo[],
    appUrl: string,
    unsubscribeUrl: string,
    meta?: WeeklyDigestMeta,
  ): string {
    const campaign = meta?.weeklySlug
      ? `weekly_digest_${meta.weeklySlug}`
      : "weekly_digest";
    const weeklyUrl = meta?.weeklySlug
      ? withNewsletterUtm(`${appUrl}/weekly/${meta.weeklySlug}`, campaign)
      : withNewsletterUtm(`${appUrl}/weekly`, campaign);
    const u = (path: string) => withNewsletterUtm(`${appUrl}${path}`, campaign);

    const topVideo = videos[0] ?? null;
    const lines = [
      `${brand.siteName.toUpperCase()} — ${brand.tagline}`,
      "=".repeat(55),
      "",
      brand.introCopy,
      "",
    ];

    // Section 1: Top video
    lines.push("🎬 TOP VIDEO THIS WEEK");
    lines.push("-".repeat(30));
    if (topVideo) {
      lines.push(topVideo.title);
      lines.push(`  ${topVideo.channelTitle}`);
      if (topVideo.shortSummary) lines.push(`  ${topVideo.shortSummary}`);
      lines.push(`  ${u(`/videos/${topVideo.slug}`)}`);
    } else {
      lines.push(
        "No video was featured this week. Browse the latest on the weekly digest.",
      );
      lines.push(`  ${weeklyUrl}`);
    }
    lines.push("");

    // Section 2: 3 Claims Checked
    const allClaims = videos.flatMap((v) => v.checkedClaims ?? []).slice(0, 3);
    lines.push("🔍 3 CLAIMS CHECKED");
    lines.push("-".repeat(30));
    if (allClaims.length === 0) {
      lines.push(
        "No claims were fully checked this week. Browse the latest rankings and topic pages for new summaries.",
      );
      lines.push(`  ${u("/rankings")}`);
    } else {
      for (const c of allClaims) {
        lines.push(`[${c.verdict.toUpperCase()}] "${c.claim}"`);
        lines.push(`  ${c.summary}`);
        lines.push(`  ${u(`/claims/${c.slug}`)}`);
        lines.push("");
      }
      if (allClaims.length < 3) {
        lines.push(`${allClaims.length} of 3 claims checked this week.`);
      }
    }
    lines.push("");

    // Section 3: Practical takeaway
    lines.push("✅ PRACTICAL TAKEAWAY");
    lines.push("-".repeat(30));
    if (topVideo?.practicalTakeaway) {
      lines.push(topVideo.practicalTakeaway);
      lines.push(`  ${weeklyUrl}`);
    } else {
      lines.push(
        "No practical takeaway was selected this week. Read the latest weekly digest for more summaries.",
      );
      lines.push(`  ${weeklyUrl}`);
    }
    lines.push("");

    // Section 4: Most overhyped claim
    lines.push("🚨 MOST OVERHYPED CLAIM THIS WEEK");
    lines.push("-".repeat(30));
    if (topVideo?.overhypedClaim) {
      lines.push(topVideo.overhypedClaim);
      lines.push(`  ${u("/claims")}`);
    } else {
      lines.push("No overhyped claim was selected this week.");
    }
    lines.push("");

    // Section 5: Explore More
    lines.push("📚 EXPLORE MORE");
    lines.push("-".repeat(30));
    lines.push(`Topics:   ${u("/topics")}`);
    lines.push(`Rankings: ${u("/rankings")}`);
    lines.push(`Creators: ${u("/creators")}`);
    lines.push(`Weekly:   ${weeklyUrl}`);
    lines.push("");
    lines.push(`DISCLAIMER: ${brand.healthDisclaimer}`);
    lines.push("");
    lines.push(`Unsubscribe: ${unsubscribeUrl}`);

    return lines.join("\n");
  }

  return { buildDigestSubject, buildDigestHtml, buildDigestText };
}
