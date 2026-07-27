import { NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  const isAdmin = (session?.user as { isAdmin?: boolean } | null)?.isAdmin;
  return isAdmin ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [tasks, startDateSetting] = await Promise.all([
    db.growthPlanTask.findMany({
      orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
    }),
    db.setting.findUnique({ where: { key: "growthPlanStartDate" } }),
  ]);

  return NextResponse.json({
    tasks,
    startDate: startDateSetting?.value ?? null,
  });
}
