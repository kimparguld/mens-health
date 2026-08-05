import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

/**
 * /digest is no longer the canonical newsletter URL.
 * Permanent redirect to /newsletter.
 */
export const metadata: Metadata = {
  title: "Newsletter",
  alternates: { canonical: "/newsletter" },
};

export default function DigestRedirectPage() {
  permanentRedirect("/newsletter");
}
