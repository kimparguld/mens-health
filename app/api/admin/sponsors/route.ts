import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import { revalidateTag } from "next/cache";

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  copyText: z.string().min(1).max(500),
  ctaText: z.string().min(1).max(60),
  ctaUrl: z.string().url(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

async function requireAdmin() {
  const session = await auth();
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  return isAdmin === true;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sponsors = await db.sponsor.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sponsors);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body: unknown = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { startDate, endDate, ...rest } = parsed.data;
  const sponsor = await db.sponsor.create({
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });
  revalidateTag("sponsors", "max");
  return NextResponse.json(sponsor, { status: 201 });
}
