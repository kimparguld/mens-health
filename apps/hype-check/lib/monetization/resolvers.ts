import { db } from "@/lib/db/prisma";
import { createMonetizationResolvers } from "@menhealth/core-monetization";

export const { getActiveSponsor, getAffiliateLinksForTopic } =
  createMonetizationResolvers(db);
