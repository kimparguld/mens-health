import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js inline scripts, YouTube IFrame API, Vercel observability, and Google AdSense
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://va.vercel-scripts.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.googletagservices.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://i.ytimg.com https://assets.example.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.google-analytics.com https://www.googletagmanager.com https://*.g.doubleclick.net https://*.google.com",
      // Generated social video previews served from Vercel Blob storage
      "media-src 'self' https://*.public.blob.vercel-storage.com",
      // YouTube embed, Google OAuth, and AdSense ad iframes
      'frame-src https://www.youtube.com https://www.youtube-nocookie.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://www.googletagmanager.com',
      "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://pagead2.googlesyndication.com https://www.googletagmanager.com https://*.google.com https://*.google-analytics.com https://*.analytics.google.com https://*.g.doubleclick.net https://pagead2.googlesyndication.com",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
      "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  turbopack: {},
  transpilePackages: ['@menhealth/ui'],
  // ffmpeg-static resolves its binary path via `__dirname` at runtime;
  // bundling it rewrites `__dirname` to a path that doesn't exist on disk
  // (observed as `spawn .../ffmpeg-static/ffmpeg ENOENT` with a `/ROOT/`
  // prefix). Keep it external so Node's native `require` resolves the real
  // installed location instead.
  serverExternalPackages: ['ffmpeg-static'],
  outputFileTracingIncludes: {
    // ffmpeg-static binary and bundled caption font are resolved by
    // filesystem path at runtime, not via the module import graph, so they
    // need to be included in the trace explicitly for this route.
    '/api/social/drafts/\\[id\\]/video': [
      './node_modules/ffmpeg-static/**/*',
      './assets/fonts/**/*',
    ],
  },
  images: {
    remotePatterns: [
      new URL('https://assets.example.com/account123/**'),
      new URL('https://i.ytimg.com/**'),
    ],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
