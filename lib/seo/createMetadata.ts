import type { Metadata } from "next";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.menhealth-digest.com";

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
 * Generates consistent Next.js Metadata for every public page.
 * Produces: title, description, canonical, Open Graph, Twitter card.
 */
export function createMetadata({
  title,
  description,
  path,
  ogImage,
  type = "website",
  keywords,
  noIndex = false,
}: CreateMetadataInput): Metadata {
  const canonical = `${APP_URL}${path}`;
  // No `image` fallback here: when a page doesn't supply its own ogImage, we
  // omit `images` entirely so Next's app/opengraph-image.tsx file convention
  // (a real, generated image) applies instead of a hardcoded URL.
  const image = ogImage
    ? ogImage.startsWith("http")
      ? ogImage
      : `${APP_URL}${ogImage}`
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
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: title }] } : {}),
      siteName: "MenHealth Digest",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export function createCanonicalUrl(path: string): string {
  return `${APP_URL}${path}`;
}
