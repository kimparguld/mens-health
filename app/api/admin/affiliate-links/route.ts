import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  label: z.string().min(1).max(120),
  url: z.string().url(),
  productName: z.string().min(1).max(120),
  commission: z.string().max(50).optional(),
  topicSlug: z.string().max(80).optional(),
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
  const links = await db.affiliateLink.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(links);
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
  const link = await db.affiliateLink.create({ data: parsed.data });
  return NextResponse.json(link, { status: 201 });
}
