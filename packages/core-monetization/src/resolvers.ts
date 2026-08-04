import { unstable_cache } from "next/cache";
import type { AffiliateLink, Sponsor } from "@prisma/client";

/**
 * Binds these resolvers to the site's own Prisma client once, so callers
 * keep calling `getActiveSponsor()`/`getAffiliateLinksForTopic(slug)`
 * exactly as before (see apps/menhealth/lib/monetization/resolvers.ts).
 */
export function createMonetizationResolvers(
  // Prisma's generated types carry generic branding tied to their own
  // generation, so a `Pick<PrismaClient, ...>` from one site's generated
  // client isn't satisfied by another site's — even for identical models.
  // `any` here is intentional; the explicit Promise<Sponsor | null> /
  // Promise<AffiliateLink[]> return types below keep callers fully typed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
) {
  /**
   * Returns the single active sponsor whose date window covers now.
   * Returns null if none is configured or all are outside their window.
   */
  const getActiveSponsor = unstable_cache(
    async (): Promise<Sponsor | null> => {
      const now = new Date();
      return db.sponsor.findFirst({
        where: {
          isActive: true,
          OR: [{ startDate: null }, { startDate: { lte: now } }],
          AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
        },
        orderBy: { createdAt: "desc" },
      });
    },
    ["active-sponsor"],
    { revalidate: 60, tags: ["sponsors"] },
  );

  /**
   * Returns all active affiliate links scoped to a topic (and generic ones
   * with no topicSlug). Pass null to get only generic links.
   */
  function getAffiliateLinksForTopic(
    topicSlug: string | null,
  ): Promise<AffiliateLink[]> {
    return unstable_cache(
      async () =>
        db.affiliateLink.findMany({
          where: {
            isActive: true,
            OR: [{ topicSlug: null }, ...(topicSlug ? [{ topicSlug }] : [])],
          },
          orderBy: { createdAt: "asc" },
        }),
      ["affiliate-links", topicSlug ?? ""],
      { revalidate: 3600, tags: ["affiliate-links"] },
    )();
  }

  return { getActiveSponsor, getAffiliateLinksForTopic };
}
