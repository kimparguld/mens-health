import "server-only";
import type { PrismaClient } from "@prisma/client";
import { validatePlatformConstraints } from "../platform-constraints";
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const X_MAX_CHARS = 280;

/**
 * The UTM link suffix buildTweetText will append — empty if the caption
 * already contains the link. Shared by validate() and buildTweetText so both
 * agree on what the final tweet text will actually look like.
 */
function getUrlSuffix(post: SocialPost): string {
  return post.caption.includes(post.utmUrl) ? "" : ` ${post.utmUrl}`;
}

/**
 * Build the final tweet text, truncating the caption if needed so the combined
 * caption + UTM URL always fits within X's 280-character limit.
 *
 * In practice this truncation branch should be unreachable: validate() now
 * rejects any post whose caption + link would exceed the limit before it can
 * reach publish(), which prevents required elements (e.g. the "Educational
 * only. Not medical advice." disclaimer) from being silently cut off. Kept
 * as a defensive fallback in case publish() is ever called without validate().
 */
function buildTweetText(post: SocialPost): string {
  const suffix = getUrlSuffix(post);
  const maxCaptionLen = X_MAX_CHARS - suffix.length;

  if (post.caption.length <= maxCaptionLen) {
    return post.caption + suffix;
  }

  // Truncate caption, reserving 1 char for the ellipsis character
  const truncated =
    post.caption.slice(0, maxCaptionLen - 1).trimEnd() + "…";
  return truncated + suffix;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export type XAdapterConfig = {
  clientId?: string;
  clientSecret?: string;
  /** Only required to call publish() — validate()/createDraft() don't need it. */
  db?: PrismaClient;
};

export class XAdapter implements SocialPublisher {
  readonly platform = "X" as const;

  constructor(private readonly config: XAdapterConfig = {}) {}

  private async getToken(): Promise<string> {
    if (!this.config.db) {
      throw new Error("XAdapter requires a `db` client to publish");
    }
    return getValidAccessToken(this.config.db, "X", {
      tokenUrl: "https://api.twitter.com/2/oauth2/token",
      clientId: this.config.clientId ?? "",
      clientSecret: this.config.clientSecret ?? "",
      // X requires Basic auth for token refresh
      authStyle: "basic",
    });
  }

  async validate(post: SocialPost): Promise<ValidationResult> {
    // Run all platform checks except the generic caption-length one — that
    // check only looks at the raw caption, but X's real limit applies to the
    // caption *plus* the UTM link buildTweetText will append. We replace it
    // with the check below so validate() (used at admin-review time) is what
    // catches over-length posts, not a silent truncation at publish time.
    const errors = validatePlatformConstraints("X", {
      caption: post.caption,
      hashtags: post.hashtags,
      script: post.script,
      hook: post.hook,
    }).filter((e) => !e.startsWith("Caption exceeds"));

    const combinedLength = post.caption.length + getUrlSuffix(post).length;
    if (combinedLength > X_MAX_CHARS) {
      errors.push(
        `Caption + link exceeds ${X_MAX_CHARS} chars for X (got ${combinedLength})`,
      );
    }

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

    if (!this.config.clientId || !this.config.clientSecret) {
      return {
        ok: false,
        errorCode: "NOT_CONFIGURED",
        errorMsg: "X_CLIENT_ID and X_CLIENT_SECRET must be set to publish",
      };
    }

    if (!this.config.db) {
      return {
        ok: false,
        errorCode: "NOT_CONFIGURED",
        errorMsg: "XAdapter requires a `db` client to publish",
      };
    }

    try {
      const accessToken = await this.getToken();

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
      const account = await this.config.db.socialAccount.findUnique({
        where: { platform: "X" },
      });
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
