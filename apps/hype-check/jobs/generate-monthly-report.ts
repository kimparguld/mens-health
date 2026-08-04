import { db } from "@/lib/db/prisma";
import {
  computeMonthlyReportStats,
  monthlyReportSlugFor,
} from "@/lib/reports/generate-monthly-report";

/**
 * Generates the report for the most recently completed calendar month,
 * relative to referenceDate. Idempotent — re-running within the same month
 * is a no-op if that month's report already exists.
 */
export async function generateMonthlyReport(
  referenceDate = new Date(),
): Promise<{ slug: string; created: boolean }> {
  const periodStart = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - 1, 1),
  );
  const periodEnd = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  );

  const slug = monthlyReportSlugFor(periodStart);

  const existing = await db.monthlyReport.findUnique({ where: { slug } });
  if (existing) {
    return { slug, created: false };
  }

  const stats = await computeMonthlyReportStats(periodStart, periodEnd);

  await db.monthlyReport.create({
    data: { slug, periodStart, periodEnd, stats },
  });

  return { slug, created: true };
}
