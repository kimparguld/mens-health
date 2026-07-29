// Pure RSS 2.0 XML builder. No I/O — easily unit-tested.

export type FeedItem = {
  title: string;
  link: string;
  guid: string;
  pubDate: Date;
  description: string;
  thumbnailUrl?: string | null;
};

export type FeedMeta = {
  title: string;
  description: string;
  link: string;
  language?: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildRssFeed(meta: FeedMeta, items: FeedItem[]): string {
  const itemsXml = items
    .map(
      (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      <description>${escapeXml(item.description)}</description>${
        item.thumbnailUrl
          ? `\n      <enclosure url="${escapeXml(item.thumbnailUrl)}" type="image/jpeg" />`
          : ""
      }
    </item>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${escapeXml(meta.link)}</link>
    <description>${escapeXml(meta.description)}</description>
    <language>${meta.language ?? "en-us"}</language>${itemsXml}
  </channel>
</rss>`;
}

// --- Video → feed item mapping ---

export type FeedVideo = {
  title: string;
  slug: string;
  publishedAt: Date;
  thumbnailUrl: string | null;
  shortSummary: string | null;
  channelTitle: string;
  riskLevel: string;
  evidenceScore: number | null;
};

function evidenceLabel(evidenceScore: number | null): string {
  if (evidenceScore == null) return "Not yet rated";
  if (evidenceScore >= 0.7) return "Strong evidence";
  if (evidenceScore >= 0.4) return "Mixed evidence";
  return "Weak evidence";
}

export function toFeedItem(video: FeedVideo, appUrl: string): FeedItem {
  const link = `${appUrl}/videos/${video.slug}`;
  const descriptionParts = [
    video.shortSummary,
    `Evidence: ${evidenceLabel(video.evidenceScore)}`,
    `Risk: ${video.riskLevel}`,
    `Creator: ${video.channelTitle}`,
  ].filter((part): part is string => Boolean(part));

  return {
    title: video.title,
    link,
    guid: link,
    pubDate: video.publishedAt,
    description: descriptionParts.join(" — "),
    thumbnailUrl: video.thumbnailUrl,
  };
}
