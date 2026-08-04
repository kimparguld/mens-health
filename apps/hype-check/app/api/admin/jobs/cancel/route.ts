import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { z } from "zod";

const bodySchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(500),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { ids } = parsed.data;

  const result = await db.processingJob.updateMany({
    where: { id: { in: ids }, status: "QUEUED" },
    data: { status: "CANCELLED" },
  });

  return Response.json({ ok: true, cancelled: result.count });
}
