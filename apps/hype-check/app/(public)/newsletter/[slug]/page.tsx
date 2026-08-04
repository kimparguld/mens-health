import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createMetadata } from "@/lib/seo/site-metadata";
import { db } from "@/lib/db/prisma";
import { NewsletterSignupForm } from "@menhealth/ui";
type Params = Promise<{ slug: string }>;

async function getIssue(slug: string) {
  return db.newsletterDigest.findUnique({ where: { slug } });
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue) return { title: "Newsletter Issue Not Found" };

  return createMetadata({
    title: `${issue.subject} — Hype Check`,
    description: issue.subject,
    path: `/newsletter/${slug}`,
    type: "article",
  });
}

export default async function NewsletterIssuePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const issue = await getIssue(slug);

  if (!issue || !issue.html) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/newsletter" className="hover:underline">
          Newsletter
        </Link>{" "}
        /{" "}
        <Link href="/newsletter/archive" className="hover:underline">
          Archive
        </Link>{" "}
        / <span className="text-gray-900">{issue.subject}</span>
      </nav>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">
        {issue.subject}
      </h1>
      <p className="mb-6 text-sm text-gray-400">
        {issue.sentAt.toLocaleDateString()}
      </p>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <iframe
          srcDoc={issue.html}
          title={issue.subject}
          className="h-[1400px] w-full"
          sandbox=""
        />
      </div>

      <div className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-center">
        <h2 className="text-lg font-bold text-gray-900">
          Get next week&apos;s issue
        </h2>
        <div className="mt-4">
          <NewsletterSignupForm />
        </div>
      </div>
    </main>
  );
}
