// Pure JSON-LD schema builders. No I/O — easily unit-tested.

export type VideoObjectInput = {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  publishedAt: Date;
  channelTitle: string;
  youtubeVideoId: string;
  appUrl: string;
  slug: string;
};

export function buildVideoObjectSchema(input: VideoObjectInput) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: input.title,
    description: input.description,
    thumbnailUrl: input.thumbnailUrl ?? undefined,
    uploadDate: input.publishedAt.toISOString(),
    publisher: {
      "@type": "Organization",
      name: input.channelTitle,
    },
    embedUrl: `https://www.youtube.com/embed/${input.youtubeVideoId}`,
    contentUrl: `https://www.youtube.com/watch?v=${input.youtubeVideoId}`,
    url: `${input.appUrl}/videos/${input.slug}`,
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
