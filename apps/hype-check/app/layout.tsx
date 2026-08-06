import { env } from '@/env';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site-brand';
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
} from '@menhealth/core-seo';
import { JsonLd } from '@menhealth/ui';
import { GoogleTagManager } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { Inter, Zilla_Slab } from 'next/font/google';
import Script from 'next/script';
import { Suspense } from 'react';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const zillaSlab = Zilla_Slab({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: '700',
  display: 'swap',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hype-check.net';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Hype Check — Legit, or Just Hype?',
    template: '%s — Hype Check',
  },
  description:
    'Evidence-based verdicts on trending products, courses, side hustles, and investment apps — legit, misleading, overpriced, risky, or scam.',
  alternates: {
    canonical: APP_URL,
    types: {
      'application/rss+xml': `${APP_URL}/feed.xml`,
    },
  },
  openGraph: {
    siteName: 'Hype Check',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
  verification: {
    ...(env.GOOGLE_SITE_VERIFICATION
      ? { google: env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(env.BING_SITE_VERIFICATION
      ? { other: { 'msvalidate.01': env.BING_SITE_VERIFICATION } }
      : {}),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
};

const adsEnabled =
  env.NEXT_PUBLIC_ADS_ENABLED === 'true' && !!env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html
        lang="en"
        className={`${inter.variable} ${zillaSlab.variable} h-full antialiased`}
      >
        <GoogleTagManager gtmId="G-30V2XS27MH" />
        <body className="flex min-h-full flex-col">
          {adsEnabled && (
            <Script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />
          )}
          <JsonLd
            schema={[
              buildWebSiteSchema(APP_URL, SITE_NAME),
              buildOrganizationSchema(APP_URL, SITE_NAME, SITE_DESCRIPTION),
            ]}
          />
          {children}
          <Suspense fallback={null}>
            <Analytics />
            <SpeedInsights />
          </Suspense>
        </body>
      </html>
    </>
  );
}
