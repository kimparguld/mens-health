import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";

// GET /api/newsletter/unsubscribe?id=<subscriberId>
// Used in email unsubscribe links. Renders a simple confirmation.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return new NextResponse("Missing id parameter.", { status: 400 });
  }

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { id },
    select: { id: true, email: true, unsubscribedAt: true },
  });

  if (!subscriber) {
    return new NextResponse("Subscription not found.", { status: 404 });
  }

  if (subscriber.unsubscribedAt) {
    return new NextResponse(unsubscribeHtml(subscriber.email, true), {
      headers: { "Content-Type": "text/html" },
    });
  }

  await db.newsletterSubscriber.update({
    where: { id },
    data: { unsubscribedAt: new Date() },
  });

  // Mark unsubscribed in Resend (contacts are global; no segment/audience ID needed)
  if (env.RESEND_API_KEY) {
    try {
      const { resend } = await import("@/lib/resend/client");
      await resend.contacts.remove(subscriber.email);
    } catch {
      // Non-fatal: DB record is already updated
    }
  }

  return new NextResponse(unsubscribeHtml(subscriber.email, false), {
    headers: { "Content-Type": "text/html" },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function unsubscribeHtml(email: string, wasAlready: boolean): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const safeEmail = escapeHtml(email);
  const safeAppUrl = escapeHtml(appUrl);
  const message = wasAlready
    ? `${safeEmail} was already unsubscribed.`
    : `${safeEmail} has been unsubscribed from Hype Check.`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Unsubscribed</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#374151;">
  <h1 style="font-size:24px;">✓ Unsubscribed</h1>
  <p>${message}</p>
  <p style="margin-top:32px;">
    <a href="${safeAppUrl}" style="color:#2563eb;">Back to Hype Check</a>
  </p>
</body>
</html>`;
}
