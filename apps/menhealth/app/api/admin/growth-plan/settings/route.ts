import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  const isAdmin = (session?.user as { isAdmin?: boolean } | null)?.isAdmin;
  return isAdmin ? session : null;
}

const SettingsSchema = z.object({
  growthPlanStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
});

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  await db.setting.upsert({
    where: { key: "growthPlanStartDate" },
    create: {
      key: "growthPlanStartDate",
      value: parsed.data.growthPlanStartDate,
    },
    update: { value: parsed.data.growthPlanStartDate },
  });

  return NextResponse.json({
    ok: true,
    startDate: parsed.data.growthPlanStartDate,
  });
}
