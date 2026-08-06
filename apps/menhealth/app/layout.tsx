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
import { EB_Garamond, Inter } from 'next/font/google';
import Script from 'next/script';
import { Suspense } from 'react';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const ebGaramond = EB_Garamond({
  variable: '--font-logotype',
  subsets: ['latin'],
  weight: '600',
  style: 'italic',
  display: 'swap',
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.menhealth-digest.com';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "MenHealth Digest — Evidence-Aware Men's Health Summaries",
    template: '%s — MenHealth Digest',
  },
  description:
    "Daily summaries of the most important men's health videos, ranked and fact-checked. Fitness, testosterone, sleep, nutrition, longevity — without the hype.",
  alternates: {
    canonical: APP_URL,
    types: {
      'application/rss+xml': `${APP_URL}/feed.xml`,
    },
  },
  openGraph: {
    siteName: 'MenHealth Digest',
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
        className={`${inter.variable} ${ebGaramond.variable} h-full antialiased`}
      >
        <GoogleTagManager gtmId="G-T4EKPX0Q0R" />
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
