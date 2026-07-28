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

// ---------------------------------------------------------------------------
// In-memory rate limiter (resets on cold start — sufficient for edge abuse).
// For production scale, replace with a Redis-backed store.
// ---------------------------------------------------------------------------
const ipAttempts = new Map<string, { count: number; windowStart: number }>();
const emailAttempts = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS_PER_IP = 10;
const MAX_ATTEMPTS_PER_EMAIL = 3;

function isRateLimited(
  map: Map<string, { count: number; windowStart: number }>,
  key: string,
  maxAttempts: number,
): boolean {
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    map.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  if (entry.count > maxAttempts) return true;
  return false;
}

// Generic response so attackers cannot enumerate subscribers.
const GENERIC_OK = NextResponse.json({ ok: true });

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ipAttempts, ip, MAX_ATTEMPTS_PER_IP)) {
    // Return generic success to prevent enumeration
    return GENERIC_OK;
  }

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

  // Normalize email to lowercase before storing / looking up.
  const email = parsed.data.email.toLowerCase().trim();

  // Rate limit by normalised email address
  if (isRateLimited(emailAttempts, email, MAX_ATTEMPTS_PER_EMAIL)) {
    return GENERIC_OK;
  }

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
    // Return generic success — do not reveal that the address is already subscribed.
    return GENERIC_OK;
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
