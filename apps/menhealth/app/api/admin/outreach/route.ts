import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  contactType: z.enum([
    "YOUTUBE_CREATOR",
    "NEWSLETTER_PUBLISHER",
    "FITNESS_BLOGGER",
    "COACH",
    "PODCAST_HOST",
    "SPONSOR_PROSPECT",
    "HEALTH_TECH_FOUNDER",
  ]),
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

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const contacts = await db.outreachContact.findMany({
    orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ contacts });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const contact = await db.outreachContact.create({ data: parsed.data });
  return NextResponse.json({ contact }, { status: 201 });
}
