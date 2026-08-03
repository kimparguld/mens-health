import "server-only";
import { db } from "@/lib/db/prisma";
import type { Platform } from "@prisma/client";
import { z } from "zod";

const RefreshResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
});

type RefreshConfig = {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  /** "basic" → Authorization: Basic header; "body" → client_id/secret in POST body */
  authStyle: "basic" | "body";
  /** Extra body params required by some platforms (e.g. X needs client_id in body too) */
  extraBodyParams?: Record<string, string>;
};

/**
 * Return a valid access token for the given platform.
 * If the stored token is expired, refresh it using the stored refresh token,
 * update the SocialAccount record, and return the new token.
 *
 * Throws if no account is connected or if refresh fails.
 * Server-only — never call from client components.
 */
export async function getValidAccessToken(
  platform: Platform,
  config: RefreshConfig,
): Promise<string> {
  const account = await db.socialAccount.findUnique({ where: { platform } });

  if (!account) {
    throw new Error(
      `No ${platform} account connected. Connect via /admin/social/accounts.`,
    );
  }

  const isExpired = !account.tokenExpiry || account.tokenExpiry <= new Date();
  if (!isExpired) return account.accessToken;

  if (!account.refreshToken) {
    throw new Error(`${platform} token expired and no refresh token stored.`);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const bodyParams: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
    ...config.extraBodyParams,
  };

  if (config.authStyle === "basic") {
    const credentials = Buffer.from(
      `${config.clientId}:${config.clientSecret}`,
    ).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  } else {
    bodyParams["client_id"] = config.clientId;
    bodyParams["client_secret"] = config.clientSecret;
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: new URLSearchParams(bodyParams).toString(),
  });

  if (!res.ok) {
    throw new Error(
      `${platform} token refresh failed: ${res.status} ${res.statusText}`,
    );
  }

  const parsed = RefreshResponse.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error(`${platform} token refresh returned unexpected response`);
  }

  const { access_token, refresh_token, expires_in } = parsed.data;
  const tokenExpiry = new Date(Date.now() + (expires_in ?? 3600) * 1000);

  // Some platforms (e.g. X) rotate the refresh token on every use and
  // invalidate the old one — if we don't persist the new one here, the
  // next refresh attempt fails and forces the admin to reconnect.
  await db.socialAccount.update({
    where: { platform },
    data: {
      accessToken: access_token,
      tokenExpiry,
      ...(refresh_token ? { refreshToken: refresh_token } : {}),
    },
  });

  return access_token;
}
