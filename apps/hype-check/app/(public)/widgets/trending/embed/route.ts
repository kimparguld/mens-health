import { getTrendingWidgetVideos } from "@/lib/widgets/queries";
import { env } from "@/env";

export const revalidate = 300;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic");
  const countParam = parseInt(searchParams.get("count") ?? "5", 10);
  const count = Number.isFinite(countParam) ? countParam : 5;

  const videos = await getTrendingWidgetVideos(topic, count);
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  const itemsHtml = videos
    .map(
      (v) => `
    <a href="${appUrl}/videos/${v.slug}" target="_top" rel="noopener noreferrer" style="display:block;padding:8px 0;border-bottom:1px solid #f3f4f6;text-decoration:none;color:#111827;">
      <div style="font-size:13px;font-weight:600;">${escapeHtml(v.title)}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px;">${escapeHtml(v.channelTitle)} &middot; ${escapeHtml(v.evidenceLabel)} &middot; ${escapeHtml(v.riskLevel)} risk</div>
    </a>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:12px;}</style>
</head>
<body>
  <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;margin-bottom:8px;">Reviewed by Hype Check</div>
  ${itemsHtml || '<p style="font-size:13px;color:#9ca3af;">No videos yet.</p>'}
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
