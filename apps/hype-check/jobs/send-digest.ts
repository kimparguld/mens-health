import { db } from "@/lib/db/prisma";
import { resend } from "@/lib/resend/client";
import {
  buildDigestSubject,
  buildDigestHtml,
  buildDigestText,
  type DigestVideo,
} from "@/lib/newsletter/digest";
import { env } from "@/env";

const BATCH_SIZE = 50;
const LOOKBACK_DAYS = 7;

export interface SendDigestResult {
  ok: boolean;
  skipped?: string;
  sentCount: number;
  failedCount: number;
  digestId?: string;
}

export async function sendWeeklyDigest(): Promise<SendDigestResult> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const videos = await db.video.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: since },
    },
    include: {
      summaries: { take: 1, orderBy: { createdAt: "desc" } },
      channel: true,
      claims: {
        where: {
          // Only include claims that have been actively evidence-reviewed.
          evidenceStatus: { not: "NOT_CHECKED" },
        },
        take: 3,
        orderBy: { riskLevel: "desc" },
      },
    },
    orderBy: [{ trendScore: "desc" }, { relevanceScore: "desc" }],
    take: 5,
  });

  if (videos.length === 0) {
    return {
      ok: true,
      skipped: "No published videos this week",
      sentCount: 0,
      failedCount: 0,
    };
  }

  const digestVideos: DigestVideo[] = videos.map((v) => ({
    title: v.title,
    slug: v.slug,
    channelTitle: v.channel.title,
    thumbnailUrl: v.thumbnailUrl,
    shortSummary: v.summaries[0]?.shortSummary ?? null,
    trendScore: v.trendScore,
    // Only claims with an explicit evidence verdict are included.
    checkedClaims: v.claims.map((c) => ({
      claim: c.text,
      verdict:
        c.evidenceStatus.charAt(0) + c.evidenceStatus.slice(1).toLowerCase(),
      summary: c.explanation ?? c.text,
      slug: c.slug ?? c.id,
    })),
    practicalTakeaway:
      v.summaries[0]?.takeaways &&
      Array.isArray(v.summaries[0].takeaways) &&
      (v.summaries[0].takeaways as string[]).length > 0
        ? (v.summaries[0].takeaways as string[])[0]
        : null,
  }));

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const fromEmail =
    env.RESEND_FROM_EMAIL ?? `digest@${new URL(appUrl).hostname}`;
  const subject = buildDigestSubject(digestVideos);
  console.log(
    "[send-digest] from=%s subject=%s videos=%d",
    fromEmail,
    subject,
    digestVideos.length,
  );

  const subscribers = await db.newsletterSubscriber.findMany({
    where: { unsubscribedAt: null },
    select: { id: true, email: true },
  });

  if (subscribers.length === 0) {
    return {
      ok: true,
      skipped: "No active subscribers",
      sentCount: 0,
      failedCount: 0,
    };
  }

  const archiveHtml = buildDigestHtml(digestVideos, appUrl, `${appUrl}/newsletter`);
  const archiveText = buildDigestText(digestVideos, appUrl, `${appUrl}/newsletter`);

  const digest = await db.newsletterDigest.create({
    data: { subject, html: archiveHtml, text: archiveText },
  });

  const dateStr = digest.sentAt.toISOString().slice(0, 10);
  const slug = `${dateStr}-${digest.id.slice(-6)}`;
  await db.newsletterDigest.update({
    where: { id: digest.id },
    data: { slug },
  });

  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (sub) => {
        const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe?id=${sub.id}`;

        const { error } = await resend.emails.send({
          from: fromEmail,
          to: [sub.email],
          subject,
          html: buildDigestHtml(digestVideos, appUrl, unsubscribeUrl),
          text: buildDigestText(digestVideos, appUrl, unsubscribeUrl),
        });

        if (error) {
          console.error("[send-digest] Resend error for %s:", sub.email, error);
          failedCount++;
        } else {
          sentCount++;
        }
      }),
    );
  }

  await db.newsletterDigest.update({
    where: { id: digest.id },
    data: { sentCount, failedCount },
  });

  return { ok: true, sentCount, failedCount, digestId: digest.id };
}
