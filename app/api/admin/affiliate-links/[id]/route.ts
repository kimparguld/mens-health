import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  url: z.string().url().optional(),
  productName: z.string().min(1).max(120).optional(),
  commission: z.string().max(50).nullable().optional(),
  topicSlug: z.string().max(80).nullable().optional(),
  isActive: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await auth();
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  return isAdmin === true;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const link = await db.affiliateLink.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(link);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await db.affiliateLink.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
