import { z } from "zod";

export const TopicSeedSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  query: z.string().min(1),
  isHighRisk: z.boolean(),
  description: z.string().min(1),
});

export const CreatorSeedSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  youtubeChannelId: z.string().min(1),
  description: z.string().min(1),
  specialty: z.string().min(1),
  credentials: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

export const ForbiddenPatternSchema = z.object({
  pattern: z.instanceof(RegExp),
  reason: z.string().min(1),
});

export const SiteConfigSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  domain: z.string().min(1),
  appUrl: z.string().url(),
  indexNowKey: z.string().min(1),
  topics: z.array(TopicSeedSchema).min(1),
  creators: z.array(CreatorSeedSchema),
  forbiddenContentPatterns: z.array(ForbiddenPatternSchema),
  highRiskTextPatterns: z.array(z.instanceof(RegExp)),
  highRiskTopicKeywords: z.array(z.string().min(1)),
});
