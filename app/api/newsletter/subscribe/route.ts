import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/prisma";

const SubscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid email" },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  const existing = await db.newsletterSubscriber.findUnique({
    where: { email },
  });

  if (existing && !existing.unsubscribedAt) {
    return NextResponse.json({ ok: true, alreadySubscribed: true });
  }

  await db.newsletterSubscriber.upsert({
    where: { email },
    create: { email },
    update: { unsubscribedAt: null },
  });

  // TODO Phase 6: add to Resend audience
  // const resend = new Resend(env.RESEND_API_KEY);
  // await resend.contacts.create({ email, audienceId: env.RESEND_AUDIENCE_ID });

  return NextResponse.json({ ok: true, alreadySubscribed: false });
}
