import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

const CampaignSchema = z.object({
  name: z.string().min(1).max(200),
  platform: z.string().min(1).max(100),
  budget: z.number().positive().optional().nullable(),
  landingPage: z.string().url().optional().nullable(),
  utmUrl: z.string().url().optional().nullable(),
  clicks: z.number().int().min(0).optional(),
  signups: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
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
  const campaigns = await db.marketingCampaign.findMany({
    orderBy: [{ isActive: "desc" }, { startedAt: "desc" }],
  });
  return NextResponse.json({ campaigns });
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

  const parsed = CampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const campaign = await db.marketingCampaign.create({ data: parsed.data });
  return NextResponse.json({ campaign }, { status: 201 });
}
