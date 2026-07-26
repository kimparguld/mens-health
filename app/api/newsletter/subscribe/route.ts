import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/prisma";
import { env } from "@/env";

const SubscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  sourcePage: z.string().max(500).optional(),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
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
  const attribution = {
    sourcePage: parsed.data.sourcePage ?? null,
    utmSource: parsed.data.utmSource ?? null,
    utmMedium: parsed.data.utmMedium ?? null,
    utmCampaign: parsed.data.utmCampaign ?? null,
    referrer: parsed.data.referrer ?? null,
  };

  const existing = await db.newsletterSubscriber.findUnique({
    where: { email },
  });

  if (existing && !existing.unsubscribedAt) {
    return NextResponse.json({ ok: true, alreadySubscribed: true });
  }

  const subscriber = await db.newsletterSubscriber.upsert({
    where: { email },
    create: { email, ...attribution },
    update: { unsubscribedAt: null },
  });

  // Sync to Resend — add contact and optionally assign to a segment
  if (env.RESEND_API_KEY) {
    try {
      const { resend } = await import("@/lib/resend/client");
      const segmentId = env.RESEND_SEGMENT_ID;
      const result = await resend.contacts.create({
        email,
        unsubscribed: false,
        ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
      });
      if (result.data?.id && !subscriber.resendContactId) {
        await db.newsletterSubscriber.update({
          where: { email },
          data: { resendContactId: result.data.id },
        });
      }
    } catch {
      // Non-fatal: subscription is recorded in DB regardless
    }
  }

  return NextResponse.json({ ok: true, alreadySubscribed: false });
}
