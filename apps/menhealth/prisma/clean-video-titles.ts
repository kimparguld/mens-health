/**
 * One-off script: decode HTML entities and strip leading Markdown heading
 * markers from all existing video titles and slugs in the database.
 *
 * Run with:
 *   npx tsx prisma/clean-video-titles.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function cleanTitle(raw: string): string {
  return raw
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/^#{1,6}\s+/, "")
    .replace(/&#39;/g, "'")
    .trim();
}

function generateSlug(title: string, videoId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${base}-${videoId}`;
}

async function main() {
  const videos = await prisma.video.findMany({
    select: { id: true, title: true, slug: true, youtubeVideoId: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const video of videos) {
    const cleanedTitle = cleanTitle(video.title);
    const cleanedSlug = generateSlug(cleanedTitle, video.youtubeVideoId);

    if (cleanedTitle === video.title && cleanedSlug === video.slug) {
      skipped++;
      continue;
    }

    await prisma.video.update({
      where: { id: video.id },
      data: { title: cleanedTitle, slug: cleanedSlug },
    });

    console.log(`Updated: "${video.title}" → "${cleanedTitle}"`);
    updated++;
  }

  console.log(
    `\nDone. Updated ${updated}, skipped ${skipped} (already clean).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
