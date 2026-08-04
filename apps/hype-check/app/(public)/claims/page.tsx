import type { Metadata } from "next";
import { createMetadata, createCanonicalUrl } from "@/lib/seo/site-metadata";
import { db } from "@/lib/db/prisma";
import { EvidenceBadge, Disclaimer, JsonLd } from "@menhealth/ui";
import { buildItemListSchema } from "@menhealth/core-seo";
import { DISCLAIMER_TEXT } from "@/lib/site-brand";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createMetadata({
  title: "Claims — Hype Check",
  description:
    "Browse claims extracted from the videos we review, each reviewed and rated for evidence quality.",
  path: "/claims",
});

export default async function ClaimsIndexPage() {
  const claims = await db.claim.findMany({
    where: { subject: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      slug: true,
      text: true,
      evidenceStatus: true,
      subject: {
        select: {
          name: true,
          editorialTitle: true,
          channel: { select: { title: true } },
          sourceVideos: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { title: true },
          },
        },
      },
    },
  });

  const itemListSchema = buildItemListSchema(
    "Health Claims",
    claims
      .filter((c) => c.slug != null)
      .map((c) => ({
        name: c.text,
        url: createCanonicalUrl(`/claims/${c.slug}`),
      })),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd schema={itemListSchema} />
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
        Claims
      </h1>
      <p className="mb-4 text-gray-600">
        Claims extracted from published videos we review, each rated for
        evidence quality.
      </p>

      <Disclaimer text={DISCLAIMER_TEXT} />

      <ul className="mt-8 divide-y divide-gray-100">
        {claims.length === 0 && (
          <li className="py-6 text-center text-sm text-gray-500">
            No claims published yet. Check back soon.
          </li>
        )}
        {claims.map((claim) => {
          const href = `/claims/${claim.slug ?? claim.id}`;
          const videoTitle =
            claim.subject.editorialTitle ??
            claim.subject.sourceVideos[0]?.title ??
            claim.subject.name;
          return (
            <li key={claim.id} className="py-4">
              <Link href={href} className="group flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">
                    {claim.text}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {claim.subject.channel?.title ?? ""} — {videoTitle}
                  </p>
                </div>
                {claim.evidenceStatus && (
                  <EvidenceBadge status={claim.evidenceStatus} />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
