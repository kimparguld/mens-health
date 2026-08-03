export { evidenceLabelAndColor, buildBadgeSvg } from "./badge";
export type { BadgeInput } from "./badge";

export { submitUrlsToIndexNow } from "./indexnow";

export { createMetadataFactory } from "./metadata";
export type { SeoSiteConfig, CreateMetadataInput } from "./metadata";

export {
  secondsToIso8601Duration,
  buildVideoObjectSchema,
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildItemListSchema,
  buildWebSiteSchema,
  buildOrganizationSchema,
  buildDefinedTermSchema,
  buildDefinedTermSetSchema,
  buildPersonSchema,
} from "./json-ld";
export type {
  VideoObjectInput,
  ArticleInput,
  BreadcrumbItem,
  FaqEntry,
  ItemListEntry,
  PersonSchemaInput,
  DefinedTermInput,
  DefinedTermSetInput,
} from "./json-ld";
