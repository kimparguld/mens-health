import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://menhealthdigest.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "MenHealth Digest — Evidence-Aware Men's Health Summaries",
    template: "%s — MenHealth Digest",
  },
  description:
    "Daily summaries of the most important men's health videos, ranked and fact-checked. Fitness, testosterone, sleep, nutrition, longevity — without the hype.",
  openGraph: {
    siteName: "MenHealth Digest",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@menhealthdigest",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
