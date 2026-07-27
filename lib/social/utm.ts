import type { Platform } from "@prisma/client";

type UtmParams = {
  source: string;
  medium: string;
  campaign: string;
};

const PLATFORM_UTM: Record<Platform, UtmParams> = {
  YOUTUBE_COMMUNITY: { source: "youtube", medium: "community", campaign: "" },
  TIKTOK: { source: "tiktok", medium: "video", campaign: "" },
  REDDIT: { source: "reddit", medium: "post", campaign: "" },
  X: { source: "x", medium: "post", campaign: "" },
};

export type UtmOptions = {
  platform: Platform;
  path: string;
  campaign: string;
  baseUrl?: string;
};

/**
 * Build a UTM-tagged URL for a social post.
 *
 * Example output:
 * https://www.menhealth-digest.com/videos/example?utm_source=youtube&utm_medium=shorts&utm_campaign=claim_check
 */
export function buildUtmUrl({
  platform,
  path,
  campaign,
  baseUrl = "https://www.menhealth-digest.com",
}: UtmOptions): string {
  const utm = PLATFORM_UTM[platform];
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, baseUrl);
  url.searchParams.set("utm_source", utm.source);
  url.searchParams.set("utm_medium", utm.medium);
  url.searchParams.set(
    "utm_campaign",
    campaign.toLowerCase().replace(/\s+/g, "_"),
  );
  return url.toString();
}
