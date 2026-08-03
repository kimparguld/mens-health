"use client";

import { useEffect, useId } from "react";
import { AdDisclosure } from "./AdDisclosure";

/**
 * AdSlot — Google AdSense display ad, disabled unless explicitly configured.
 *
 * Ads are opt-in via `config.enabled` + `config.clientId`. Each placement
 * also needs its own ad unit slot ID (created in the AdSense dashboard) — a
 * slot renders nothing if its ID isn't set, so partially configuring ads
 * never shows a broken/empty unit. The caller resolves `config` from its own
 * env (see apps/menhealth/lib/ads-config.ts) so this component never touches
 * env/process.env directly.
 */
export type AdSlotPlacement = "article-footer" | "sidebar" | "between-content";

export type AdSlotConfig = {
  enabled: boolean;
  clientId: string | undefined;
  slotIds: Record<AdSlotPlacement, string | undefined>;
};

type Props = {
  slot: AdSlotPlacement;
  config: AdSlotConfig;
  className?: string;
};

// Reserves layout space matching the typical rendered ad size per placement,
// so the AdSense script populating asynchronously doesn't shift surrounding content (CLS).
const MIN_HEIGHT_BY_PLACEMENT: Record<AdSlotPlacement, string> = {
  "article-footer": "min-h-[100px]",
  "between-content": "min-h-[250px]",
  sidebar: "min-h-[250px]",
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({ slot, config, className }: Props) {
  const reactId = useId();
  const { enabled, clientId } = config;
  const slotId = config.slotIds[slot];

  useEffect(() => {
    if (!enabled || !clientId || !slotId) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not loaded yet or blocked — fail silently.
    }
  }, [enabled, clientId, slotId]);

  if (!enabled || !clientId || !slotId) return null;

  return (
    <div
      data-ad-slot={slot}
      className={[MIN_HEIGHT_BY_PLACEMENT[slot], className]
        .filter(Boolean)
        .join(" ")}
    >
      <AdDisclosure visible={enabled} />
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
