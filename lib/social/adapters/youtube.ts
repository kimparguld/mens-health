import "server-only";
import { env } from "@/env";
import { db } from "@/lib/db/prisma";
import { validatePlatformConstraints } from "@/lib/social/platform-rules";
import type { SocialPost } from "@prisma/client";
import type {
  PublishResult,
  SocialPublisher,
  ValidationResult,
} from "./publisher";

// ---------------------------------------------------------------------------
// YouTube Data API v3 — Community Posts ("Gör inlägg")
// ---------------------------------------------------------------------------

type YouTubeTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = env.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = env.YOUTUBE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "YOUTUBE_OAUTH_CLIENT_ID and YOUTUBE_OAUTH_CLIENT_SECRET must be set",
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as YouTubeTokenResponse;
  return data.access_token;
}

async function getValidAccessToken(): Promise<string> {
  const account = await db.socialAccount.findUnique({
    where: { platform: "YOUTUBE_COMMUNITY" },
  });

  if (!account) {
    throw new Error(
      "No YouTube account connected. Connect via /admin/social/youtube/connect.",
    );
  }

  const isExpired = !account.tokenExpiry || account.tokenExpiry <= new Date();

  if (!isExpired) {
    return account.accessToken;
  }

  if (!account.refreshToken) {
    throw new Error("YouTube token expired and no refresh token stored.");
  }

  const newToken = await refreshAccessToken(account.refreshToken);

  // Update stored token
  await db.socialAccount.update({
    where: { platform: "YOUTUBE_COMMUNITY" },
    data: {
      accessToken: newToken,
      tokenExpiry: new Date(Date.now() + 3600 * 1000),
    },
  });

  return newToken;
}

// ---------------------------------------------------------------------------
// Community Post creation via YouTube Data API v3 posts.insert
// ---------------------------------------------------------------------------

type YouTubeCommunityPostResource = {
  kind: string;
  etag: string;
  id: string;
};

async function createCommunityPost(
  accessToken: string,
  text: string,
): Promise<YouTubeCommunityPostResource> {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/posts?part=id,snippet",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        snippet: {
          text,
          type: "textPost",
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `YouTube community post failed: ${res.status} ${res.statusText} — ${body}`,
    );
  }

  return (await res.json()) as YouTubeCommunityPostResource;
}

// ---------------------------------------------------------------------------
// Adapter implementation
// ---------------------------------------------------------------------------

export class YouTubeCommunityAdapter implements SocialPublisher {
  readonly platform = "YOUTUBE_COMMUNITY" as const;

  async validate(post: SocialPost): Promise<ValidationResult> {
    const errors = validatePlatformConstraints("YOUTUBE_COMMUNITY", {
      caption: post.caption,
      hashtags: post.hashtags,
      script: post.script,
      hook: post.hook,
    });
    if (errors.length > 0) return { ok: false, errors };
    if (post.status !== "APPROVED") {
      return {
        ok: false,
        errors: ["Post must be APPROVED before publishing"],
      };
    }
    return { ok: true };
  }

  /**
   * Publish a community post to the connected YouTube channel.
   *
   * The post body is composed from the hook, caption, hashtags, and UTM URL.
   * No video file is required.
   */
  async publish(post: SocialPost): Promise<PublishResult> {
    const validation = await this.validate(post);
    if (!validation.ok) {
      return {
        ok: false,
        errorCode: "VALIDATION_FAILED",
        errorMsg: validation.errors.join("; "),
      };
    }

    const hashtags = post.hashtags
      .map((h) => (h.startsWith("#") ? h : `#${h}`))
      .join(" ");
    const postText = [
      post.hook,
      "",
      post.caption,
      "",
      hashtags,
      "",
      post.utmUrl,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const accessToken = await getValidAccessToken();
      const resource = await createCommunityPost(accessToken, postText);

      const platformPostId = resource.id;
      const platformUrl = `https://www.youtube.com/@MenHealthDigest/community`;

      return { ok: true, platformPostId, platformUrl };
    } catch (err) {
      return {
        ok: false,
        errorCode: "PUBLISH_ERROR",
        errorMsg: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * YouTube community posts have no draft API.
   * Delegates to publish() — the post is live immediately.
   */
  async createDraft(post: SocialPost): Promise<PublishResult> {
    return this.publish(post);
  }
}
