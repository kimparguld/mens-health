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
// YouTube Data API v3 upload helper
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
    where: { platform: "YOUTUBE_SHORTS" },
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
    where: { platform: "YOUTUBE_SHORTS" },
    data: {
      accessToken: newToken,
      tokenExpiry: new Date(Date.now() + 3600 * 1000),
    },
  });

  return newToken;
}

// ---------------------------------------------------------------------------
// Resumable upload — only for user-created content
// ---------------------------------------------------------------------------

type YouTubeVideoResource = {
  id: string;
  status: { uploadStatus: string };
};

async function uploadVideo(
  accessToken: string,
  metadata: { title: string; description: string; privacyStatus: string },
  videoBuffer: Buffer,
  mimeType: string,
): Promise<YouTubeVideoResource> {
  // Step 1: initiate resumable upload
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": videoBuffer.byteLength.toString(),
      },
      body: JSON.stringify({
        snippet: {
          title: metadata.title,
          description: metadata.description,
        },
        status: {
          privacyStatus: metadata.privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      }),
    },
  );

  if (!initRes.ok) {
    throw new Error(
      `YouTube upload init failed: ${initRes.status} ${initRes.statusText}`,
    );
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("YouTube upload init did not return a Location header");
  }

  // Step 2: upload the video data
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": videoBuffer.byteLength.toString(),
    },
    // Convert Buffer to Uint8Array for fetch compatibility
    body: new Uint8Array(videoBuffer),
  });

  if (!uploadRes.ok) {
    throw new Error(
      `YouTube video upload failed: ${uploadRes.status} ${uploadRes.statusText}`,
    );
  }

  return (await uploadRes.json()) as YouTubeVideoResource;
}

// ---------------------------------------------------------------------------
// Adapter implementation
// ---------------------------------------------------------------------------

export class YouTubeShortsAdapter implements SocialPublisher {
  readonly platform = "YOUTUBE_SHORTS" as const;

  async validate(post: SocialPost): Promise<ValidationResult> {
    const errors = validatePlatformConstraints("YOUTUBE_SHORTS", {
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
   * Publish an approved Short to YouTube as private/unlisted.
   *
   * NOTE: This method uploads only user-created generated video files.
   * It must never be used to upload third-party YouTube footage.
   *
   * The videoBuffer must be provided by the caller from a user-generated source.
   * This adapter does not fetch or re-encode any video from YouTube or other platforms.
   */
  async publish(
    post: SocialPost,
    videoBuffer?: Buffer,
    mimeType?: string,
  ): Promise<PublishResult> {
    const validation = await this.validate(post);
    if (!validation.ok) {
      return {
        ok: false,
        errorCode: "VALIDATION_FAILED",
        errorMsg: validation.errors.join("; "),
      };
    }

    if (!videoBuffer) {
      return {
        ok: false,
        errorCode: "NO_VIDEO",
        errorMsg:
          "A video buffer must be supplied. This adapter does not render videos.",
      };
    }

    try {
      const accessToken = await getValidAccessToken();
      const resource = await uploadVideo(
        accessToken,
        {
          title: post.hook.slice(0, 100),
          description: `${post.caption}\n\n${post.utmUrl}`,
          // Default to private; admin can change visibility in YouTube Studio
          privacyStatus: "private",
        },
        videoBuffer,
        mimeType ?? "video/mp4",
      );

      const platformPostId = resource.id;
      const platformUrl = `https://www.youtube.com/watch?v=${platformPostId}`;

      return { ok: true, platformPostId, platformUrl };
    } catch (err) {
      return {
        ok: false,
        errorCode: "UPLOAD_ERROR",
        errorMsg: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * YouTube does not support remote draft creation via the API.
   * Use publish() with privacyStatus "private" instead.
   */
  async createDraft(post: SocialPost): Promise<PublishResult> {
    return this.publish(post);
  }
}
