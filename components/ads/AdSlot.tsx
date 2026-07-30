"use client";

import { useEffect, useId } from "react";
import { env } from "@/env";
import { AdDisclosure } from "./AdDisclosure";

/**
 * AdSlot — Google AdSense display ad, disabled unless explicitly configured.
 *
 * Ads are opt-in via NEXT_PUBLIC_ADS_ENABLED + NEXT_PUBLIC_ADSENSE_CLIENT_ID.
 * Each placement also needs its own ad unit slot ID (created in the AdSense
 * dashboard) — a slot renders nothing if its ID isn't set, so partially
 * configuring ads never shows a broken/empty unit.
 */
type Props = {
  slot: "article-footer" | "sidebar" | "between-content";
  className?: string;
};

const SLOT_ID_BY_PLACEMENT: Record<Props["slot"], string | undefined> = {
  "article-footer": env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_FOOTER,
  "between-content": env.NEXT_PUBLIC_ADSENSE_SLOT_BETWEEN_CONTENT,
  sidebar: env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR,
};

// Reserves layout space matching the typical rendered ad size per placement,
// so the AdSense script populating asynchronously doesn't shift surrounding content (CLS).
const MIN_HEIGHT_BY_PLACEMENT: Record<Props["slot"], string> = {
  "article-footer": "min-h-[100px]",
  "between-content": "min-h-[250px]",
  sidebar: "min-h-[250px]",
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({ slot, className }: Props) {
  const reactId = useId();
  const adsEnabled = env.NEXT_PUBLIC_ADS_ENABLED === "true";
  const clientId = env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = SLOT_ID_BY_PLACEMENT[slot];

  useEffect(() => {
    if (!adsEnabled || !clientId || !slotId) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not loaded yet or blocked — fail silently.
    }
  }, [adsEnabled, clientId, slotId]);

  if (!adsEnabled || !clientId || !slotId) return null;

  return (
    <div
      data-ad-slot={slot}
      className={[MIN_HEIGHT_BY_PLACEMENT[slot], className]
        .filter(Boolean)
        .join(" ")}
    >
      <AdDisclosure />
      <ins
        key={reactId}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
