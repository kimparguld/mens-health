import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";
import type { NextRequest } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { id },
  });
  if (!subscriber) {
    return Response.json({ error: "Subscriber not found" }, { status: 404 });
  }

  if (env.RESEND_API_KEY && subscriber.resendContactId) {
    try {
      const { resend } = await import("@/lib/resend/client");
      await resend.contacts.remove({ id: subscriber.resendContactId });
    } catch {
      // Non-fatal: proceed with local deletion regardless
    }
  }

  await db.newsletterSubscriber.delete({ where: { id } });

  return Response.json({ ok: true });
}
