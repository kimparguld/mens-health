import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";
import type { NextRequest } from "next/server";

// Retries the Resend contact sync for one subscriber — for rows where the
// original best-effort sync in /api/newsletter/subscribe silently failed.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!env.RESEND_API_KEY) {
    return Response.json(
      { error: "RESEND_API_KEY is not configured" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { id },
  });
  if (!subscriber) {
    return Response.json({ error: "Subscriber not found" }, { status: 404 });
  }

  const { resend } = await import("@/lib/resend/client");
  const result = await resend.contacts.create({
    email: subscriber.email,
    unsubscribed: !!subscriber.unsubscribedAt,
  });

  if (result.error || !result.data?.id) {
    return Response.json(
      { error: result.error?.message ?? "Resend sync failed" },
      { status: 502 },
    );
  }

  await db.newsletterSubscriber.update({
    where: { id },
    data: { resendContactId: result.data.id },
  });

  return Response.json({ ok: true, resendContactId: result.data.id });
}
