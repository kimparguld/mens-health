import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactType: z
    .enum([
      "YOUTUBE_CREATOR",
      "NEWSLETTER_PUBLISHER",
      "FINANCE_BLOGGER",
      "COACH",
      "PODCAST_HOST",
      "SPONSOR_PROSPECT",
      "FINTECH_FOUNDER",
    ])
    .optional(),
  email: z.string().email().optional().nullable(),
  socialUrl: z.string().url().optional().nullable(),
  relatedContentUrl: z.string().url().optional().nullable(),
  status: z
    .enum([
      "NOT_CONTACTED",
      "EMAIL_SENT",
      "REPLIED",
      "MEETING_BOOKED",
      "DEAL_IN_PROGRESS",
      "CLOSED_WON",
      "CLOSED_LOST",
      "FOLLOW_UP_NEEDED",
    ])
    .optional(),
  lastContactedAt: z.string().datetime().optional().nullable(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  result: z.string().max(500).optional().nullable(),
});

async function requireAdmin() {
  const session = await auth();
  const isAdmin = (session?.user as { isAdmin?: boolean } | null)?.isAdmin;
  if (!isAdmin) return null;
  return session;
}

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const contact = await db.outreachContact.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ contact });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.outreachContact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
