import type { Metadata } from "next";
import { createMetadata, createCanonicalUrl } from "@/lib/seo/site-metadata";
import { db } from "@/lib/db/prisma";
import { EvidenceBadge, Disclaimer, JsonLd } from "@menhealth/ui";
import { buildItemListSchema } from "@menhealth/core-seo";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createMetadata({
  title: "Health Claims — MenHealth Digest",
  description:
    "Browse health claims extracted from men's health videos, each reviewed and rated for evidence quality.",
  path: "/claims",
});

export default async function ClaimsIndexPage() {
  const claims = await db.claim.findMany({
    where: { video: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      slug: true,
      text: true,
      evidenceStatus: true,
      video: {
        select: {
          title: true,
          channel: { select: { title: true } },
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
        Health Claims
      </h1>
      <p className="mb-4 text-gray-600">
        Claims extracted from published men&apos;s health videos, each rated for
        evidence quality.
      </p>

      <Disclaimer />

      <ul className="mt-8 divide-y divide-gray-100">
        {claims.length === 0 && (
          <li className="py-6 text-center text-sm text-gray-500">
            No claims published yet. Check back soon.
          </li>
        )}
        {claims.map((claim) => {
          const href = `/claims/${claim.slug ?? claim.id}`;
          return (
            <li key={claim.id} className="py-4">
              <Link href={href} className="group flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-emerald-700">
                    {claim.text}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {claim.video.channel.title} — {claim.video.title}
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
