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
// LinkedIn Posts API (v2, 2023-04 version)
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/posts-api
// ---------------------------------------------------------------------------

const UserInfoResponse = z.object({
  sub: z.string(),
});

const PostResponse = z.object({
  id: z.string(),
});

async function fetchPersonUrn(accessToken: string): Promise<string> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(
      `LinkedIn userinfo fetch failed: ${res.status} ${res.statusText}`,
    );
  }

  const parsed = UserInfoResponse.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error("LinkedIn userinfo response missing 'sub' field");
  }

  return `urn:li:person:${parsed.data.sub}`;
}

async function getToken(): Promise<string> {
  return getValidAccessToken("LINKEDIN", {
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    clientId: env.LINKEDIN_CLIENT_ID ?? "",
    clientSecret: env.LINKEDIN_CLIENT_SECRET ?? "",
    authStyle: "body",
  });
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class LinkedInAdapter implements SocialPublisher {
  readonly platform = "LINKEDIN" as const;

  async validate(post: SocialPost): Promise<ValidationResult> {
    const errors = validatePlatformConstraints("LINKEDIN", {
      caption: post.caption,
      hashtags: post.hashtags,
      script: post.script,
      hook: post.hook,
    });
    if (errors.length > 0) return { ok: false, errors };
    if (!post.utmUrl) {
      return { ok: false, errors: ["UTM URL is required for LinkedIn posts"] };
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

    if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET) {
      return {
        ok: false,
        errorCode: "NOT_CONFIGURED",
        errorMsg:
          "LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set to publish",
      };
    }

    try {
      const accessToken = await getToken();
      const authorUrn = await fetchPersonUrn(accessToken);

      // Compose post text: caption already contains hashtags from generation;
      // append the UTM URL on a new line if not already present.
      const text = post.caption.includes(post.utmUrl)
        ? post.caption
        : `${post.caption}\n\n${post.utmUrl}`;

      const body = {
        author: authorUrn,
        commentary: text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      };

      const res = await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202304",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return {
          ok: false,
          errorCode: `LINKEDIN_${res.status}`,
          errorMsg: `LinkedIn API error ${res.status}: ${errorText}`,
        };
      }

      // LinkedIn returns the post URN in the response body or X-RestLi-Id header
      const locationHeader = res.headers.get("X-RestLi-Id");
      const postId = locationHeader ?? `linkedin-post-${Date.now()}`;

      let parsedId = postId;
      try {
        const data = (await res.json()) as unknown;
        const p = PostResponse.safeParse(data);
        if (p.success) parsedId = p.data.id;
      } catch {
        // fall back to header value
      }

      const platformUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(parsedId)}`;

      return { ok: true, platformPostId: parsedId, platformUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, errorCode: "LINKEDIN_ERROR", errorMsg: msg };
    }
  }

  async createDraft(_post: SocialPost): Promise<PublishResult> {
    // LinkedIn Posts API has no draft state — lifecycle must be PUBLISHED
    return {
      ok: false,
      errorCode: "NOT_SUPPORTED",
      errorMsg: "LinkedIn does not support remote draft creation via the API",
    };
  }
}
