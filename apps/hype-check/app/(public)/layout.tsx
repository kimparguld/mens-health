import { BrandLogotype } from '@/components/ui/BrandLogotype';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { Suspense } from 'react';

type SessionUser = {
  name?: string | null;
  email?: string | null;
  isPremium?: boolean;
};

const FOOTER_TOPICS = [
  { slug: 'ai-tools', name: 'AI Tools' },
  { slug: 'side-hustles', name: 'Side Hustles' },
  { slug: 'online-courses', name: 'Online Courses' },
  { slug: 'viral-products', name: 'Viral Products' },
  { slug: 'investment-apps', name: 'Investment Apps' },
  { slug: 'giveaways', name: 'Giveaways' },
];

async function AuthedHeader() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  return <SiteHeader user={user} />;
}

function HeaderShell() {
  return <SiteHeader user={undefined} />;
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Suspense fallback={<HeaderShell />}>
        <AuthedHeader />
      </Suspense>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-hairline bg-surface">
        <div className="mx-auto max-w-280 px-4 py-12">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <Link
                href="/"
                className="inline-flex rounded-md focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:outline-none"
              >
                <BrandLogotype size="md" />
              </Link>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Evidence-based verdicts on trending products, courses, and
                side hustles — without the hype.
              </p>
              <ul className="mt-4 space-y-1 text-xs text-ink-muted">
                <li>✓ Educational content only. Not financial advice.</li>
                <li>✓ We do not host or restream YouTube videos.</li>
                <li>✓ Affiliate links are clearly disclosed.</li>
              </ul>
            </div>

            {/* About links */}
            <div>
              <h3 className="text-sm font-semibold text-ink">About</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                <li>
                  <Link href="/about" className="hover:text-ink">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/how-we-rate-evidence"
                    className="hover:text-ink"
                  >
                    How We Rate Evidence
                  </Link>
                </li>
                <li>
                  <Link href="/glossary" className="hover:text-ink">
                    Glossary
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-ink">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/editorial-process"
                    className="hover:text-ink"
                  >
                    Editorial Process
                  </Link>
                </li>
                <li>
                  <Link
                    href="/disclaimer"
                    className="hover:text-ink"
                  >
                    Disclaimer
                  </Link>
                </li>
                <li>
                  <Link
                    href="/affiliate-disclosure"
                    className="hover:text-ink"
                  >
                    Affiliate Disclosure
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-ink">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-ink">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Top topics */}
            <div>
              <h3 className="text-sm font-semibold text-ink">
                <Link href="/topics" className="hover:text-ink-muted">
                  Top Topics
                </Link>
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                {FOOTER_TOPICS.map((topic) => (
                  <li key={topic.slug}>
                    <Link
                      href={`/topics/${topic.slug}`}
                      className="hover:text-ink"
                    >
                      {topic.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/topics"
                    className="font-medium text-ink underline decoration-hairline hover:decoration-ink"
                  >
                    View all topics →
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-6 text-xs text-ink-muted">
            <p>
              © {new Date().getFullYear()} Hype Check. All rights
              reserved.
            </p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-ink">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-ink">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
