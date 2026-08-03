import { env } from "@/env";
import { createMetadataFactory } from "@menhealth/core-seo";
import { SITE_NAME } from "@/lib/site-brand";

export const { createMetadata, createCanonicalUrl } = createMetadataFactory({
  appUrl: env.NEXT_PUBLIC_APP_URL,
  siteName: SITE_NAME,
});
