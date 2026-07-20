import { db } from "@/lib/db/prisma";
import type { AffiliateLink, Sponsor } from "@prisma/client";

/**
 * Returns the single active sponsor whose date window covers now.
 * Returns null if none is configured or all are outside their window.
 */
export async function getActiveSponsor(): Promise<Sponsor | null> {
  const now = new Date();
  return db.sponsor.findFirst({
    where: {
      isActive: true,
      OR: [{ startDate: null }, { startDate: { lte: now } }],
      AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Returns all active affiliate links scoped to a topic (and generic ones
 * with no topicSlug). Pass null to get only generic links.
 */
export async function getAffiliateLinksForTopic(
  topicSlug: string | null,
): Promise<AffiliateLink[]> {
  return db.affiliateLink.findMany({
    where: {
      isActive: true,
      OR: [{ topicSlug: null }, ...(topicSlug ? [{ topicSlug }] : [])],
    },
    orderBy: { createdAt: "asc" },
  });
}
