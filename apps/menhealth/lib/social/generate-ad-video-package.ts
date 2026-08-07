import { env } from '@/env';
import { aiClient } from '@/lib/ai/client';
import { db } from '@/lib/db/prisma';
import { SITE_NAME } from '@/lib/site-brand';
import { siteConfig } from '@/site.config';
import {
  createAdVideoPackageGenerator,
  type Result,
} from '@menhealth/core-social';
import { uploadToBlob } from './blob-storage';
import { FORBIDDEN_PATTERNS, HIGH_RISK_TOPIC_KEYWORDS } from './platform-rules';

const DEFAULT_ELEVENLABS_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
const blobReadWriteToken = env.BLOB_READ_WRITE_TOKEN;

const OFFER_COPY = [
  siteConfig.tagline,
  'Five summarized videos per issue',
  'Claim checks with practical takeaways',
  'Free access with one-click unsubscribe',
].join('. ');

function isAiConfigured(): boolean {
  return Boolean(
    env.ANTHROPIC_API_KEY ||
    env.GROQ_API_KEY ||
    env.OPENROUTER_API_KEY ||
    env.OPENAI_API_KEY ||
    env.GEMINI_API_KEY
  );
}

const generator =
  env.CREATOMATE_API_KEY && env.CREATOMATE_TEMPLATE_ID && blobReadWriteToken
    ? createAdVideoPackageGenerator({
        db,
        aiClient,
        aiConfigured: isAiConfigured(),
        siteName: SITE_NAME,
        offerCopy: OFFER_COPY,
        disclaimerLine: 'Educational only. Not medical advice.',
        utmUrl: `${env.NEXT_PUBLIC_APP_URL}/?utm_source=social&utm_medium=video&utm_campaign=site_promo_ad`,
        forbiddenPatterns: FORBIDDEN_PATTERNS,
        highRiskKeywords: HIGH_RISK_TOPIC_KEYWORDS,
        creatomateApiKey: env.CREATOMATE_API_KEY,
        creatomateTemplateId: env.CREATOMATE_TEMPLATE_ID,
        elevenLabsApiKey: env.ELEVENLABS_API_KEY,
        elevenLabsVoiceId: env.ELEVENLABS_API_KEY
          ? (env.ELEVENLABS_VOICE_ID ?? DEFAULT_ELEVENLABS_VOICE_ID)
          : undefined,
        uploadAsset: ({ pathname, body, contentType }) =>
          uploadToBlob({
            pathname,
            body,
            contentType,
            token: blobReadWriteToken,
          }),
      })
    : null;

function missingEnvError(): Error {
  return new Error(
    'Ad video package generation is not configured. Set CREATOMATE_API_KEY, CREATOMATE_TEMPLATE_ID, and BLOB_READ_WRITE_TOKEN. ELEVENLABS_API_KEY is optional.'
  );
}

export async function generateAdVideoPackage(): Promise<
  Result<{ packageId: string }>
> {
  if (!generator) {
    return { ok: false, error: missingEnvError() };
  }
  return generator.generateAdVideoPackage();
}

export async function pollRenderingPackages(): Promise<
  Result<{ checked: number; completed: number; failed: number }>
> {
  if (!generator) {
    return { ok: false, error: missingEnvError() };
  }
  return generator.pollRenderingPackages();
}
