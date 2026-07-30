import { db } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { env } from "@/env";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { SocialAccount } from "@prisma/client";

// Only X is listed as connectable here: it's the only adapter that actually
// reads the stored OAuth token to auto-publish (via the scheduled cron).
// YouTube Community and Reddit adapters never read a stored token — they're
// always manual — so connecting an account for them would do nothing.
const X_CONFIG = {
  label: "X (Twitter)",
  oauthPath: "/api/social/x/oauth",
  configured: !!(env.X_CLIENT_ID && env.X_REDIRECT_URI),
  setupDocs: "https://developer.twitter.com/en/portal/dashboard",
  envVars: ["X_CLIENT_ID", "X_CLIENT_SECRET", "X_REDIRECT_URI"],
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

  const xAccount: SocialAccount | null = await db.socialAccount.findUnique({
    where: { platform: "X" },
  });
  const expired = xAccount?.tokenExpiry && xAccount.tokenExpiry < new Date();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Social accounts</h1>
      <p className="text-sm text-gray-500">
        X is the only platform with a working auto-publisher, so it&apos;s the
        only one that needs a connected account here. YouTube Community and Reddit
        are always posted manually from{" "}
        <Link href="/admin/social/drafts" className="underline">
          Social drafts
        </Link>{" "}
        — no connection needed.
      </p>

      {connected && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ X connected successfully.
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          Connection error: <code className="font-mono">{error}</code>. Check
          your OAuth app credentials and try again.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-between gap-4 rounded-lg border bg-white p-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">
                {X_CONFIG.label}
              </span>
              {xAccount ? (
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

            {xAccount && (
              <p className="mt-1 text-sm text-gray-500">
                {xAccount.handle}
                {xAccount.tokenExpiry && (
                  <span className="ml-2 text-xs text-gray-400">
                    · expires {xAccount.tokenExpiry.toLocaleDateString()}
                  </span>
                )}
              </p>
            )}
          </div>

          {X_CONFIG.configured ? (
            <a
              href={X_CONFIG.oauthPath}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {xAccount ? "Reconnect" : "Connect"}
            </a>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">
                Set these env vars to enable:
              </p>
              <ul className="space-y-0.5">
                {X_CONFIG.envVars.map((v) => (
                  <li key={v} className="font-mono text-xs text-gray-400">
                    {v}
                  </li>
                ))}
              </ul>
              <a
                href={X_CONFIG.setupDocs}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-indigo-600 hover:underline"
              >
                Create app →
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-lg border border-dashed bg-gray-50 p-4 opacity-70">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">TikTok</span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                Not implemented yet
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Adapter is a documented stub (
            <code className="font-mono">lib/social/adapters/tiktok.ts</code>)
            pending TikTok Developer credentials — no connection available
            yet.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-amber-50 p-4 text-xs text-amber-800">
        <strong>Security:</strong> Access tokens are stored server-side only and
        are never sent to the browser. Reconnect if the token shows as
        expired.
      </div>
    </div>
  );
}
