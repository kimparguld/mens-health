import type { Platform } from "@prisma/client";

export type PlatformConstraints = {
  maxCaptionChars: number;
  maxHashtags: number;
  maxScriptWords: number;
  maxHookChars: number;
};

export const PLATFORM_CONSTRAINTS: Record<Platform, PlatformConstraints> = {
  YOUTUBE_COMMUNITY: {
    maxCaptionChars: 5000,
    maxHashtags: 15,
    maxScriptWords: 500,
    maxHookChars: 100,
  },
  TIKTOK: {
    maxCaptionChars: 2200,
    maxHashtags: 30,
    maxScriptWords: 200,
    maxHookChars: 100,
  },
  REDDIT: {
    maxCaptionChars: 40000,
    maxHashtags: 0,
    maxScriptWords: 500,
    maxHookChars: 300,
  },
  X: {
    maxCaptionChars: 280,
    maxHashtags: 3,
    maxScriptWords: 50,
    maxHookChars: 280,
  },
};

/**
 * Validate that generated content fits within platform constraints.
 */
export function validatePlatformConstraints(
  platform: Platform,
  content: {
    caption: string;
    hashtags: string[];
    script: string;
    hook: string;
  },
): Array<string> {
  const constraints = PLATFORM_CONSTRAINTS[platform];
  const errors: string[] = [];

  if (content.caption.length > constraints.maxCaptionChars) {
    errors.push(
      `Caption exceeds ${constraints.maxCaptionChars} chars for ${platform} (got ${content.caption.length})`,
    );
  }
  if (content.hashtags.length > constraints.maxHashtags) {
    errors.push(
      `Too many hashtags for ${platform}: max ${constraints.maxHashtags}, got ${content.hashtags.length}`,
    );
  }
  const wordCount = content.script.split(/\s+/).filter(Boolean).length;
  if (wordCount > constraints.maxScriptWords) {
    errors.push(
      `Script exceeds ${constraints.maxScriptWords} words for ${platform} (got ${wordCount})`,
    );
  }
  if (content.hook.length > constraints.maxHookChars) {
    errors.push(
      `Hook exceeds ${constraints.maxHookChars} chars for ${platform} (got ${content.hook.length})`,
    );
  }
  return errors;
}
