import { db } from '@/lib/db/prisma';
import { createMetadata } from '@/lib/seo/site-metadata';
import { PageBreadcrumbs } from '@menhealth/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hype-check.net';

export const metadata: Metadata = createMetadata({
  title: 'Newsletter Archive',
  description:
    'Past issues of the Hype Check weekly newsletter — trending products, claims checked, and practical takeaways.',
  path: '/newsletter/archive',
});

export default async function NewsletterArchivePage() {
  const issues = await db.newsletterDigest.findMany({
    where: { slug: { not: null } },
    orderBy: { sentAt: 'desc' },
    take: 100,
    select: { slug: true, subject: true, sentAt: true },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <PageBreadcrumbs
        baseUrl={APP_URL}
        trail={[
          { label: 'Newsletter', href: '/newsletter' },
          { label: 'Archive', href: '/newsletter/archive' },
        ]}
      />
      <h1 className="heading">Newsletter Archive</h1>
      <p className="mb-8 text-gray-600">
        Every past issue of the weekly digest, published as a permanent page.
      </p>
      <ul className="divide-y divide-gray-100">
        {issues.length === 0 && (
          <li className="py-6 text-center text-sm text-gray-500">
            No issues published yet. Check back soon.
          </li>
        )}
        {issues.map((issue) => (
          <li key={issue.slug} className="py-4">
            <Link
              href={`/newsletter/${issue.slug}`}
              className="text-ink text-sm font-medium hover:underline"
            >
              {issue.subject}
            </Link>
            <p className="mt-1 text-sm text-gray-400">
              {issue.sentAt.toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
