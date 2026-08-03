import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  platform: z.string().min(1).max(100).optional(),
  budget: z.number().positive().optional().nullable(),
  landingPage: z.string().url().optional().nullable(),
  utmUrl: z.string().url().optional().nullable(),
  clicks: z.number().int().min(0).optional(),
  signups: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
  endedAt: z.string().datetime().optional().nullable(),
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

  const campaign = await db.marketingCampaign.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ campaign });
}
