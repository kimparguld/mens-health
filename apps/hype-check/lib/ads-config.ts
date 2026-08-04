import { env } from "@/env";

// Resolves this site's AdSense config from env once, so the shared AdSlot/
// AdDisclosure UI components (packages/ui) never touch env/process.env
// directly — they just receive plain props.
export const adsConfig = {
  enabled: env.NEXT_PUBLIC_ADS_ENABLED === "true",
  clientId: env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
  slotIds: {
    "article-footer": env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_FOOTER,
    "between-content": env.NEXT_PUBLIC_ADSENSE_SLOT_BETWEEN_CONTENT,
    sidebar: env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR,
  },
} as const;
