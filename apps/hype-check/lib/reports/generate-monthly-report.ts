import { db } from "@/lib/db/prisma";

export type MonthlyReportStats = {
  periodLabel: string;
  videosPublished: number;
  claimsAssessed: number;
  claimVerdictBreakdown: { status: string; count: number; percent: number }[];
  riskLevelBreakdown: { level: string; count: number; percent: number }[];
  topicsByHighRiskShare: {
    topic: string;
    highRiskVideos: number;
    totalVideos: number;
    percent: number;
  }[];
  claimCategoryBreakdown: { category: string; count: number }[];
  creatorsBySourcing: {
    creator: string;
    claimsAssessed: number;
    avgSourcesPerClaim: number;
  }[];
  avgDurationMinutesByEvidenceLabel: {
    label: string;
    avgMinutes: number;
    videoCount: number;
  }[];
};

function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function evidenceLabel(evidenceScore: number | null): string {
  if (evidenceScore == null) return "Not yet rated";
  if (evidenceScore >= 0.7) return "Strong evidence";
  if (evidenceScore >= 0.4) return "Mixed evidence";
  return "Weak evidence";
}

export function periodLabelFor(periodStart: Date): string {
  return periodStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function monthlyReportSlugFor(periodStart: Date): string {
  return `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`;
}

export async function computeMonthlyReportStats(
  periodStart: Date,
  periodEnd: Date,
): Promise<MonthlyReportStats> {
  const videos = await db.subject.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: periodStart, lt: periodEnd },
    },
    include: {
      channel: true,
      topics: { include: { topic: true } },
      claims: { include: { evidenceItems: true } },
    },
  });

  const videosPublished = videos.length;
  const allClaims = videos.flatMap((v) => v.claims);
  const claimsAssessed = allClaims.length;

  // --- Claim verdict breakdown ---
  const verdictCounts = new Map<string, number>();
  for (const claim of allClaims) {
    verdictCounts.set(
      claim.evidenceStatus,
      (verdictCounts.get(claim.evidenceStatus) ?? 0) + 1,
    );
  }
  const claimVerdictBreakdown = [...verdictCounts.entries()]
    .map(([status, count]) => ({
      status,
      count,
      percent: pct(count, claimsAssessed),
    }))
    .sort((a, b) => b.count - a.count);

  // --- Risk level breakdown ---
  const riskCounts = new Map<string, number>();
  for (const video of videos) {
    riskCounts.set(video.riskLevel, (riskCounts.get(video.riskLevel) ?? 0) + 1);
  }
  const riskLevelBreakdown = [...riskCounts.entries()]
    .map(([level, count]) => ({
      level,
      count,
      percent: pct(count, videosPublished),
    }))
    .sort((a, b) => b.count - a.count);

  // --- Topics by high-risk share ---
  const topicTotals = new Map<string, { total: number; highRisk: number }>();
  for (const video of videos) {
    for (const vt of video.topics) {
      const entry = topicTotals.get(vt.topic.name) ?? { total: 0, highRisk: 0 };
      entry.total++;
      if (video.riskLevel === "HIGH") entry.highRisk++;
      topicTotals.set(vt.topic.name, entry);
    }
  }
  const topicsByHighRiskShare = [...topicTotals.entries()]
    .map(([topic, { total, highRisk }]) => ({
      topic,
      highRiskVideos: highRisk,
      totalVideos: total,
      percent: pct(highRisk, total),
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 10);

  // --- Claim category breakdown ---
  const categoryCounts = new Map<string, number>();
  for (const claim of allClaims) {
    categoryCounts.set(
      claim.claimType,
      (categoryCounts.get(claim.claimType) ?? 0) + 1,
    );
  }
  const claimCategoryBreakdown = [...categoryCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // --- Creators by sourcing (avg evidence sources per claim) ---
  const creatorClaimStats = new Map<
    string,
    { claimsAssessed: number; totalSources: number }
  >();
  for (const video of videos) {
    if (video.claims.length === 0 || !video.channel) continue;
    const entry = creatorClaimStats.get(video.channel.title) ?? {
      claimsAssessed: 0,
      totalSources: 0,
    };
    entry.claimsAssessed += video.claims.length;
    entry.totalSources += video.claims.reduce(
      (sum, c) => sum + c.evidenceItems.length,
      0,
    );
    creatorClaimStats.set(video.channel.title, entry);
  }
  const creatorsBySourcing = [...creatorClaimStats.entries()]
    .map(([creator, { claimsAssessed: n, totalSources }]) => ({
      creator,
      claimsAssessed: n,
      avgSourcesPerClaim: n === 0 ? 0 : Math.round((totalSources / n) * 100) / 100,
    }))
    .sort((a, b) => b.avgSourcesPerClaim - a.avgSourcesPerClaim)
    .slice(0, 10);

  // --- Average duration by evidence label ---
  const durationBuckets = new Map<string, { totalMinutes: number; count: number }>();
  for (const video of videos) {
    if (!video.durationSeconds) continue;
    const label = evidenceLabel(video.evidenceScore);
    const entry = durationBuckets.get(label) ?? { totalMinutes: 0, count: 0 };
    entry.totalMinutes += video.durationSeconds / 60;
    entry.count++;
    durationBuckets.set(label, entry);
  }
  const avgDurationMinutesByEvidenceLabel = [...durationBuckets.entries()].map(
    ([label, { totalMinutes, count }]) => ({
      label,
      avgMinutes: count === 0 ? 0 : Math.round((totalMinutes / count) * 10) / 10,
      videoCount: count,
    }),
  );

  return {
    periodLabel: periodLabelFor(periodStart),
    videosPublished,
    claimsAssessed,
    claimVerdictBreakdown,
    riskLevelBreakdown,
    topicsByHighRiskShare,
    claimCategoryBreakdown,
    creatorsBySourcing,
    avgDurationMinutesByEvidenceLabel,
  };
}
