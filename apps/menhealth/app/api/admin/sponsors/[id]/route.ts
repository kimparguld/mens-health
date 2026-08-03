import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";
import { revalidateTag } from "next/cache";

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  copyText: z.string().min(1).max(500).optional(),
  ctaText: z.string().min(1).max(60).optional(),
  ctaUrl: z.string().url().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
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
  const { startDate, endDate, ...rest } = parsed.data;
  const sponsor = await db.sponsor.update({
    where: { id },
    data: {
      ...rest,
      ...(startDate !== undefined && {
        startDate: startDate ? new Date(startDate) : null,
      }),
      ...(endDate !== undefined && {
        endDate: endDate ? new Date(endDate) : null,
      }),
    },
  });
  revalidateTag("sponsors", "max");
  return NextResponse.json(sponsor);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await db.sponsor.delete({ where: { id } });
  revalidateTag("sponsors", "max");
  return new NextResponse(null, { status: 204 });
}
