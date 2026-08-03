import type { Metadata } from "next";

export type SeoSiteConfig = {
  appUrl: string;
  siteName: string;
};

export type CreateMetadataInput = {
  title: string;
  description: string;
  path: string;
  /** Relative or absolute URL for OG image */
  ogImage?: string;
  type?: "website" | "article";
  keywords?: string[];
  noIndex?: boolean;
};

/**
 * Binds the site's own appUrl/siteName once, so callers keep calling
 * `createMetadata({...})` exactly as before — the site config only has to
 * be threaded through in one place per app (see apps/menhealth/lib/seo/site-metadata.ts).
 */
export function createMetadataFactory(site: SeoSiteConfig) {
  function createCanonicalUrl(path: string): string {
    return `${site.appUrl}${path}`;
  }

  /**
   * Generates consistent Next.js Metadata for every public page.
   * Produces: title, description, canonical, Open Graph, Twitter card.
   */
  function createMetadata({
    title,
    description,
    path,
    ogImage,
    type = "website",
    keywords,
    noIndex = false,
  }: CreateMetadataInput): Metadata {
    const canonical = createCanonicalUrl(path);
    // No `image` fallback here: when a page doesn't supply its own ogImage, we
    // omit `images` entirely so Next's app/opengraph-image.tsx file convention
    // (a real, generated image) applies instead of a hardcoded URL.
    const image = ogImage
      ? ogImage.startsWith("http")
        ? ogImage
        : `${site.appUrl}${ogImage}`
      : null;

    return {
      title,
      description,
      ...(keywords ? { keywords } : {}),
      alternates: { canonical },
      ...(noIndex ? { robots: { index: false, follow: false } } : {}),
      openGraph: {
        title,
        description,
        url: canonical,
        type,
        ...(image
          ? { images: [{ url: image, width: 1200, height: 630, alt: title }] }
          : {}),
        siteName: site.siteName,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  }

  return { createMetadata, createCanonicalUrl };
}
