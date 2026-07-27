import "server-only";
import { env } from "@/env";
import { validatePlatformConstraints } from "@/lib/social/platform-rules";
import { getValidAccessToken } from "./refresh-token";
import type { SocialPost } from "@prisma/client";
import type {
  PublishResult,
  SocialPublisher,
  ValidationResult,
} from "./publisher";
import { z } from "zod";

// ---------------------------------------------------------------------------
// X (Twitter) API v2
// Docs: https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
// Rate limits: Basic tier required for regular posting (1 POST/day on Free tier)
// ---------------------------------------------------------------------------

const TweetResponse = z.object({
  data: z.object({
    id: z.string(),
    text: z.string(),
  }),
});

async function getToken(): Promise<string> {
  return getValidAccessToken("X", {
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    clientId: env.X_CLIENT_ID ?? "",
    clientSecret: env.X_CLIENT_SECRET ?? "",
    // X requires Basic auth for token refresh
    authStyle: "basic",
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the final tweet text, truncating the caption if needed so the combined
 * caption + UTM URL always fits within X's 280-character limit.
 */
function buildTweetText(post: SocialPost): string {
  const hasUrl = post.caption.includes(post.utmUrl);
  const suffix = hasUrl ? "" : ` ${post.utmUrl}`;
  const maxCaptionLen = 280 - suffix.length;

  if (post.caption.length <= maxCaptionLen) {
    return post.caption + suffix;
  }

  // Truncate caption, reserving 1 char for the ellipsis character
  const truncated =
    post.caption.slice(0, maxCaptionLen - 1).trimEnd() + "\u2026";
  return truncated + suffix;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class XAdapter implements SocialPublisher {
  readonly platform = "X" as const;

  async validate(post: SocialPost): Promise<ValidationResult> {
    // Run all platform checks except caption length — captions that are too
    // long are truncated automatically in buildTweetText rather than rejected.
    const errors = validatePlatformConstraints("X", {
      caption: post.caption,
      hashtags: post.hashtags,
      script: post.script,
      hook: post.hook,
    }).filter((e) => !e.startsWith("Caption exceeds"));

    if (errors.length > 0) return { ok: false, errors };

    return { ok: true };
  }

  async publish(post: SocialPost): Promise<PublishResult> {
    const validation = await this.validate(post);
    if (!validation.ok) {
      return {
        ok: false,
        errorCode: "VALIDATION_FAILED",
        errorMsg: validation.errors.join("; "),
      };
    }

    if (!env.X_CLIENT_ID || !env.X_CLIENT_SECRET) {
      return {
        ok: false,
        errorCode: "NOT_CONFIGURED",
        errorMsg: "X_CLIENT_ID and X_CLIENT_SECRET must be set to publish",
      };
    }

    try {
      const accessToken = await getToken();

      const tweetText = buildTweetText(post);

      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: tweetText }),
      });

      const responseText = await res.text();

      if (!res.ok) {
        return {
          ok: false,
          errorCode: `X_${res.status}`,
          errorMsg: `X API error ${res.status}: ${responseText}`,
        };
      }

      let responseJson: unknown;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        return {
          ok: false,
          errorCode: "X_INVALID_RESPONSE",
          errorMsg: `X API returned non-JSON response: ${responseText}`,
        };
      }

      const parsed = TweetResponse.safeParse(responseJson);
      if (!parsed.success) {
        return {
          ok: false,
          errorCode: "X_INVALID_RESPONSE",
          errorMsg: `X API returned an unexpected response shape: ${responseText}`,
        };
      }

      const tweetId = parsed.data.data.id;

      // Fetch the author's username from the stored handle to build the URL
      const account = await import("@/lib/db/prisma").then(({ db }) =>
        db.socialAccount.findUnique({ where: { platform: "X" } }),
      );
      const username = account?.handle?.replace("@", "") ?? "i";
      const platformUrl = `https://x.com/${username}/status/${tweetId}`;

      return { ok: true, platformPostId: tweetId, platformUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, errorCode: "X_ERROR", errorMsg: msg };
    }
  }

  async createDraft(_post: SocialPost): Promise<PublishResult> {
    // X API v2 has no draft endpoint
    return {
      ok: false,
      errorCode: "NOT_SUPPORTED",
      errorMsg: "X does not support remote draft creation via the API",
    };
  }
}
