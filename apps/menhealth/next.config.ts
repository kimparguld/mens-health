import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inline scripts, YouTube IFrame API, Vercel observability, and Google AdSense
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://va.vercel-scripts.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.googletagservices.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://i.ytimg.com https://assets.example.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net",
      // YouTube embed, Google OAuth, and AdSense ad iframes
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",
      "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://pagead2.googlesyndication.com",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  turbopack: {},
  transpilePackages: ["@menhealth/ui"],
  images: {
    remotePatterns: [
      new URL("https://assets.example.com/account123/**"),
      new URL("https://i.ytimg.com/**"),
    ],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
