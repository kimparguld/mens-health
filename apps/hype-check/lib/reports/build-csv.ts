import type { MonthlyReportStats } from "@/lib/reports/generate-monthly-report";

function csvCell(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function section(
  title: string,
  headers: string[],
  rows: (string | number)[][],
): string {
  const lines = [
    `# ${title}`,
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];
  return lines.join("\n");
}

export function buildMonthlyReportCsv(stats: MonthlyReportStats): string {
  const sections = [
    section("Summary", ["metric", "value"], [
      ["Period", stats.periodLabel],
      ["Videos published", stats.videosPublished],
      ["Claims assessed", stats.claimsAssessed],
    ]),
    section(
      "Claim verdict breakdown",
      ["status", "count", "percent"],
      stats.claimVerdictBreakdown.map((r) => [r.status, r.count, r.percent]),
    ),
    section(
      "Risk level breakdown",
      ["level", "count", "percent"],
      stats.riskLevelBreakdown.map((r) => [r.level, r.count, r.percent]),
    ),
    section(
      "Topics by high-risk share",
      ["topic", "high_risk_videos", "total_videos", "percent"],
      stats.topicsByHighRiskShare.map((r) => [
        r.topic,
        r.highRiskVideos,
        r.totalVideos,
        r.percent,
      ]),
    ),
    section(
      "Claim category breakdown",
      ["category", "count"],
      stats.claimCategoryBreakdown.map((r) => [r.category, r.count]),
    ),
    section(
      "Creators by sourcing",
      ["creator", "claims_assessed", "avg_sources_per_claim"],
      stats.creatorsBySourcing.map((r) => [
        r.creator,
        r.claimsAssessed,
        r.avgSourcesPerClaim,
      ]),
    ),
    section(
      "Average duration by evidence label",
      ["label", "avg_minutes", "video_count"],
      stats.avgDurationMinutesByEvidenceLabel.map((r) => [
        r.label,
        r.avgMinutes,
        r.videoCount,
      ]),
    ),
  ];

  return sections.join("\n\n");
}
