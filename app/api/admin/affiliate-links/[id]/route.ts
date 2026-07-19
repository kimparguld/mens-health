import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";

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
  const isActive = (body as { isActive?: boolean }).isActive;
  if (typeof isActive !== "boolean") {
    return NextResponse.json(
      { error: "isActive must be boolean" },
      { status: 422 },
    );
  }
  const link = await db.affiliateLink.update({
    where: { id },
    data: { isActive },
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
