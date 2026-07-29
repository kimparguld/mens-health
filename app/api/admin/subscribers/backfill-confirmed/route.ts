import { auth } from "@/lib/auth";
import { db } from "@/lib/db/prisma";

// One-time cleanup: this app is single opt-in (no confirmation email/link
// ever existed), so any subscriber recorded before the fix in
// app/api/newsletter/subscribe/route.ts was permanently stuck "Unconfirmed".
// Sets confirmedAt for everyone who isn't unsubscribed and isn't already confirmed.
export async function POST() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await db.newsletterSubscriber.updateMany({
    where: { confirmedAt: null, unsubscribedAt: null },
    data: { confirmedAt: new Date() },
  });

  return Response.json({ ok: true, updated: result.count });
}
