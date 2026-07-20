import { db } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { env } from "@/env";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Platform, SocialAccount } from "@prisma/client";

export const dynamic = "force-dynamic";

type PlatformConfig = {
  label: string;
  oauthPath: string;
  configured: boolean;
  setupDocs: string;
  envVars: string[];
};

export default async function SocialAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    redirect("/admin/login");
  }

  const { connected, error } = await searchParams;

  const accounts = await db.socialAccount.findMany({
    orderBy: { platform: "asc" },
  });
  const accountsByPlatform = Object.fromEntries(
    accounts.map((a) => [a.platform, a]),
  ) as Partial<Record<Platform, SocialAccount>>;

  const platforms: Record<Platform, PlatformConfig> = {
    YOUTUBE_SHORTS: {
      label: "YouTube Shorts",
      oauthPath: "/api/social/youtube/oauth",
      configured: !!(
        env.YOUTUBE_OAUTH_CLIENT_ID && env.YOUTUBE_OAUTH_REDIRECT_URI
      ),
      setupDocs: "https://console.cloud.google.com/apis/credentials",
      envVars: [
        "YOUTUBE_OAUTH_CLIENT_ID",
        "YOUTUBE_OAUTH_CLIENT_SECRET",
        "YOUTUBE_OAUTH_REDIRECT_URI",
      ],
    },
    TIKTOK: {
      label: "TikTok",
      oauthPath: "/api/social/tiktok/oauth",
      configured: !!(env.TIKTOK_CLIENT_ID && env.TIKTOK_REDIRECT_URI),
      setupDocs: "https://developers.tiktok.com/apps",
      envVars: [
        "TIKTOK_CLIENT_ID",
        "TIKTOK_CLIENT_SECRET",
        "TIKTOK_REDIRECT_URI",
      ],
    },
    INSTAGRAM_REELS: {
      label: "Instagram Reels",
      oauthPath: "/api/social/instagram/oauth",
      configured: !!(env.META_CLIENT_ID && env.META_REDIRECT_URI),
      setupDocs: "https://developers.facebook.com/apps",
      envVars: ["META_CLIENT_ID", "META_CLIENT_SECRET", "META_REDIRECT_URI"],
    },
    REDDIT: {
      label: "Reddit",
      oauthPath: "/api/social/reddit/oauth",
      configured: !!(env.REDDIT_CLIENT_ID && env.REDDIT_REDIRECT_URI),
      setupDocs: "https://www.reddit.com/prefs/apps",
      envVars: [
        "REDDIT_CLIENT_ID",
        "REDDIT_CLIENT_SECRET",
        "REDDIT_REDIRECT_URI",
      ],
    },
    LINKEDIN: {
      label: "LinkedIn",
      oauthPath: "/api/social/linkedin/oauth",
      configured: !!(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_REDIRECT_URI),
      setupDocs: "https://www.linkedin.com/developers/apps",
      envVars: [
        "LINKEDIN_CLIENT_ID",
        "LINKEDIN_CLIENT_SECRET",
        "LINKEDIN_REDIRECT_URI",
      ],
    },
    X: {
      label: "X (Twitter)",
      oauthPath: "/api/social/x/oauth",
      configured: !!(env.X_CLIENT_ID && env.X_REDIRECT_URI),
      setupDocs: "https://developer.twitter.com/en/portal/dashboard",
      envVars: ["X_CLIENT_ID", "X_CLIENT_SECRET", "X_REDIRECT_URI"],
    },
  };

  const connectedPlatformLabel: Partial<Record<string, string>> = {
    youtube: "YouTube",
    reddit: "Reddit",
    linkedin: "LinkedIn",
    x: "X",
    tiktok: "TikTok",
    instagram: "Instagram",
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Social accounts</h1>

      {connected && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ {connectedPlatformLabel[connected] ?? connected} connected
          successfully.
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          Connection error: <code className="font-mono">{error}</code>. Check
          your OAuth app credentials and try again.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.entries(platforms) as [Platform, PlatformConfig][]).map(
          ([platform, config]) => {
            const account = accountsByPlatform[platform];
            const expired =
              account?.tokenExpiry && account.tokenExpiry < new Date();

            return (
              <div
                key={platform}
                className="flex flex-col justify-between gap-4 rounded-lg border bg-white p-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {config.label}
                    </span>
                    {account ? (
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${expired ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                      >
                        {expired ? "Token expired" : "Connected"}
                      </span>
                    ) : (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Not connected
                      </span>
                    )}
                  </div>

                  {account && (
                    <p className="mt-1 text-sm text-gray-500">
                      {account.handle}
                      {account.tokenExpiry && (
                        <span className="ml-2 text-xs text-gray-400">
                          · expires {account.tokenExpiry.toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {config.configured ? (
                  <Link
                    href={config.oauthPath}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {account ? "Reconnect" : "Connect"}
                  </Link>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">
                      Set these env vars to enable:
                    </p>
                    <ul className="space-y-0.5">
                      {config.envVars.map((v) => (
                        <li key={v} className="font-mono text-xs text-gray-400">
                          {v}
                        </li>
                      ))}
                    </ul>
                    <a
                      href={config.setupDocs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-indigo-600 hover:underline"
                    >
                      Create app →
                    </a>
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>

      <div className="rounded-lg border bg-amber-50 p-4 text-xs text-amber-800">
        <strong>Security:</strong> Access tokens are stored server-side only and
        are never sent to the browser. Reconnect any account whose token shows
        as expired.
      </div>
    </div>
  );
}
