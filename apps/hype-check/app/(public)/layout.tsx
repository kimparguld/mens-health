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
    <div className="bg-paper flex min-h-screen flex-col">
      <Suspense fallback={<HeaderShell />}>
        <AuthedHeader />
      </Suspense>

      <div className="flex-1">{children}</div>

      <footer className="border-hairline bg-surface border-t">
        <div className="mx-auto max-w-280 px-4 py-12">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <Link
                href="/"
                className="focus-visible:ring-ink/40 inline-flex rounded-md focus-visible:ring-2 focus-visible:outline-none"
              >
                <BrandLogotype size="md" />
              </Link>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Evidence-based verdicts on trending products, courses, and side
                hustles — without the hype.
              </p>
              <ul className="mt-4 space-y-1 text-xs text-white/60">
                <li>✓ Educational content only. Not financial advice.</li>
                <li>✓ We do not host or restream YouTube videos.</li>
                <li>✓ Affiliate links are clearly disclosed.</li>
              </ul>
            </div>

            {/* About links */}
            <div>
              <h3 className="text-ink text- mb-2 font-semibold">About</h3>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                <li>
                  <Link
                    href="/about"
                    className="text-white/60 hover:text-white"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/how-we-rate-evidence"
                    className="text-white/60 hover:text-white"
                  >
                    How We Rate Evidence
                  </Link>
                </li>
                <li>
                  <Link
                    href="/glossary"
                    className="text-white/60 hover:text-white"
                  >
                    Glossary
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-white/60 hover:text-white">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/editorial-process"
                    className="text-white/60 hover:text-white"
                  >
                    Editorial Process
                  </Link>
                </li>
                <li>
                  <Link
                    href="/disclaimer"
                    className="text-white/60 hover:text-white"
                  >
                    Disclaimer
                  </Link>
                </li>
                <li>
                  <Link
                    href="/affiliate-disclosure"
                    className="text-white/60 hover:text-white"
                  >
                    Affiliate Disclosure
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-white/60 hover:text-white"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-white/60 hover:text-white"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Top topics */}
            <div>
              <h3 className="text-ink text-md mb-2 font-semibold">
                <Link href="/topics" className="hover:text-ink/80 text-ink">
                  Top Topics
                </Link>
              </h3>
              <ul className="text-white/80mt-3 space-y-2 text-sm">
                {FOOTER_TOPICS.map((topic) => (
                  <li key={topic.slug}>
                    <Link
                      href={`/topics/${topic.slug}`}
                      className="text-white/60 hover:text-white"
                    >
                      {topic.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/topics"
                    className="text-ink hover:text-ink/80 font-medium"
                  >
                    View all topics →
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-hairline mt-10 flex flex-wrap items-center justify-between gap-2 border-t pt-6 text-xs text-white/80">
            <p>© {new Date().getFullYear()} Hype Check. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="text-white/80 hover:text-white">
                Privacy
              </Link>
              <Link href="/contact" className="text-white/80 hover:text-white">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
