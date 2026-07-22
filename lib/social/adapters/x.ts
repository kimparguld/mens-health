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
// Adapter
// ---------------------------------------------------------------------------

export class XAdapter implements SocialPublisher {
  readonly platform = "X" as const;

  async validate(post: SocialPost): Promise<ValidationResult> {
    const errors = validatePlatformConstraints("X", {
      caption: post.caption,
      hashtags: post.hashtags,
      script: post.script,
      hook: post.hook,
    });
    if (errors.length > 0) return { ok: false, errors };

    // For X, the tweet text is the caption. Check the combined length including
    // UTM URL if it's not already in the caption.
    const tweetText = post.caption.includes(post.utmUrl)
      ? post.caption
      : `${post.caption} ${post.utmUrl}`;

    if (tweetText.length > 280) {
      return {
        ok: false,
        errors: [
          `Tweet text exceeds 280 characters (got ${tweetText.length}). Shorten the caption to leave room for the UTM URL.`,
        ],
      };
    }

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

      const tweetText = post.caption.includes(post.utmUrl)
        ? post.caption
        : `${post.caption} ${post.utmUrl}`;

      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: tweetText }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return {
          ok: false,
          errorCode: `X_${res.status}`,
          errorMsg: `X API error ${res.status}: ${errorText}`,
        };
      }

      const parsed = TweetResponse.safeParse(await res.json());
      if (!parsed.success) {
        return {
          ok: false,
          errorCode: "X_INVALID_RESPONSE",
          errorMsg: "X API returned an unexpected response shape",
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
