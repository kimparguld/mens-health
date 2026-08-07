import type { SocialAccount } from '@/app/generated/prisma';
import { env } from '@/env';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// Only platforms whose adapter actually reads the stored OAuth token to
// publish are listed here. YouTube Community and Reddit adapters never read
// a stored token — they're always manual — so connecting an account for them
// would do nothing.
const PLATFORM_CONFIGS = [
  {
    platform: 'X' as const,
    label: 'X (Twitter)',
    oauthPath: '/api/social/x/oauth',
    configured: !!(env.X_CLIENT_ID && env.X_REDIRECT_URI),
    setupDocs: 'https://developer.twitter.com/en/portal/dashboard',
    envVars: ['X_CLIENT_ID', 'X_CLIENT_SECRET', 'X_REDIRECT_URI'],
  },
  {
    platform: 'TIKTOK' as const,
    label: 'TikTok',
    oauthPath: '/api/social/tiktok/oauth',
    configured: !!(env.TIKTOK_CLIENT_ID && env.TIKTOK_REDIRECT_URI),
    setupDocs: 'https://developers.tiktok.com/apps',
    envVars: ['TIKTOK_CLIENT_ID', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI'],
  },
];

export default async function SocialAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    redirect('/admin/login');
  }

  const { connected, error } = await searchParams;
  const connectedLabel = PLATFORM_CONFIGS.find(
    (p) => p.platform.toLowerCase() === connected,
  )?.label;

  const accounts = await db.socialAccount.findMany({
    where: { platform: { in: PLATFORM_CONFIGS.map((p) => p.platform) } },
  });
  const accountByPlatform = new Map<string, SocialAccount>(
    accounts.map((a) => [a.platform, a]),
  );

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Social accounts</h1>
      <p className="text-sm text-gray-500">
        X and TikTok are the platforms with a working auto-publisher, so
        they&apos;re the ones that need a connected account here. YouTube
        Community and Reddit are always posted manually from{' '}
        <Link href="/admin/social/drafts" className="underline">
          Social drafts
        </Link>{' '}
        — no connection needed.
      </p>

      {connected && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ {connectedLabel ?? connected} connected successfully.
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          Connection error: <code className="font-mono">{error}</code>. Check
          your OAuth app credentials and try again.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {PLATFORM_CONFIGS.map((config) => {
          const account = accountByPlatform.get(config.platform) ?? null;
          const expired =
            account?.tokenExpiry && account.tokenExpiry < new Date();

          return (
            <div
              key={config.platform}
              className="flex flex-col justify-between gap-4 rounded-lg border bg-white p-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {config.label}
                  </span>
                  {account ? (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                    >
                      {expired ? 'Token expired' : 'Connected'}
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
                <a
                  href={config.oauthPath}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {account ? 'Reconnect' : 'Connect'}
                </a>
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
                    className="text-muted/60 mt-1 inline-block text-xs hover:underline"
                  >
                    Create app →
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border bg-amber-50 p-4 text-xs text-amber-800">
        <strong>Security:</strong> Access tokens are stored server-side only and
        are never sent to the browser. Reconnect if the token shows as expired.
      </div>
    </div>
  );
}
