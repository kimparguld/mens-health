import "server-only";
import { validatePlatformConstraints } from "../platform-constraints";
import type { SocialPost } from "@prisma/client";
import type {
  PublishResult,
  SocialPublisher,
  ValidationResult,
} from "./publisher";
import { z } from "zod";

// ---------------------------------------------------------------------------
// TikTok Content Posting API v2 — direct video publish
// Docs: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
//
// Requires the connected TikTok app to be audited for public Direct Post —
// unaudited apps are restricted by TikTok to SELF_ONLY (private draft) posts.
// ---------------------------------------------------------------------------

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const INIT_URL = "https://open.tiktokapis.com/v2/post/publish/video/init/";
const STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

const STATUS_POLL_ATTEMPTS = 5;
const STATUS_POLL_INTERVAL_MS = 2000;

const TokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
});

const InitResponse = z.object({
  data: z.object({
    publish_id: z.string(),
    upload_url: z.string(),
  }),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
});

const StatusResponse = z.object({
  data: z.object({
    status: z.string(),
    publicly_available_post_id: z.array(z.number()).optional(),
  }),
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `videoUrl`/`videoStatus` only exist on menhealth's `SocialPost` schema
 * (other sites sharing this package don't have the video generator yet) —
 * accessed via an optional intersection so this adapter type-checks against
 * every consuming site's generated Prisma client, not just menhealth's.
 */
type PostWithVideo = SocialPost & {
  videoUrl?: string | null;
  videoStatus?: string | null;
};

export type TikTokAdapterConfig = {
  clientId?: string;
  clientSecret?: string;
  /**
   * Only required to call publish() — validate() doesn't need it. Prisma's
   * generated types carry generic branding tied to their own generation, so
   * a `Pick<PrismaClient, ...>` from one site's client isn't satisfied by
   * another site's — even for identical models.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: any;
};

export class TikTokAdapter implements SocialPublisher {
  readonly platform = "TIKTOK" as const;

  constructor(private readonly config: TikTokAdapterConfig = {}) {}

  /**
   * TikTok's refresh endpoint uses `client_key`, not the `client_id` field
   * name the generic OAuth refresh helper (shared with X) assumes — so this
   * is a small TikTok-specific refresh rather than a reuse of that helper.
   */
  private async getAccessToken(): Promise<string> {
    if (!this.config.db) {
      throw new Error("TikTokAdapter requires a `db` client to publish");
    }
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error(
        "TIKTOK_CLIENT_ID and TIKTOK_CLIENT_SECRET must be set to publish",
      );
    }

    const account = await this.config.db.socialAccount.findUnique({
      where: { platform: "TIKTOK" },
    });
    if (!account) {
      throw new Error(
        "No TikTok account connected. Connect via /admin/social/accounts.",
      );
    }

    const isExpired =
      !account.tokenExpiry || account.tokenExpiry <= new Date();
    if (!isExpired) return account.accessToken;

    if (!account.refreshToken) {
      throw new Error("TikTok token expired and no refresh token stored.");
    }

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "refresh_token",
        refresh_token: account.refreshToken,
      }).toString(),
    });

    if (!res.ok) {
      throw new Error(
        `TikTok token refresh failed: ${res.status} ${res.statusText}`,
      );
    }

    const parsed = TokenResponse.safeParse(await res.json());
    if (!parsed.success) {
      throw new Error("TikTok token refresh returned an unexpected response");
    }

    const { access_token, refresh_token, expires_in } = parsed.data;
    const tokenExpiry = new Date(Date.now() + (expires_in ?? 3600) * 1000);

    await this.config.db.socialAccount.update({
      where: { platform: "TIKTOK" },
      data: {
        accessToken: access_token,
        tokenExpiry,
        ...(refresh_token ? { refreshToken: refresh_token } : {}),
      },
    });

    return access_token;
  }

  async validate(post: SocialPost): Promise<ValidationResult> {
    const errors = validatePlatformConstraints("TIKTOK", {
      caption: post.caption,
      hashtags: post.hashtags,
      script: post.script,
      hook: post.hook,
    });

    if (post.status !== "APPROVED") {
      errors.push("Post must be APPROVED before publishing");
    }
    const videoPost = post as PostWithVideo;
    if (videoPost.videoStatus !== "READY" || !videoPost.videoUrl) {
      errors.push(
        "A generated video is required before publishing to TikTok — generate one first",
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

    try {
      const accessToken = await this.getAccessToken();

      const videoRes = await fetch((post as PostWithVideo).videoUrl as string);
      if (!videoRes.ok) {
        return {
          ok: false,
          errorCode: "VIDEO_FETCH_FAILED",
          errorMsg: `Failed to fetch generated video (${videoRes.status})`,
        };
      }
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

      const initRes = await fetch(INIT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: post.caption,
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: "FILE_UPLOAD",
            video_size: videoBuffer.byteLength,
            chunk_size: videoBuffer.byteLength,
            total_chunk_count: 1,
          },
        }),
      });

      const initText = await initRes.text();
      if (!initRes.ok) {
        return {
          ok: false,
          errorCode: `TIKTOK_INIT_${initRes.status}`,
          errorMsg: `TikTok publish init failed: ${initText}`,
        };
      }

      const initParsed = InitResponse.safeParse(JSON.parse(initText));
      if (!initParsed.success || initParsed.data.error) {
        return {
          ok: false,
          errorCode: "TIKTOK_INIT_INVALID_RESPONSE",
          errorMsg: `TikTok publish init returned an unexpected response: ${initText}`,
        };
      }

      const { publish_id, upload_url } = initParsed.data.data;

      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": "video/mp4",
          "Content-Range": `bytes 0-${videoBuffer.byteLength - 1}/${videoBuffer.byteLength}`,
        },
        body: videoBuffer,
      });

      if (!uploadRes.ok) {
        const uploadText = await uploadRes.text();
        return {
          ok: false,
          errorCode: `TIKTOK_UPLOAD_${uploadRes.status}`,
          errorMsg: `TikTok video upload failed: ${uploadText}`,
        };
      }

      const account = await this.config.db.socialAccount.findUnique({
        where: { platform: "TIKTOK" },
      });
      const profileUrl = account?.handle
        ? `https://www.tiktok.com/@${account.handle}`
        : "https://www.tiktok.com/";

      // TikTok processes the upload asynchronously — poll briefly for the
      // final public video ID, but don't block indefinitely on it. If it's
      // still processing when we give up, the post is still live/queued on
      // TikTok's side; we just fall back to the profile URL.
      for (let attempt = 0; attempt < STATUS_POLL_ATTEMPTS; attempt++) {
        await sleep(STATUS_POLL_INTERVAL_MS);

        const statusRes = await fetch(STATUS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
          body: JSON.stringify({ publish_id }),
        });
        if (!statusRes.ok) continue;

        const statusParsed = StatusResponse.safeParse(await statusRes.json());
        if (!statusParsed.success) continue;

        const { status, publicly_available_post_id } = statusParsed.data.data;
        if (status === "PUBLISH_COMPLETE") {
          const videoId = publicly_available_post_id?.[0];
          const platformUrl =
            videoId && account?.handle
              ? `https://www.tiktok.com/@${account.handle}/video/${videoId}`
              : profileUrl;
          return { ok: true, platformPostId: publish_id, platformUrl };
        }
        if (status === "FAILED") {
          return {
            ok: false,
            errorCode: "TIKTOK_PUBLISH_FAILED",
            errorMsg: `TikTok reported the publish as failed (publish_id: ${publish_id})`,
          };
        }
      }

      return { ok: true, platformPostId: publish_id, platformUrl: profileUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, errorCode: "TIKTOK_ERROR", errorMsg: msg };
    }
  }

  async createDraft(_post: SocialPost): Promise<PublishResult> {
    return {
      ok: false,
      errorCode: "NOT_SUPPORTED",
      errorMsg: "TikTok does not support remote draft creation via the API",
    };
  }
}
