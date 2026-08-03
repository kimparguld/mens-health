// Pure JSON-LD schema builders. No I/O — easily unit-tested.

/** Formats whole seconds as an ISO 8601 duration (e.g. 330 -> "PT5M30S"), as required by schema.org's VideoObject.duration. */
export function secondsToIso8601Duration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `PT${hours > 0 ? `${hours}H` : ""}${minutes > 0 ? `${minutes}M` : ""}${remainingSeconds > 0 || (hours === 0 && minutes === 0) ? `${remainingSeconds}S` : ""}`;
}

export type VideoObjectInput = {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  publishedAt: Date | string;
  channelTitle: string;
  youtubeVideoId: string;
  appUrl: string;
  slug: string;
  durationSeconds?: number | null;
};

export function buildVideoObjectSchema(input: VideoObjectInput) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: input.title,
    description: input.description,
    thumbnailUrl: input.thumbnailUrl ?? undefined,
    uploadDate: new Date(input.publishedAt).toISOString(),
    duration:
      input.durationSeconds != null
        ? secondsToIso8601Duration(input.durationSeconds)
        : undefined,
    publisher: {
      "@type": "Organization",
      name: input.channelTitle,
    },
    embedUrl: `https://www.youtube.com/embed/${input.youtubeVideoId}`,
    contentUrl: `https://www.youtube.com/watch?v=${input.youtubeVideoId}`,
    url: `${input.appUrl}/videos/${input.slug}`,
  };
}

export type ArticleInput = {
  headline: string;
  description: string;
  imageUrl: string | null;
  publishedAt: Date | string;
  updatedAt: Date | string;
  authorName?: string;
  url: string;
  /** Falls back to this when authorName isn't set, and names the publisher. */
  siteName: string;
};

export function buildArticleSchema(input: ArticleInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    image: input.imageUrl ?? undefined,
    datePublished: new Date(input.publishedAt).toISOString(),
    dateModified: new Date(input.updatedAt).toISOString(),
    author: {
      "@type": "Organization",
      name: input.authorName ?? input.siteName,
    },
    publisher: {
      "@type": "Organization",
      name: input.siteName,
    },
    mainEntityOfPage: input.url,
    url: input.url,
  };
}

export type BreadcrumbItem = { name: string; url: string };

export function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export type FaqEntry = { question: string; answer: string };

export function buildFaqSchema(faqs: FaqEntry[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export type ItemListEntry = { name: string; url: string };

export function buildItemListSchema(
  name: string,
  items: ItemListEntry[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function buildWebSiteSchema(
  siteUrl: string,
  siteName: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
  };
}

export function buildOrganizationSchema(
  siteUrl: string,
  siteName: string,
  description: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/icon-192.png`,
    description,
  };
}

export type PersonSchemaInput = {
  name: string;
  description: string;
  url: string;
  credentials?: string;
  jobTitle?: string;
};

export type DefinedTermInput = {
  name: string;
  description: string;
  url: string;
  inDefinedTermSetUrl?: string;
};

export function buildDefinedTermSchema(
  input: DefinedTermInput,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: input.name,
    description: input.description,
    url: input.url,
    ...(input.inDefinedTermSetUrl
      ? { inDefinedTermSet: input.inDefinedTermSetUrl }
      : {}),
  };
}

export type DefinedTermSetInput = {
  name: string;
  url: string;
  terms: Array<{ name: string; description: string; url: string }>;
};

export function buildDefinedTermSetSchema(
  input: DefinedTermSetInput,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: input.name,
    url: input.url,
    hasDefinedTerm: input.terms.map((term) => ({
      "@type": "DefinedTerm",
      name: term.name,
      description: term.description,
      url: term.url,
    })),
  };
}

export function buildPersonSchema(
  input: PersonSchemaInput,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    description: input.description,
    url: input.url,
    ...(input.credentials ? { honorificSuffix: input.credentials } : {}),
    ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
  };
}
