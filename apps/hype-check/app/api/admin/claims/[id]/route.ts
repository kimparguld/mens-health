import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { Prisma } from "@/app/generated/prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";

const SourceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(300),
  url: z.string().url(),
  source: z.string().min(1).max(200),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  summary: z.string().max(2000).nullable().optional(),
});

const ClaimUpdateSchema = z.object({
  evidenceStatus: z.enum([
    "NOT_CHECKED",
    "SUPPORTED",
    "MIXED",
    "WEAK",
    "UNSUPPORTED",
  ]),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  category: z.enum([
    "PERFORMANCE",
    "INCOME",
    "SAFETY",
    "PRICING",
    "LEGITIMACY",
    "REGULATION",
    "POPULARITY",
    "GUARANTEE",
    "ENDORSEMENT",
    "SCARCITY",
    "OTHER",
  ]),
  explanation: z.string().max(2000).nullable().optional(),
  sources: z.array(SourceSchema).max(20),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = ClaimUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const claim = await db.claim.findUnique({
    where: { id },
    include: { evidenceItems: true },
  });
  if (!claim) {
    return Response.json({ error: "Claim not found" }, { status: 404 });
  }

  const { evidenceStatus, riskLevel, category, explanation, sources } =
    parsed.data;

  const existingIds = new Set(claim.evidenceItems.map((s) => s.id));
  const submittedIds = new Set(
    sources.filter((s) => s.id).map((s) => s.id as string),
  );
  const toDelete = [...existingIds].filter((sid) => !submittedIds.has(sid));

  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.claim.update({
      where: { id },
      data: {
        evidenceStatus,
        riskLevel,
        claimType: category,
        explanation: explanation ?? null,
        // Every manual save is a human touching this claim's verdict —
        // satisfies the auto-publish gate's "real evidence verdict" check
        // and clears the auto-reviewed marker regardless of prior state.
        autoReviewed: false,
        humanConfirmedAt: new Date(),
      },
    }),
  ];

  if (toDelete.length > 0) {
    ops.push(
      db.evidenceItem.deleteMany({ where: { id: { in: toDelete } } }),
    );
  }

  for (const s of sources) {
    if (s.id && existingIds.has(s.id)) {
      ops.push(
        db.evidenceItem.update({
          where: { id: s.id },
          data: {
            title: s.title,
            url: s.url,
            source: s.source,
            year: s.year ?? null,
            summary: s.summary ?? null,
          },
        }),
      );
    } else {
      ops.push(
        db.evidenceItem.create({
          data: {
            claimId: id,
            title: s.title,
            url: s.url,
            source: s.source,
            year: s.year ?? null,
            summary: s.summary ?? null,
          },
        }),
      );
    }
  }

  await db.$transaction(ops);

  return Response.json({ ok: true });
}
