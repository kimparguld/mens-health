import { NextResponse, type NextRequest } from "next/server";

// We're aliased on a second domain (mens-healths.com) that serves the exact
// same app. Search engines penalize/waste crawl budget on duplicate domains,
// so we 308-redirect any non-canonical custom domain to the canonical one
// instead of relying solely on <link rel="canonical">. Vercel preview
// deployments (*.vercel.app) and localhost are left alone so previews and
// local dev keep working.
const CANONICAL_HOST = new URL(
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.menhealth-digest.com",
).host;

function isExemptHost(host: string): boolean {
  return (
    host === CANONICAL_HOST ||
    host.endsWith(".vercel.app") ||
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1")
  );
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  if (host && !isExemptHost(host)) {
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
