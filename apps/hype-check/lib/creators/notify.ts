import { db } from "@/lib/db/prisma";
import { resend } from "@/lib/resend/client";
import { env } from "@/env";
import { CREATOR_SEEDS } from "@/lib/youtube/creators";

function evidenceLabel(evidenceScore: number | null): string {
  if (evidenceScore == null) return "Not yet rated";
  if (evidenceScore >= 0.7) return "Strong evidence";
  if (evidenceScore >= 0.4) return "Mixed evidence";
  return "Weak evidence";
}

/**
 * Emails a creator when their video is featured in a published review —
 * but only if we have a verified contact email for them (CreatorSeed.contactEmail)
 * and haven't already notified them for this exact video. Best-effort: a
 * failed send never throws, so it can't block a publish job.
 */
export async function notifyCreatorIfApplicable(videoId: string): Promise<void> {
  const video = await db.video.findUnique({
    where: { id: videoId },
    include: { channel: true },
  });
  if (!video || video.status !== "PUBLISHED") return;

  const seed = CREATOR_SEEDS.find(
    (c) => c.youtubeChannelId === video.channel.youtubeId,
  );
  if (!seed?.contactEmail) return;

  const alreadyNotified = await db.creatorNotification.findUnique({
    where: { videoId: video.id },
  });
  if (alreadyNotified) return;

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const reviewUrl = `${appUrl}/videos/${video.slug}`;
  const fromEmail =
    env.RESEND_FROM_EMAIL ?? `digest@${new URL(appUrl).hostname}`;

  const subject = "Your video was featured on Hype Check";
  const html = `<p>Hi ${seed.name},</p>
<p>We included your video "${video.title}" in a Hype Check review.</p>
<ul>
  <li>Evidence rating: ${evidenceLabel(video.evidenceScore)}</li>
  <li>Risk rating: ${video.riskLevel}</li>
</ul>
<p>You can view the full analysis here: <a href="${reviewUrl}">${reviewUrl}</a></p>
<p>If we misunderstood a claim or missed a source, just reply to this email with a correction — we review and update pages when creators flag something.</p>
<p>— Hype Check</p>`;

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [seed.contactEmail],
      subject,
      html,
    });
    if (error) {
      console.warn(`[notify-creator] Resend error for ${seed.slug}:`, error);
      return;
    }
    await db.creatorNotification.create({
      data: {
        videoId: video.id,
        channelId: video.channelId,
        email: seed.contactEmail,
      },
    });
  } catch (err) {
    console.warn(`[notify-creator] send failed for ${seed.slug}:`, err);
  }
}
