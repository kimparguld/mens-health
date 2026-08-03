import { db } from '@/lib/db/prisma';
import { CREATOR_SEEDS } from '@/lib/youtube/creators';
import { TOPIC_SEEDS } from '@/lib/youtube/topics';
import { GLOSSARY_TERMS } from '@/lib/seo/glossary';
import { type MetadataRoute } from 'next';

// Serve at request time so the build doesn't need a DB connection.

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menhealth-digest.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let videos: { slug: string; updatedAt: Date; topics: { topic: { slug: string } }[]; channelId: string }[] = [];
  let claims: { slug: string | null; id: string; createdAt: Date }[] = [];
  let newsletterIssues: { slug: string | null; sentAt: Date }[] = [];
  let monthlyReports: { slug: string; periodStart: Date }[] = [];
  let channelIdToYoutubeId = new Map<string, string>();
  try {
    const [videoRows, claimRows, channels, newsletterRows, reportRows] =
      await Promise.all([
        db.video.findMany({
          where: { status: 'PUBLISHED' },
          select: {
            slug: true,
            updatedAt: true,
            channelId: true,
            topics: { select: { topic: { select: { slug: true } } } },
          },
        }),
        db.claim.findMany({
          where: { video: { status: 'PUBLISHED' } },
          select: { slug: true, id: true, createdAt: true },
        }),
        db.channel.findMany({ select: { id: true, youtubeId: true } }),
        db.newsletterDigest.findMany({
          where: { slug: { not: null } },
          select: { slug: true, sentAt: true },
        }),
        db.monthlyReport.findMany({
          select: { slug: true, periodStart: true },
        }),
      ]);
    videos = videoRows;
    claims = claimRows;
    newsletterIssues = newsletterRows;
    monthlyReports = reportRows;
    channelIdToYoutubeId = new Map(channels.map((c) => [c.id, c.youtubeId]));
  } catch {
    // DB unavailable — return static URLs only
  }

  // Most recent video update per topic/creator, used as lastModified for
  // the listing pages that surface those videos.
  const latestUpdateByTopicSlug = new Map<string, Date>();
  const latestUpdateByChannelId = new Map<string, Date>();
  for (const video of videos) {
    for (const { topic } of video.topics) {
      const current = latestUpdateByTopicSlug.get(topic.slug);
      if (!current || video.updatedAt > current) {
        latestUpdateByTopicSlug.set(topic.slug, video.updatedAt);
      }
    }
    const current = latestUpdateByChannelId.get(video.channelId);
    if (!current || video.updatedAt > current) {
      latestUpdateByChannelId.set(video.channelId, video.updatedAt);
    }
  }
  const latestUpdateByYoutubeChannelId = new Map(
    [...latestUpdateByChannelId.entries()].map(([channelId, date]) => [
      channelIdToYoutubeId.get(channelId),
      date,
    ]),
  );

  const videoUrls: MetadataRoute.Sitemap = videos.map((video) => ({
    url: `${BASE_URL}/videos/${video.slug}`,
    lastModified: video.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const topicUrls: MetadataRoute.Sitemap = TOPIC_SEEDS.map((topic) => ({
    url: `${BASE_URL}/topics/${topic.slug}`,
    lastModified: latestUpdateByTopicSlug.get(topic.slug),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const rankingUrls: MetadataRoute.Sitemap = TOPIC_SEEDS.map((topic) => ({
    url: `${BASE_URL}/rankings/${topic.slug}`,
    lastModified: latestUpdateByTopicSlug.get(topic.slug),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const creatorUrls: MetadataRoute.Sitemap = CREATOR_SEEDS.map((creator) => ({
    url: `${BASE_URL}/creators/${creator.slug}`,
    lastModified: latestUpdateByYoutubeChannelId.get(creator.youtubeChannelId),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const claimUrls: MetadataRoute.Sitemap = claims
    .filter((c) => c.slug != null)
    .map((c) => ({
      url: `${BASE_URL}/claims/${c.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

  const newsletterIssueUrls: MetadataRoute.Sitemap = newsletterIssues
    .filter((n) => n.slug != null)
    .map((n) => ({
      url: `${BASE_URL}/newsletter/${n.slug}`,
      lastModified: n.sentAt,
      changeFrequency: 'never' as const,
      priority: 0.4,
    }));

  const monthlyReportUrls: MetadataRoute.Sitemap = monthlyReports.map(
    (report) => ({
      url: `${BASE_URL}/reports/${report.slug}`,
      lastModified: report.periodStart,
      changeFrequency: 'never' as const,
      priority: 0.4,
    }),
  );

  const weeklyUrls: MetadataRoute.Sitemap = TOPIC_SEEDS.map((topic) => ({
    url: `${BASE_URL}/weekly/${topic.slug}`,
    lastModified: latestUpdateByTopicSlug.get(topic.slug),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const glossaryUrls: MetadataRoute.Sitemap = GLOSSARY_TERMS.map((term) => ({
    url: `${BASE_URL}/glossary/${term.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/newsletter`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    { url: `${BASE_URL}/topics`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/glossary`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/faq`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    {
      url: `${BASE_URL}/editorial-process`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/medical-disclaimer`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/how-we-rate-evidence`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/affiliate-disclosure`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  return [
    {
      url: BASE_URL,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...staticUrls,
    ...glossaryUrls,
    ...topicUrls,
    ...weeklyUrls,
    ...rankingUrls,
    ...creatorUrls,
    ...videoUrls,
    ...claimUrls,
    ...newsletterIssueUrls,
    ...monthlyReportUrls,
  ];
}
