import { db } from "@/lib/db/prisma";
import { buildMonthlyReportCsv } from "@/lib/reports/build-csv";
import type { MonthlyReportStats } from "@/lib/reports/generate-monthly-report";

type Params = Promise<{ slug: string }>;

export async function GET(
  _req: Request,
  { params }: { params: Params },
): Promise<Response> {
  const { slug } = await params;

  const report = await db.monthlyReport.findUnique({ where: { slug } });
  if (!report) {
    return new Response("Not found", { status: 404 });
  }

  const stats = report.stats as unknown as MonthlyReportStats;
  const csv = buildMonthlyReportCsv(stats);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="menhealth-digest-report-${slug}.csv"`,
    },
  });
}
